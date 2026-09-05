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
from app.models.mintrud_registry_context import (
    MintrudRegistryContext,
)
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

    return payload[
        "access_token"
    ]


def create_mintrud_fixture(
    *,
    with_context: bool,
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
                    "mintrud-api-"
                    + suffix
                    + "@example.test"
                ),
                phone=None,
                full_name=(
                    "Mintrud API User"
                ),
                hashed_password=(
                    get_password_hash(
                        "MintrudApiTest123!"
                    )
                ),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )

            course = Course(
                slug=(
                    "mintrud-api-"
                    + suffix
                ),
                title=(
                    "Mintrud API Test "
                    + suffix[:8]
                ),
                hours=40,
                document_type=(
                    "certificate"
                ),
                regulatory_program_type=(
                    "occupational_safety_training"
                ),
                frdo_requirement_mode=(
                    "not_required"
                ),
                mintrud_requirement_mode=(
                    "required"
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

            profile = LearnerProfile(
                user_id=str(user.id),
                last_name="Ivanov",
                first_name="Ivan",
                middle_name="Ivanovich",
                birth_date=date(
                    1990,
                    1,
                    2,
                ),
                sex="male",
                citizenship_country_code=(
                    "643"
                ),
                snils=(
                    "112-233-"
                    + suffix[:3]
                    + " "
                    + suffix[3:5]
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
                    "MINTRUD-API-"
                    + suffix
                ),
                document_type=(
                    "certificate"
                ),
                title=(
                    "Mintrud API test document"
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

            obligation = RegistryObligation(
                registry="mintrud",
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
                    "test.mintrud.api"
                ),
                rule_version="test-v1",
                requirement_reason=(
                    "Permanent Mintrud API test"
                ),
                readiness_errors=[],
            )

            session.add(
                obligation
            )

            await session.flush()

            context_id = None

            if with_context:
                context = (
                    MintrudRegistryContext(
                        obligation_id=str(
                            obligation.id
                        ),
                        reporting_scenario=(
                            "external_training_provider"
                        ),
                        profession_or_position=(
                            "engineer"
                        ),
                        employer_name=(
                            "Employer LLC "
                            + suffix[:8]
                        ),
                        employer_inn=(
                            "0274000000"
                        ),
                        knowledge_check_result=(
                            "satisfactory"
                        ),
                        knowledge_check_date=date(
                            2026,
                            9,
                            5,
                        ),
                        protocol_number=(
                            "OT-"
                            + suffix[:12]
                        ),
                    )
                )

                session.add(
                    context
                )

                await session.flush()

                context_id = str(
                    context.id
                )

            await session.commit()

            result = {
                "obligation_id": str(
                    obligation.id
                ),
                "context_id": context_id,
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


def cleanup_mintrud_fixtures(
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
                        MintrudRegistryContext
                    ).where(
                        MintrudRegistryContext
                        .obligation_id
                        == fixture[
                            "obligation_id"
                        ]
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


def get_mintrud_audit_actions(
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


def test_mintrud_admin_list_validate_and_permissions() -> None:
    complete = create_mintrud_fixture(
        with_context=True,
    )

    incomplete = create_mintrud_fixture(
        with_context=False,
    )

    needs_approval = create_mintrud_fixture(
        with_context=True,
        obligation_status="needs_approval",
    )

    approved = create_mintrud_fixture(
        with_context=True,
        obligation_status="approved",
    )

    fixtures = [
        complete,
        incomplete,
        needs_approval,
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
                "mintrud/obligations"
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

        for fixture in fixtures:
            assert (
                fixture[
                    "obligation_id"
                ]
                in ids
            )

        assert all(
            item["registry"]
            == "mintrud"
            for item in items
        )

        complete_item = next(
            item
            for item in items
            if item["id"]
            == complete[
                "obligation_id"
            ]
        )

        assert (
            complete_item[
                "mintrud_context"
            ]
            is not None
        )

        assert (
            complete_item[
                "mintrud_context"
            ][
                "reporting_scenario"
            ]
            == "external_training_provider"
        )

        incomplete_item = next(
            item
            for item in items
            if item["id"]
            == incomplete[
                "obligation_id"
            ]
        )

        assert (
            incomplete_item[
                "mintrud_context"
            ]
            is None
        )

        status_code, filtered = (
            request_json(
                "GET",
                (
                    "/api/v1/admin/"
                    "mintrud/obligations"
                    "?q="
                    + complete[
                        "email"
                    ]
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
                "mintrud/obligations",
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
                    "mintrud/obligations/"
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
            ][
                "status"
            ]
            == "ready"
        )

        assert (
            validated[
                "obligation"
            ][
                "readiness_errors"
            ]
            == []
        )

        assert (
            validated[
                "obligation"
            ][
                "mintrud_context"
            ][
                "protocol_number"
            ]
            is not None
        )

        audit_actions = (
            get_mintrud_audit_actions(
                complete[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.mintrud_obligation_validated"
            in audit_actions
        )

        status_code, incomplete_result = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "mintrud/obligations/"
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
            ][
                "status"
            ]
            == "pending_data"
        )

        incomplete_codes = {
            item["code"]
            for item
            in incomplete_result[
                "issues"
            ]
        }

        assert (
            "mintrud.context_missing"
            in incomplete_codes
        )

        persisted_codes = {
            item["code"]
            for item
            in incomplete_result[
                "obligation"
            ][
                "readiness_errors"
            ]
        }

        assert (
            "mintrud.context_missing"
            in persisted_codes
        )

        status_code, approval_result = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "mintrud/obligations/"
                    + needs_approval[
                        "obligation_id"
                    ]
                    + "/validate"
                ),
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            approval_result[
                "is_ready"
            ]
            is True
        )

        assert (
            approval_result[
                "obligation"
            ][
                "status"
            ]
            == "needs_approval"
        )

        status_code, forbidden_validate = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "mintrud/obligations/"
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
                    "mintrud/obligations/"
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
                    "mintrud/obligations/"
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
                    "mintrud/obligations"
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
        cleanup_mintrud_fixtures(
            fixtures
        )

def test_mintrud_admin_context_write_api() -> None:
    editable = create_mintrud_fixture(
        with_context=False,
    )

    approved = create_mintrud_fixture(
        with_context=True,
        obligation_status="approved",
    )

    fixtures = [
        editable,
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

        context_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + editable[
                "obligation_id"
            ]
            + "/context"
        )

        complete_payload = {
            "reporting_scenario": (
                "external_training_provider"
            ),
            "profession_or_position": (
                "  safety engineer  "
            ),
            "employer_name": (
                "  Example Employer LLC  "
            ),
            "employer_inn": (
                "  0274000000  "
            ),
            "knowledge_check_result": (
                "satisfactory"
            ),
            "knowledge_check_date": (
                "2026-09-05"
            ),
            "protocol_number": (
                "  OT-CONTEXT-001  "
            ),
        }

        status_code, created = (
            request_json(
                "PATCH",
                context_path,
                complete_payload,
                token=admin_token,
            )
        )

        assert status_code == 200

        assert created[
            "id"
        ] == editable[
            "obligation_id"
        ]

        assert created[
            "status"
        ] == "ready"

        assert created[
            "readiness_errors"
        ] == []

        context = created[
            "mintrud_context"
        ]

        assert context is not None

        first_context_id = (
            context["id"]
        )

        assert (
            context[
                "obligation_id"
            ]
            == editable[
                "obligation_id"
            ]
        )

        assert (
            context[
                "reporting_scenario"
            ]
            == "external_training_provider"
        )

        assert (
            context[
                "profession_or_position"
            ]
            == "safety engineer"
        )

        assert (
            context[
                "employer_name"
            ]
            == "Example Employer LLC"
        )

        assert (
            context[
                "employer_inn"
            ]
            == "0274000000"
        )

        assert (
            context[
                "knowledge_check_result"
            ]
            == "satisfactory"
        )

        assert (
            context[
                "knowledge_check_date"
            ]
            == "2026-09-05"
        )

        assert (
            context[
                "protocol_number"
            ]
            == "OT-CONTEXT-001"
        )

        status_code, partial = (
            request_json(
                "PATCH",
                context_path,
                {
                    "protocol_number": (
                        "OT-CONTEXT-002"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            partial[
                "mintrud_context"
            ][
                "id"
            ]
            == first_context_id
        )

        assert (
            partial[
                "mintrud_context"
            ][
                "protocol_number"
            ]
            == "OT-CONTEXT-002"
        )

        assert (
            partial[
                "mintrud_context"
            ][
                "profession_or_position"
            ]
            == "safety engineer"
        )

        assert (
            partial[
                "status"
            ]
            == "ready"
        )

        status_code, cleared = (
            request_json(
                "PATCH",
                context_path,
                {
                    "employer_name": None,
                },
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            cleared[
                "mintrud_context"
            ][
                "id"
            ]
            == first_context_id
        )

        assert (
            cleared[
                "mintrud_context"
            ][
                "employer_name"
            ]
            is None
        )

        assert (
            cleared[
                "status"
            ]
            == "pending_data"
        )

        cleared_codes = {
            item["code"]
            for item
            in cleared[
                "readiness_errors"
            ]
        }

        assert (
            "mintrud.employer_name_missing"
            in cleared_codes
        )

        status_code, restored = (
            request_json(
                "PATCH",
                context_path,
                {
                    "employer_name": (
                        "Restored Employer LLC"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            restored[
                "status"
            ]
            == "ready"
        )

        assert (
            restored[
                "readiness_errors"
            ]
            == []
        )

        assert (
            restored[
                "mintrud_context"
            ][
                "id"
            ]
            == first_context_id
        )

        actions = (
            get_mintrud_audit_actions(
                editable[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.mintrud_context_updated"
            in actions
        )

        status_code, empty = (
            request_json(
                "PATCH",
                context_path,
                {},
                token=admin_token,
            )
        )

        assert status_code == 400
        assert isinstance(
            empty,
            dict,
        )

        status_code, invalid_scenario = (
            request_json(
                "PATCH",
                context_path,
                {
                    "reporting_scenario": (
                        "invalid_scenario"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 422
        assert isinstance(
            invalid_scenario,
            dict,
        )

        status_code, invalid_result = (
            request_json(
                "PATCH",
                context_path,
                {
                    "knowledge_check_result": (
                        "invalid_result"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 422
        assert isinstance(
            invalid_result,
            dict,
        )

        status_code, too_long_inn = (
            request_json(
                "PATCH",
                context_path,
                {
                    "employer_inn": (
                        "  1234567890123  "
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 422
        assert isinstance(
            too_long_inn,
            dict,
        )

        status_code, forbidden = (
            request_json(
                "PATCH",
                context_path,
                {
                    "protocol_number": (
                        "FORBIDDEN"
                    ),
                },
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
            "mintrud/obligations/"
            + approved[
                "obligation_id"
            ]
            + "/context"
        )

        status_code, lifecycle_guard = (
            request_json(
                "PATCH",
                approved_path,
                {
                    "protocol_number": (
                        "SHOULD-NOT-WRITE"
                    ),
                },
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
            "mintrud/obligations/"
            "00000000-0000-0000-"
            "0000-000000000000/"
            "context"
        )

        status_code, missing = (
            request_json(
                "PATCH",
                missing_path,
                {
                    "protocol_number": (
                        "MISSING"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 404
        assert isinstance(
            missing,
            dict,
        )

    finally:
        cleanup_mintrud_fixtures(
            fixtures
        )

def test_mintrud_admin_approval_state_machine() -> None:
    needs_approval = create_mintrud_fixture(
        with_context=True,
        obligation_status="needs_approval",
    )

    ready = create_mintrud_fixture(
        with_context=True,
        obligation_status="ready",
    )

    incomplete = create_mintrud_fixture(
        with_context=False,
        obligation_status="needs_approval",
    )

    already_approved = create_mintrud_fixture(
        with_context=True,
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
            "mintrud/obligations/"
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

        assert (
            approved[
                "mintrud_context"
            ]
            is not None
        )

        actions = (
            get_mintrud_audit_actions(
                needs_approval[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.mintrud_obligation_approved"
            in actions
        )

        ready_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
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
            "mintrud/obligations/"
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
            "mintrud/obligations/"
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
            "mintrud/obligations/"
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
        cleanup_mintrud_fixtures(
            fixtures
        )

def create_mintrud_attempt_history(
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
                        "registry": "mintrud",
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
                        "registry": "mintrud",
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
                        "b" * 64
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


def test_mintrud_admin_submission_attempt_history() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="approved",
    )

    try:
        attempt_ids = (
            create_mintrud_attempt_history(
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
            "mintrud/obligations/"
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
                "snapshot_json"
            ][
                "registry"
            ]
            == "mintrud"
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
            == "b" * 64
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
            "mintrud/obligations/"
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
        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )
