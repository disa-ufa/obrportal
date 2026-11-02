"""FRDO-only legacy attempt veto, even with the legacy switch off.

Must run on the disposable pg_applicability_db database.
No real application databases may be used.
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from app.models.registry_applicability import (
    RegistryApplicabilityEvent,
    RegistryApplicabilityRecord,
)
from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)
from app.services import compliance_registry_attempts as attempt_service
from app.services.registry_applicability_writer import (
    persist_registry_applicability,
)
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
    create_registry_submission_attempt,
)

from test_registry_applicability_writer_pg import (
    _create_enrollment,
    _evaluation,
    pg_applicability_db,
)


@pytest.mark.parametrize("decision", ["not_required", "needs_review"])
def test_frdo_attempt_veto_when_legacy_flag_disabled(
    pg_applicability_db, decision
):
    async def scenario():
        engine = create_async_engine(
            pg_applicability_db,
            connect_args={
                "server_settings": {
                    "statement_timeout": "12000",
                }
            },
        )
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        pending = asyncio.Event()
        release = asyncio.Event()
        writer = None
        attempt = None

        try:
            enrollment_id, actor_id = await _create_enrollment(maker)

            async with maker.begin() as session:
                obligation = RegistryObligation(
                    registry="frdo",
                    enrollment_id=enrollment_id,
                    status="pending_data",
                    readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()
                obligation_id = obligation.id

            async def write_decision():
                async with maker.begin() as session:
                    record, changed = await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=_evaluation(decision),
                    )
                    assert changed
                    assert record.decision == decision
                    pending.set()
                    await asyncio.wait_for(release.wait(), 8)

            async def create_attempt():
                try:
                    async with maker.begin() as session:
                        await create_registry_submission_attempt(
                            session,
                            obligation_id=obligation_id,
                            snapshot={"isolated_test": True},
                            generated_by_user_id=None,
                        )
                    return "CREATED"
                except RegistrySubmissionAttemptError as exc:
                    return str(exc)

            # Override only this service's settings in the test
            # process. The real configuration and source are untouched.
            disabled = SimpleNamespace(
                registry_attempt_applicability_veto_enabled=False,
            )

            with patch.object(attempt_service, "settings", disabled):
                writer = asyncio.create_task(write_decision())
                await asyncio.wait_for(pending.wait(), timeout=8)

                attempt = asyncio.create_task(create_attempt())

                try:
                    # Must block on the same obligation row while the
                    # decision transaction holds its FOR UPDATE lock.
                    with pytest.raises(asyncio.TimeoutError):
                        await asyncio.wait_for(
                            asyncio.shield(attempt),
                            timeout=0.25,
                        )
                finally:
                    release.set()

                await asyncio.wait_for(writer, timeout=8)
                result = await asyncio.wait_for(attempt, timeout=8)

            assert result == "registry.applicability_" + decision

            async with maker() as session:
                attempts = await session.scalar(
                    select(func.count(RegistrySubmissionAttempt.id))
                    .where(
                        RegistrySubmissionAttempt.obligation_id
                        == obligation_id
                    )
                )

                record = await session.scalar(
                    select(RegistryApplicabilityRecord).where(
                        RegistryApplicabilityRecord.enrollment_id
                        == enrollment_id,
                        RegistryApplicabilityRecord.registry == "frdo",
                    )
                )

                audit_count = await session.scalar(
                    select(func.count(RegistryApplicabilityEvent.id))
                    .where(
                        RegistryApplicabilityEvent.enrollment_id
                        == enrollment_id,
                        RegistryApplicabilityEvent.registry == "frdo",
                    )
                )

                assert attempts == 0
                assert record is not None
                assert record.decision == decision
                assert record.decision_version == 1
                assert audit_count == 1

        finally:
            release.set()
            for task in (writer, attempt):
                if task is not None and not task.done():
                    task.cancel()
                    await asyncio.gather(
                        task, return_exceptions=True
                    )
            await engine.dispose()

    asyncio.run(scenario())