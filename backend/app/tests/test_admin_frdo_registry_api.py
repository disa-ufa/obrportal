from __future__ import annotations

import asyncio
import json
import os
from datetime import date, datetime, timezone
from urllib.error import HTTPError
from urllib.request import Request, urlopen
from uuid import uuid4

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.audit_event import AuditEvent
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)
from app.models.user import User


BASE_URL = os.getenv(
    "TEST_BASE_URL",
    "http://localhost:8000",
)

ADMIN_EMAIL = os.getenv(
    "TEST_ADMIN_EMAIL",
    "admin@obrportal.local",
)

ADMIN_PASSWORD = os.getenv(
    "TEST_ADMIN_PASSWORD",
    "Admin123Local2026!",
)

LEARNER_EMAIL = os.getenv(
    "TEST_LEARNER_EMAIL",
    "learner@obrportal.local",
)

LEARNER_PASSWORD = os.getenv(
    "TEST_LEARNER_PASSWORD",
    "Learner123Local2026!",
)


def request_json(
    method: str,
    path: str,
    payload=None,
    *,
    token: str | None = None,
):
    body = None
    headers = {
        "Accept": "application/json",
    }

    if payload is not None:
        body = json.dumps(
            payload
        ).encode("utf-8")

        headers[
            "Content-Type"
        ] = "application/json"

    if token:
        headers[
            "Authorization"
        ] = "Bearer " + token

    request = Request(
        BASE_URL + path,
        data=body,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(
            request,
            timeout=20,
        ) as response:
            raw = response.read()

            return (
                response.status,
                json.loads(
                    raw.decode("utf-8")
                )
                if raw
                else None,
            )

    except HTTPError as exc:
        raw = exc.read()

        return (
            exc.code,
            json.loads(
                raw.decode("utf-8")
            )
            if raw
            else None,
        )


def login(
    email: str,
    password: str,
) -> str:
    status_code, payload = (
        request_json(
            "POST",
            "/api/v1/auth/login",
            {
                "email": email,
                "password": password,
            },
        )
    )

    assert status_code == 200
    assert isinstance(
        payload,
        dict,
    )

    return payload["access_token"]


def create_frdo_fixture(
    *,
    with_profile: bool,
    obligation_status: str = "pending_data",
) -> dict:
    async def _create():
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

        suffix = uuid4().hex

        async with session_factory() as session:
            user = User(
                email=(
                    "frdo-api-"
                    + suffix
                    + "@example.test"
                ),
                phone=None,
                full_name=(
                    "?????? ???? ????????"
                ),
                hashed_password=(
                    get_password_hash(
                        "FrdoApiTest123!"
                    )
                ),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )

            course = Course(
                slug=(
                    "frdo-api-"
                    + suffix
                ),
                title=(
                    "FRDO API Test "
                    + suffix[:8]
                ),
                hours=72,
                document_type=(
                    "?????????????"
                ),
                regulatory_program_type=(
                    "dpo_advanced_training"
                ),
                frdo_requirement_mode=(
                    "required"
                ),
                mintrud_requirement_mode=(
                    "not_required"
                ),
                is_public=False,
                is_active=True,
            )

            session.add_all(
                [
                    user,
                    course,
                ]
            )

            await session.flush()

            if with_profile:
                profile = LearnerProfile(
                    user_id=str(user.id),
                    last_name="??????",
                    first_name="????",
                    middle_name="????????",
                    birth_date=date(
                        1990,
                        1,
                        2,
                    ),
                    sex="male",
                    citizenship_country_code=(
                        "643"
                    ),
                    source="test",
                )

                session.add(
                    profile
                )

            now = datetime.now(
                timezone.utc
            )

            enrollment = Enrollment(
                user_id=str(user.id),
                course_id=str(course.id),
                status="completed",
                started_at=now,
                completed_at=now,
            )

            session.add(
                enrollment
            )

            await session.flush()

            document = DocumentRecord(
                user_id=str(user.id),
                course_id=str(course.id),
                enrollment_id=str(
                    enrollment.id
                ),
                document_number=(
                    "FRDO-API-"
                    + suffix
                ),
                document_type=(
                    "?????????????"
                ),
                title=(
                    "FRDO API test document"
                ),
                status="draft",
                storage_path=(
                    "documents/"
                    + suffix
                    + ".pdf"
                ),
            )

            session.add(
                document
            )

            await session.flush()

            obligation = (
                RegistryObligation(
                    registry="frdo",
                    enrollment_id=str(
                        enrollment.id
                    ),
                    document_id=str(
                        document.id
                    ),
                    status=(
                        obligation_status
                    ),
                    rule_code=(
                        "test.frdo.api"
                    ),
                    rule_version="test-v1",
                    requirement_reason=(
                        "Permanent API test"
                    ),
                    readiness_errors=[],
                )
            )

            session.add(
                obligation
            )

            await session.commit()

            result = {
                "obligation_id": str(
                    obligation.id
                ),
                "document_id": str(
                    document.id
                ),
                "enrollment_id": str(
                    enrollment.id
                ),
                "course_id": str(
                    course.id
                ),
                "user_id": str(
                    user.id
                ),
                "email": user.email,
            }

        await engine.dispose()

        return result

    return asyncio.run(
        _create()
    )


def cleanup_frdo_fixtures(
    fixtures: list[dict],
) -> None:
    async def _cleanup():
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
            for fixture in fixtures:
                await session.execute(
                    delete(
                        AuditEvent
                    ).where(
                        AuditEvent.entity_type
                        == "registry_obligation",
                        AuditEvent.entity_id
                        == fixture[
                            "obligation_id"
                        ],
                    )
                )

                await session.execute(
                    delete(
                        RegistryObligation
                    ).where(
                        RegistryObligation.id
                        == fixture[
                            "obligation_id"
                        ]
                    )
                )

                await session.execute(
                    delete(
                        DocumentRecord
                    ).where(
                        DocumentRecord.id
                        == fixture[
                            "document_id"
                        ]
                    )
                )

                await session.execute(
                    delete(
                        Enrollment
                    ).where(
                        Enrollment.id
                        == fixture[
                            "enrollment_id"
                        ]
                    )
                )

                await session.execute(
                    delete(
                        LearnerProfile
                    ).where(
                        LearnerProfile.user_id
                        == fixture[
                            "user_id"
                        ]
                    )
                )

                await session.execute(
                    delete(
                        Course
                    ).where(
                        Course.id
                        == fixture[
                            "course_id"
                        ]
                    )
                )

                await session.execute(
                    delete(
                        User
                    ).where(
                        User.id
                        == fixture[
                            "user_id"
                        ]
                    )
                )

            await session.commit()

        await engine.dispose()

    asyncio.run(
        _cleanup()
    )


def test_frdo_admin_list_validate_and_permissions() -> None:
    complete = create_frdo_fixture(
        with_profile=True,
    )

    incomplete = create_frdo_fixture(
        with_profile=False,
    )

    approved = create_frdo_fixture(
        with_profile=True,
        obligation_status="approved",
    )

    fixtures = [
        complete,
        incomplete,
        approved,
    ]

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        learner_token = login(
            LEARNER_EMAIL,
            LEARNER_PASSWORD,
        )

        status_code, items = (
            request_json(
                "GET",
                "/api/v1/admin/"
                "frdo/obligations"
                "?limit=300",
                token=admin_token,
            )
        )

        assert status_code == 200
        assert isinstance(
            items,
            list,
        )

        ids = {
            item["id"]
            for item in items
        }

        assert complete[
            "obligation_id"
        ] in ids

        assert incomplete[
            "obligation_id"
        ] in ids

        assert approved[
            "obligation_id"
        ] in ids

        assert all(
            item["registry"] == "frdo"
            for item in items
        )

        status_code, filtered = (
            request_json(
                "GET",
                (
                    "/api/v1/admin/"
                    "frdo/obligations"
                    "?q="
                    + complete["email"]
                ),
                token=admin_token,
            )
        )

        assert status_code == 200

        assert any(
            item["id"]
            == complete[
                "obligation_id"
            ]
            for item in filtered
        )

        status_code, forbidden = (
            request_json(
                "GET",
                "/api/v1/admin/"
                "frdo/obligations",
                token=learner_token,
            )
        )

        assert status_code == 403
        assert isinstance(
            forbidden,
            dict,
        )

        status_code, validated = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    + complete[
                        "obligation_id"
                    ]
                    + "/validate"
                ),
                token=admin_token,
            )
        )

        assert status_code == 200
        assert validated[
            "is_ready"
        ] is True

        assert validated[
            "issues"
        ] == []

        assert (
            validated[
                "obligation"
            ]["status"]
            == "ready"
        )

        assert (
            validated[
                "obligation"
            ]["readiness_errors"]
            == []
        )

        status_code, incomplete_result = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    + incomplete[
                        "obligation_id"
                    ]
                    + "/validate"
                ),
                token=admin_token,
            )
        )

        assert status_code == 200
        assert (
            incomplete_result[
                "is_ready"
            ]
            is False
        )

        assert (
            incomplete_result[
                "obligation"
            ]["status"]
            == "pending_data"
        )

        error_codes = {
            item["code"]
            for item
            in incomplete_result[
                "issues"
            ]
        }

        assert (
            "learner_profile.missing"
            in error_codes
        )

        persisted_error_codes = {
            item["code"]
            for item
            in incomplete_result[
                "obligation"
            ]["readiness_errors"]
        }

        assert (
            "learner_profile.missing"
            in persisted_error_codes
        )

        status_code, forbidden_validate = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    + complete[
                        "obligation_id"
                    ]
                    + "/validate"
                ),
                token=learner_token,
            )
        )

        assert status_code == 403
        assert isinstance(
            forbidden_validate,
            dict,
        )

        status_code, lifecycle_guard = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    + approved[
                        "obligation_id"
                    ]
                    + "/validate"
                ),
                token=admin_token,
            )
        )

        assert status_code == 409
        assert isinstance(
            lifecycle_guard,
            dict,
        )

        status_code, missing = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    "00000000-0000-0000-"
                    "0000-000000000000/"
                    "validate"
                ),
                token=admin_token,
            )
        )

        assert status_code == 404
        assert isinstance(
            missing,
            dict,
        )

        status_code, invalid_filter = (
            request_json(
                "GET",
                (
                    "/api/v1/admin/"
                    "frdo/obligations"
                    "?status=unknown"
                ),
                token=admin_token,
            )
        )

        assert status_code == 422
        assert isinstance(
            invalid_filter,
            dict,
        )

    finally:
        cleanup_frdo_fixtures(
            fixtures
        )

def get_frdo_audit_actions(
    obligation_id: str,
) -> list[str]:
    async def _read():
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
            result = await session.execute(
                select(
                    AuditEvent.action
                ).where(
                    AuditEvent.entity_type
                    == "registry_obligation",
                    AuditEvent.entity_id
                    == obligation_id,
                )
            )

            actions = list(
                result.scalars().all()
            )

        await engine.dispose()

        return actions

    return asyncio.run(
        _read()
    )


def test_frdo_admin_approval_state_machine() -> None:
    needs_approval = create_frdo_fixture(
        with_profile=True,
        obligation_status="needs_approval",
    )

    ready = create_frdo_fixture(
        with_profile=True,
        obligation_status="ready",
    )

    incomplete = create_frdo_fixture(
        with_profile=False,
        obligation_status="needs_approval",
    )

    already_approved = create_frdo_fixture(
        with_profile=True,
        obligation_status="approved",
    )

    fixtures = [
        needs_approval,
        ready,
        incomplete,
        already_approved,
    ]

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        learner_token = login(
            LEARNER_EMAIL,
            LEARNER_PASSWORD,
        )

        approve_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + needs_approval[
                "obligation_id"
            ]
            + "/approve"
        )

        status_code, approved = (
            request_json(
                "POST",
                approve_path,
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            approved["status"]
            == "approved"
        )

        assert (
            approved[
                "approved_by_user_id"
            ]
            is not None
        )

        assert (
            approved[
                "approved_at"
            ]
            is not None
        )

        assert (
            approved[
                "readiness_errors"
            ]
            == []
        )

        actions = (
            get_frdo_audit_actions(
                needs_approval[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.frdo_obligation_approved"
            in actions
        )

        ready_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + ready[
                "obligation_id"
            ]
            + "/approve"
        )

        status_code, ready_approved = (
            request_json(
                "POST",
                ready_path,
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            ready_approved[
                "status"
            ]
            == "approved"
        )

        incomplete_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + incomplete[
                "obligation_id"
            ]
            + "/approve"
        )

        status_code, not_ready = (
            request_json(
                "POST",
                incomplete_path,
                token=admin_token,
            )
        )

        assert status_code == 409
        assert isinstance(
            not_ready,
            dict,
        )

        status_code, forbidden = (
            request_json(
                "POST",
                incomplete_path,
                token=learner_token,
            )
        )

        assert status_code == 403
        assert isinstance(
            forbidden,
            dict,
        )

        approved_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + already_approved[
                "obligation_id"
            ]
            + "/approve"
        )

        status_code, lifecycle_guard = (
            request_json(
                "POST",
                approved_path,
                token=admin_token,
            )
        )

        assert status_code == 409
        assert isinstance(
            lifecycle_guard,
            dict,
        )

        missing_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            "00000000-0000-0000-"
            "0000-000000000000/"
            "approve"
        )

        status_code, missing = (
            request_json(
                "POST",
                missing_path,
                token=admin_token,
            )
        )

        assert status_code == 404
        assert isinstance(
            missing,
            dict,
        )

    finally:
        cleanup_frdo_fixtures(
            fixtures
        )

def create_frdo_attempt_history(
    fixture: dict,
) -> list[str]:
    async def _create():
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
            now = datetime.now(
                timezone.utc
            )

            first = (
                RegistrySubmissionAttempt(
                    obligation_id=fixture[
                        "obligation_id"
                    ],
                    attempt_no=1,
                    transport="file",
                    schema_version=None,
                    snapshot_json={
                        "registry": "frdo",
                        "version": 1,
                    },
                    artifact_path=None,
                    artifact_sha256=None,
                    generated_by_user_id=fixture[
                        "user_id"
                    ],
                    generated_at=now,
                    errors_json=[],
                )
            )

            second = (
                RegistrySubmissionAttempt(
                    obligation_id=fixture[
                        "obligation_id"
                    ],
                    attempt_no=2,
                    transport="file",
                    schema_version="test-v2",
                    snapshot_json={
                        "registry": "frdo",
                        "version": 2,
                    },
                    artifact_path=(
                        "generated/registry/"
                        + fixture[
                            "obligation_id"
                        ]
                        + "/fixture.xml"
                    ),
                    artifact_sha256=(
                        "a" * 64
                    ),
                    generated_by_user_id=fixture[
                        "user_id"
                    ],
                    generated_at=now,
                    errors_json=[],
                )
            )

            session.add_all(
                [
                    first,
                    second,
                ]
            )

            await session.commit()

            result = [
                str(
                    first.id
                ),
                str(
                    second.id
                ),
            ]

        await engine.dispose()

        return result

    return asyncio.run(
        _create()
    )


def test_frdo_admin_submission_attempt_history() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
        obligation_status="approved",
    )

    try:
        attempt_ids = (
            create_frdo_attempt_history(
                fixture
            )
        )

        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        learner_token = login(
            LEARNER_EMAIL,
            LEARNER_PASSWORD,
        )

        path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts"
        )

        status_code, payload = (
            request_json(
                "GET",
                path,
                token=admin_token,
            )
        )

        assert status_code == 200

        assert isinstance(
            payload,
            list,
        )

        assert len(
            payload
        ) == 2

        assert (
            payload[0][
                "id"
            ]
            == attempt_ids[1]
        )

        assert (
            payload[0][
                "attempt_no"
            ]
            == 2
        )

        assert (
            payload[0][
                "schema_version"
            ]
            == "test-v2"
        )

        assert (
            payload[0][
                "snapshot_json"
            ][
                "version"
            ]
            == 2
        )

        assert (
            payload[0][
                "has_artifact"
            ]
            is True
        )

        assert (
            payload[0][
                "artifact_sha256"
            ]
            == "a" * 64
        )

        assert (
            "artifact_path"
            not in payload[0]
        )

        assert (
            payload[1][
                "id"
            ]
            == attempt_ids[0]
        )

        assert (
            payload[1][
                "attempt_no"
            ]
            == 1
        )

        assert (
            payload[1][
                "has_artifact"
            ]
            is False
        )

        status_code, forbidden = (
            request_json(
                "GET",
                path,
                token=learner_token,
            )
        )

        assert status_code == 403

        assert isinstance(
            forbidden,
            dict,
        )

        missing_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            "00000000-0000-0000-"
            "0000-000000000000/"
            "attempts"
        )

        status_code, missing = (
            request_json(
                "GET",
                missing_path,
                token=admin_token,
            )
        )

        assert status_code == 404

        assert isinstance(
            missing,
            dict,
        )

    finally:
        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )

def prepare_frdo_exported_attempt(
    fixture: dict,
) -> tuple[str, str]:
    async def _prepare():
        from hashlib import sha256

        from app.services.document_storage import (
            write_private_storage_file,
        )

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

        content = (
            b"frdo-manual-submission-test"
        )

        async with session_factory() as session:
            attempt = RegistrySubmissionAttempt(
                obligation_id=fixture[
                    "obligation_id"
                ],
                attempt_no=1,
                transport="file",
                schema_version=None,
                snapshot_json={
                    "registry": "frdo",
                    "manual": True,
                },
                generated_by_user_id=fixture[
                    "user_id"
                ],
                generated_at=datetime.now(
                    timezone.utc
                ),
                errors_json=[],
            )

            session.add(attempt)

            await session.flush()

            storage_path = (
                "generated/registry/"
                + fixture[
                    "obligation_id"
                ]
                + "/api-"
                + str(attempt.id)
                + ".xml"
            )

            write_private_storage_file(
                storage_path,
                content,
            )

            attempt.artifact_path = (
                storage_path
            )

            attempt.artifact_sha256 = (
                sha256(
                    content
                ).hexdigest()
            )

            obligation = (
                await session.scalar(
                    select(
                        RegistryObligation
                    ).where(
                        RegistryObligation.id
                        == fixture[
                            "obligation_id"
                        ]
                    )
                )
            )

            assert obligation is not None

            obligation.status = (
                "exported"
            )

            await session.commit()

            result = (
                str(attempt.id),
                storage_path,
            )

        await engine.dispose()

        return result

    return asyncio.run(
        _prepare()
    )


def delete_frdo_test_artifact(
    storage_path: str | None,
) -> None:
    if not storage_path:
        return

    from app.services.document_storage import (
        delete_private_storage_file,
    )

    delete_private_storage_file(
        storage_path
    )


def test_frdo_admin_manual_submission_reconciliation() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
        obligation_status="approved",
    )

    artifact_path = None

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_frdo_exported_attempt(
            fixture
        )

        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        learner_token = login(
            LEARNER_EMAIL,
            LEARNER_PASSWORD,
        )

        base_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts/"
            + attempt_id
        )

        status_code, submitted = (
            request_json(
                "POST",
                base_path
                + "/submitted",
                {
                    "external_reference": (
                        "  FRDO-PACKAGE-42  "
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            submitted[
                "status"
            ]
            == "submitted"
        )

        assert (
            submitted[
                "submitted_at"
            ]
            is not None
        )

        attempts_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts"
        )

        status_code, attempts = (
            request_json(
                "GET",
                attempts_path,
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            attempts[0][
                "external_reference"
            ]
            == "FRDO-PACKAGE-42"
        )

        assert (
            attempts[0][
                "submitted_at"
            ]
            is not None
        )

        status_code, duplicate = (
            request_json(
                "POST",
                base_path
                + "/submitted",
                {},
                token=admin_token,
            )
        )

        assert status_code == 409
        assert isinstance(
            duplicate,
            dict,
        )

        status_code, accepted = (
            request_json(
                "POST",
                base_path
                + "/result",
                {
                    "result_status": (
                        "accepted"
                    ),
                    "external_id": (
                        "  FRDO-REG-777  "
                    ),
                    "errors": [],
                },
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            accepted[
                "status"
            ]
            == "accepted"
        )

        assert (
            accepted[
                "accepted_at"
            ]
            is not None
        )

        assert (
            accepted[
                "external_id"
            ]
            == "FRDO-REG-777"
        )

        status_code, attempts = (
            request_json(
                "GET",
                attempts_path,
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            attempts[0][
                "result_status"
            ]
            == "accepted"
        )

        status_code, forbidden = (
            request_json(
                "POST",
                base_path
                + "/result",
                {
                    "result_status": (
                        "rejected"
                    ),
                },
                token=learner_token,
            )
        )

        assert status_code == 403

        missing_attempt_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts/"
            "00000000-0000-0000-"
            "0000-000000000000/"
            "submitted"
        )

        status_code, missing = (
            request_json(
                "POST",
                missing_attempt_path,
                {},
                token=admin_token,
            )
        )

        assert status_code == 404

        actions = (
            get_frdo_audit_actions(
                fixture[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.frdo_registry_"
            "submission_recorded"
            in actions
        )

        assert (
            "admin.frdo_registry_submission_"
            "result_recorded"
            in actions
        )

    finally:
        delete_frdo_test_artifact(
            artifact_path
        )

        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )
