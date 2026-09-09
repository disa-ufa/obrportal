from __future__ import annotations

import asyncio

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.models.audit_event import AuditEvent
from app.models.learner_profile import LearnerProfile
from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)

from test_account_learner_profile_api import (
    unique_snils,
)
from test_admin_frdo_registry_api import (
    cleanup_frdo_fixtures,
    create_frdo_fixture,
)
from test_admin_mintrud_registry_api import (
    cleanup_mintrud_fixtures,
    create_mintrud_fixture,
    login,
    request_json,
)


MINTRUD_PASSWORD = "MintrudApiTest123!"
FRDO_PASSWORD = "FrdoApiTest123!"

_UNSET = object()


def set_fixture_state(
    fixture: dict,
    *,
    snils=_UNSET,
    birth_date=_UNSET,
    status=_UNSET,
    readiness_errors=_UNSET,
) -> None:
    async def _set() -> None:
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            profile = await session.scalar(
                select(
                    LearnerProfile
                ).where(
                    LearnerProfile.user_id
                    == fixture["user_id"]
                )
            )

            assert profile is not None

            obligation = await session.scalar(
                select(
                    RegistryObligation
                ).where(
                    RegistryObligation.id
                    == fixture["obligation_id"]
                )
            )

            assert obligation is not None

            if snils is not _UNSET:
                profile.snils = snils

            if birth_date is not _UNSET:
                profile.birth_date = birth_date

            if status is not _UNSET:
                obligation.status = status

            if readiness_errors is not _UNSET:
                obligation.readiness_errors = (
                    readiness_errors
                )

            await session.commit()

        await engine.dispose()

    asyncio.run(
        _set()
    )


def read_fixture_state(
    fixture: dict,
) -> dict:
    async def _read() -> dict:
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            profile = await session.scalar(
                select(
                    LearnerProfile
                ).where(
                    LearnerProfile.user_id
                    == fixture["user_id"]
                )
            )

            assert profile is not None

            obligation = await session.scalar(
                select(
                    RegistryObligation
                ).where(
                    RegistryObligation.id
                    == fixture["obligation_id"]
                )
            )

            assert obligation is not None

            attempt_result = (
                await session.execute(
                    select(
                        RegistrySubmissionAttempt.id
                    ).where(
                        RegistrySubmissionAttempt
                        .obligation_id
                        == fixture["obligation_id"]
                    )
                )
            )

            attempt_ids = list(
                attempt_result.scalars().all()
            )

            result = {
                "profile_id": str(
                    profile.id
                ),
                "snils": profile.snils,
                "birth_date": (
                    profile.birth_date.isoformat()
                    if profile.birth_date
                    is not None
                    else None
                ),
                "status": obligation.status,
                "readiness_errors": list(
                    obligation.readiness_errors
                    or []
                ),
                "attempt_count": len(
                    attempt_ids
                ),
            }

        await engine.dispose()

        return result

    return asyncio.run(
        _read()
    )


def cleanup_account_audit(
    fixture: dict,
) -> None:
    async def _cleanup() -> None:
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            await session.execute(
                delete(
                    AuditEvent
                ).where(
                    AuditEvent.actor_user_id
                    == fixture["user_id"],
                    AuditEvent.action.in_(
                        (
                            "account.learner_profile_created",
                            "account.learner_profile_updated",
                        )
                    ),
                )
            )

            await session.commit()

        await engine.dispose()

    asyncio.run(
        _cleanup()
    )


def snils_missing_error() -> list[dict]:
    return [
        {
            "code": (
                "learner_profile.snils_missing"
            ),
            "field": (
                "learner_profile.snils"
            ),
            "message": (
                "Learner SNILS is required "
                "for the Mintrud registry."
            ),
        }
    ]


def birth_date_missing_error() -> list[dict]:
    return [
        {
            "code": (
                "learner_profile.birth_date_missing"
            ),
            "field": (
                "learner_profile.birth_date"
            ),
            "message": (
                "Learner birth date is missing."
            ),
        }
    ]


def test_account_profile_snils_addition_refreshes_mintrud_to_ready() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="pending_data",
    )

    try:
        set_fixture_state(
            fixture,
            snils=None,
            status="pending_data",
            readiness_errors=(
                snils_missing_error()
            ),
        )

        before = read_fixture_state(
            fixture
        )

        assert before["snils"] is None
        assert before["status"] == "pending_data"

        assert {
            item["code"]
            for item
            in before["readiness_errors"]
        } == {
            "learner_profile.snils_missing"
        }

        assert before["attempt_count"] == 0

        token = login(
            fixture["email"],
            MINTRUD_PASSWORD,
        )

        new_snils = unique_snils()

        status_code, profile = request_json(
            "PATCH",
            "/api/v1/account/profile",
            {
                "snils": new_snils,
            },
            token=token,
        )

        assert status_code == 200
        assert profile["snils"] == new_snils

        after = read_fixture_state(
            fixture
        )

        assert after["snils"] == new_snils
        assert after["status"] == "ready"
        assert after["readiness_errors"] == []
        assert after["attempt_count"] == 0

    finally:
        cleanup_account_audit(
            fixture
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )


def test_account_profile_snils_removal_refreshes_mintrud_to_pending_data() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="ready",
    )

    try:
        set_fixture_state(
            fixture,
            status="ready",
            readiness_errors=[],
        )

        before = read_fixture_state(
            fixture
        )

        assert before["snils"] is not None
        assert before["status"] == "ready"
        assert before["readiness_errors"] == []
        assert before["attempt_count"] == 0

        token = login(
            fixture["email"],
            MINTRUD_PASSWORD,
        )

        status_code, profile = request_json(
            "PATCH",
            "/api/v1/account/profile",
            {
                "snils": None,
            },
            token=token,
        )

        assert status_code == 200
        assert profile["snils"] is None

        after = read_fixture_state(
            fixture
        )

        assert after["snils"] is None
        assert after["status"] == "pending_data"

        assert {
            item["code"]
            for item
            in after["readiness_errors"]
        } == {
            "learner_profile.snils_missing"
        }

        assert after["attempt_count"] == 0

    finally:
        cleanup_account_audit(
            fixture
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )


def test_account_profile_change_invalidates_approved_mintrud() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="approved",
    )

    try:
        set_fixture_state(
            fixture,
            status="approved",
            readiness_errors=[],
        )

        before = read_fixture_state(
            fixture
        )

        assert before["status"] == "approved"
        assert before["readiness_errors"] == []
        assert before["attempt_count"] == 0

        token = login(
            fixture["email"],
            MINTRUD_PASSWORD,
        )

        status_code, profile = request_json(
            "PATCH",
            "/api/v1/account/profile",
            {
                "first_name": (
                    "Changed"
                ),
            },
            token=token,
        )

        assert status_code == 200
        assert profile["first_name"] == "Changed"

        after = read_fixture_state(
            fixture
        )

        assert after["status"] == "needs_approval"
        assert after["readiness_errors"] == []
        assert after["attempt_count"] == 0

    finally:
        cleanup_account_audit(
            fixture
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )


def test_account_profile_unrelated_field_does_not_refresh_registry() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="pending_data",
    )

    stale_errors = [
        {
            "code": "test.stale_marker",
            "field": "test.marker",
            "message": "Must remain unchanged.",
        }
    ]

    try:
        set_fixture_state(
            fixture,
            snils=None,
            status="pending_data",
            readiness_errors=stale_errors,
        )

        before = read_fixture_state(
            fixture
        )

        assert before["status"] == "pending_data"
        assert before["readiness_errors"] == stale_errors
        assert before["attempt_count"] == 0

        token = login(
            fixture["email"],
            MINTRUD_PASSWORD,
        )

        status_code, profile = request_json(
            "PATCH",
            "/api/v1/account/profile",
            {
                "phone": (
                    "8 (999) 555-44-33"
                ),
            },
            token=token,
        )

        assert status_code == 200
        assert profile["phone"] == "+79995554433"

        after = read_fixture_state(
            fixture
        )

        assert after["status"] == "pending_data"
        assert after["readiness_errors"] == stale_errors
        assert after["attempt_count"] == 0

    finally:
        cleanup_account_audit(
            fixture
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )


def test_account_profile_birth_date_addition_refreshes_frdo_to_ready() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
        obligation_status="pending_data",
    )

    try:
        set_fixture_state(
            fixture,
            birth_date=None,
            status="pending_data",
            readiness_errors=(
                birth_date_missing_error()
            ),
        )

        before = read_fixture_state(
            fixture
        )

        assert before["birth_date"] is None
        assert before["status"] == "pending_data"

        assert {
            item["code"]
            for item
            in before["readiness_errors"]
        } == {
            "learner_profile.birth_date_missing"
        }

        assert before["attempt_count"] == 0

        token = login(
            fixture["email"],
            FRDO_PASSWORD,
        )

        status_code, profile = request_json(
            "PATCH",
            "/api/v1/account/profile",
            {
                "birth_date": (
                    "1990-01-02"
                ),
            },
            token=token,
        )

        assert status_code == 200
        assert (
            profile["birth_date"]
            == "1990-01-02"
        )

        after = read_fixture_state(
            fixture
        )

        assert (
            after["birth_date"]
            == "1990-01-02"
        )

        assert after["status"] == "ready"
        assert after["readiness_errors"] == []
        assert after["attempt_count"] == 0

    finally:
        cleanup_account_audit(
            fixture
        )

        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )
