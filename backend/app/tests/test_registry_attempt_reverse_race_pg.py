"""Reverse attempt/decision race and legacy Mintrud compatibility.

Only for a disposable PostgreSQL database.
No HTTP routes, external exports, or production calls.
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

from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)
from app.models.registry_applicability import (
    RegistryApplicabilityRecord,
    RegistryApplicabilityEvent,
)
from app.services.registry_applicability import (
    RegistryApplicability,
)
from app.services.registry_applicability_writer import (
    ApplicabilityWriteConflict,
    persist_registry_applicability,
)
from app.services import compliance_registry_attempts as attempts
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
    create_registry_submission_attempt,
)
from app.services.registry_applicability_db_inputs import (
    load_current_registry_applicability_inputs,
)
from app.services.frdo_manual_applicability_transaction import (
    persist_manual_frdo_review_decision,
)

from test_registry_applicability_writer_pg import (
    _create_enrollment,
    _evaluation,
    pg_applicability_db,
)


async def seed(maker, registry):
    enrollment_id, actor_id = await _create_enrollment(maker)

    async with maker.begin() as session:
        obligation = RegistryObligation(
            registry=registry,
            enrollment_id=enrollment_id,
            status="pending_data",
            readiness_errors=[],
        )
        session.add(obligation)
        await session.flush()
        obligation_id = obligation.id

    return enrollment_id, actor_id, obligation_id


async def attempt_once(maker, obligation_id):
    async with maker.begin() as session:
        return await create_registry_submission_attempt(
            session,
            obligation_id=obligation_id,
            snapshot={"isolated_regression": True},
            generated_by_user_id=None,
        )


@pytest.mark.parametrize(
    "decision",
    ["not_required", "needs_review"],
)
def test_mintrud_legacy_flag_behavior_preserved(
    pg_applicability_db, decision
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, _, obligation_id = await seed(
                maker, "mintrud"
            )

            evaluation = RegistryApplicability(
                registry="mintrud",
                status=decision,
                rule_code="mintrud.auto.manual_review",
                rule_version="m327h4",
                reason="Isolated Mintrud legacy compatibility test",
            )

            async with maker.begin() as session:
                _, changed = await persist_registry_applicability(
                    session=session,
                    enrollment_id=enrollment_id,
                    evaluation=evaluation,
                    input_fingerprint="a" * 64,
                )
                assert changed

            # Old switch OFF: Mintrud legacy behavior unchanged.
            with patch.object(
                attempts,
                "settings",
                SimpleNamespace(
                    registry_attempt_applicability_veto_enabled=False
                ),
            ):
                await attempt_once(maker, obligation_id)

            # Old switch ON: same prior negative-decision veto.
            with patch.object(
                attempts,
                "settings",
                SimpleNamespace(
                    registry_attempt_applicability_veto_enabled=True
                ),
            ):
                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match="registry.applicability_" + decision,
                ):
                    await attempt_once(maker, obligation_id)

            async with maker() as session:
                count = await session.scalar(
                    select(func.count(RegistrySubmissionAttempt.id))
                    .where(
                        RegistrySubmissionAttempt.obligation_id
                        == obligation_id
                    )
                )
                assert count == 1

        finally:
            await engine.dispose()

    asyncio.run(scenario())


@pytest.mark.parametrize(
    "decision",
    [None, "required"],
)
def test_frdo_legacy_positive_or_missing_is_not_full_grant(
    pg_applicability_db, decision
):
    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            enrollment_id, _, obligation_id = await seed(
                maker, "frdo"
            )

            if decision == "required":
                async with maker.begin() as session:
                    _, changed = await persist_registry_applicability(
                        session=session,
                        enrollment_id=enrollment_id,
                        evaluation=_evaluation("required"),
                        input_fingerprint="a" * 64,
                    )
                    assert changed

            # Document the remaining legacy behavior explicitly.
            # This does NOT authorize production export.
            with patch.object(
                attempts,
                "settings",
                SimpleNamespace(
                    registry_attempt_applicability_veto_enabled=False
                ),
            ):
                await attempt_once(maker, obligation_id)

            async with maker() as session:
                count = await session.scalar(
                    select(func.count(RegistrySubmissionAttempt.id))
                    .where(
                        RegistrySubmissionAttempt.obligation_id
                        == obligation_id
                    )
                )
                assert count == 1

        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_existing_attempt_blocks_later_manual_frdo_decision(
    pg_applicability_db,
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

        manual_task = None

        try:
            enrollment_id, actor_id, obligation_id = await seed(
                maker, "frdo"
            )

            async with maker() as session:
                obligation = await session.get(
                    RegistryObligation, obligation_id
                )
                snapshot = await load_current_registry_applicability_inputs(
                    session=session,
                    obligation=obligation,
                )

            assert snapshot.evaluation.status == "needs_review"

            async def manual_decision():
                async with maker.begin() as session:
                    return await persist_manual_frdo_review_decision(
                        session=session,
                        obligation_id=obligation_id,
                        decision="not_required",
                        reason="Reviewed applicability after attempt creation",
                        actor_user_id=actor_id,
                        expected_version=0,
                        expected_input_fingerprint=snapshot.fingerprint,
                    )

            # The legacy attempt acquires the obligation row lock first.
            with patch.object(
                attempts,
                "settings",
                SimpleNamespace(
                    registry_attempt_applicability_veto_enabled=False
                ),
            ):
                async with maker.begin() as attempt_session:
                    await create_registry_submission_attempt(
                        attempt_session,
                        obligation_id=obligation_id,
                        snapshot={"existing_attempt": True},
                        generated_by_user_id=None,
                    )

                    manual_task = asyncio.create_task(
                        manual_decision()
                    )

                    await asyncio.sleep(0.3)

                    assert not manual_task.done(), (
                        "Manual decision bypassed active attempt lock"
                    )

            # Attempt transaction committed. The manual writer
            # must reject the now-protected obligation.
            with pytest.raises(ApplicabilityWriteConflict):
                await asyncio.wait_for(
                    manual_task, timeout=12
                )

            async with maker() as session:
                attempts_count = await session.scalar(
                    select(func.count(RegistrySubmissionAttempt.id))
                    .where(
                        RegistrySubmissionAttempt.obligation_id
                        == obligation_id
                    )
                )

                decision_count = await session.scalar(
                    select(func.count(RegistryApplicabilityRecord.id))
                    .where(
                        RegistryApplicabilityRecord.enrollment_id
                        == enrollment_id,
                        RegistryApplicabilityRecord.registry
                        == "frdo",
                    )
                )

                audit_count = await session.scalar(
                    select(func.count(RegistryApplicabilityEvent.id))
                    .where(
                        RegistryApplicabilityEvent.enrollment_id
                        == enrollment_id,
                        RegistryApplicabilityEvent.registry
                        == "frdo",
                    )
                )

                assert attempts_count == 1
                assert decision_count == 0
                assert audit_count == 0

        finally:
            if manual_task is not None and not manual_task.done():
                manual_task.cancel()
                await asyncio.gather(
                    manual_task, return_exceptions=True
                )
            await engine.dispose()

    asyncio.run(scenario())