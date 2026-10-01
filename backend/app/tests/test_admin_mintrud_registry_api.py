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
from app.models.mintrud_learn_program import (
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
    CourseMintrudLearnProgram,
    MintrudLearnProgram,
)
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

            mintrud_program = await session.scalar(
                select(
                    MintrudLearnProgram
                ).where(
                    MintrudLearnProgram.schema_version
                    == MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
                    MintrudLearnProgram.learn_program_id
                    == 1,
                    MintrudLearnProgram.is_active.is_(
                        True
                    ),
                )
            )

            assert mintrud_program is not None

            course_program = (
                CourseMintrudLearnProgram(
                    course_id=str(
                        course.id
                    ),
                    mintrud_learn_program_id=str(
                        mintrud_program.id
                    ),
                )
            )

            session.add(
                course_program
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
                "mintrud_program_id": str(
                    mintrud_program.id
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
                        CourseMintrudLearnProgram
                    ).where(
                        CourseMintrudLearnProgram.course_id
                        == fixture[
                            "course_id"
                        ],
                        CourseMintrudLearnProgram
                        .mintrud_learn_program_id
                        == fixture[
                            "mintrud_program_id"
                        ],
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

        status_code, legacy_reapproved = (
            request_json(
                "POST",
                approved_path,
                token=admin_token,
            )
        )

        assert status_code == 200
        assert (
            legacy_reapproved["status"]
            == "approved"
        )
        assert (
            legacy_reapproved[
                "approved_by_user_id"
            ]
            is not None
        )
        assert (
            legacy_reapproved[
                "approved_at"
            ]
            is not None
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

def prepare_mintrud_exported_attempt(
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
            b"mintrud-manual-submission-test"
        )

        async with session_factory() as session:
            attempt = RegistrySubmissionAttempt(
                obligation_id=fixture[
                    "obligation_id"
                ],
                attempt_no=1,
                artifact_kind=(
                    "portal-upload-artifact"
                ),
                transport="file",
                schema_version=None,
                snapshot_json={
                    "registry": "mintrud",
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


def delete_mintrud_test_artifact(
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


def test_mintrud_admin_manual_submission_reconciliation() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="approved",
    )

    artifact_path = None

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_mintrud_exported_attempt(
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
            "mintrud/obligations/"
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
                        "  EISOT-PACKAGE-9  "
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

        status_code, corrected = (
            request_json(
                "POST",
                base_path
                + "/result",
                {
                    "result_status": (
                        "correction_required"
                    ),
                    "external_id": None,
                    "errors": [
                        "  SNILS rejected  ",
                        "Protocol mismatch",
                    ],
                },
                token=admin_token,
            )
        )

        assert status_code == 200

        assert (
            corrected[
                "status"
            ]
            == "correction_required"
        )

        assert (
            corrected[
                "accepted_at"
            ]
            is None
        )

        assert (
            corrected[
                "external_id"
            ]
            is None
        )

        assert (
            corrected[
                "last_error"
            ]
            == (
                "SNILS rejected\n"
                "Protocol mismatch"
            )
        )

        attempts_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
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
            == "EISOT-PACKAGE-9"
        )

        assert (
            attempts[0][
                "result_status"
            ]
            == "correction_required"
        )

        assert (
            attempts[0][
                "errors_json"
            ]
            == [
                "SNILS rejected",
                "Protocol mismatch",
            ]
        )

        status_code, forbidden = (
            request_json(
                "POST",
                base_path
                + "/submitted",
                {},
                token=learner_token,
            )
        )

        assert status_code == 403

        status_code, duplicate_result = (
            request_json(
                "POST",
                base_path
                + "/result",
                {
                    "result_status": (
                        "accepted"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 409
        assert isinstance(
            duplicate_result,
            dict,
        )

        actions = (
            get_mintrud_audit_actions(
                fixture[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.mintrud_registry_"
            "submission_recorded"
            in actions
        )

        assert (
            "admin.mintrud_registry_submission_"
            "result_recorded"
            in actions
        )

    finally:
        delete_mintrud_test_artifact(
            artifact_path
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )

def request_bytes(
    method: str,
    path: str,
    *,
    token: str | None = None,
):
    headers = {
        "Accept": (
            "application/octet-stream"
        ),
    }

    if token:
        headers[
            "Authorization"
        ] = (
            "Bearer "
            + token
        )

    request = Request(
        BASE_URL + path,
        headers=headers,
        method=method,
    )

    try:
        with urlopen(
            request,
            timeout=20,
        ) as response:
            return (
                response.status,
                response.read(),
                dict(
                    response.headers.items()
                ),
            )

    except HTTPError as exc:
        return (
            exc.code,
            exc.read(),
            (
                dict(
                    exc.headers.items()
                )
                if exc.headers
                else {}
            ),
        )


def test_mintrud_admin_submission_attempt_download() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="approved",
    )

    artifact_path = None

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_mintrud_exported_attempt(
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

        path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts/"
            + attempt_id
            + "/download"
        )

        (
            status_code,
            body,
            headers,
        ) = request_bytes(
            "GET",
            path,
            token=admin_token,
        )

        assert (
            status_code
            == 200
        )

        assert (
            body
            == b"mintrud-manual-submission-test"
        )

        disposition = next(
            (
                value
                for key, value
                in headers.items()
                if key.lower()
                == "content-disposition"
            ),
            "",
        )

        assert (
            "attachment"
            in disposition.lower()
        )

        assert (
            ".xml"
            in disposition.lower()
        )

        (
            status_code,
            _body,
            _headers,
        ) = request_bytes(
            "GET",
            path,
            token=learner_token,
        )

        assert (
            status_code
            == 403
        )

        missing_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts/"
            "00000000-0000-0000-"
            "0000-000000000000/"
            "download"
        )

        (
            status_code,
            _body,
            _headers,
        ) = request_bytes(
            "GET",
            missing_path,
            token=admin_token,
        )

        assert (
            status_code
            == 404
        )

        from app.services.document_storage import (
            resolve_private_storage_path,
        )

        resolved = (
            resolve_private_storage_path(
                artifact_path
            )
        )

        assert (
            resolved
            is not None
        )

        resolved.write_bytes(
            b"tampered-mintrud-artifact"
        )

        (
            status_code,
            error_body,
            _headers,
        ) = request_bytes(
            "GET",
            path,
            token=admin_token,
        )

        assert (
            status_code
            == 409
        )

        error_payload = json.loads(
            error_body.decode(
                "utf-8"
            )
        )

        assert (
            "checksum mismatch"
            in str(
                error_payload
            ).lower()
        )

    finally:
        delete_mintrud_test_artifact(
            artifact_path
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )



def get_mintrud_attempt_artifact_path(
    attempt_id: str,
) -> str | None:
    async def _get():
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
            attempt = (
                await session.scalar(
                    select(
                        RegistrySubmissionAttempt
                    ).where(
                        RegistrySubmissionAttempt.id
                        == attempt_id
                    )
                )
            )

            result = (
                attempt.artifact_path
                if attempt is not None
                else None
            )

        await engine.dispose()

        return result

    return asyncio.run(
        _get()
    )



def get_mintrud_obligation_approval_fingerprint(
    obligation_id: str,
) -> str | None:
    async def _get():
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
            obligation = (
                await session.scalar(
                    select(
                        RegistryObligation
                    ).where(
                        RegistryObligation.id
                        == obligation_id
                    )
                )
            )

            result = (
                obligation.approval_fingerprint
                if obligation is not None
                else None
            )

        await engine.dispose()

        return result

    return asyncio.run(
        _get()
    )


def test_mintrud_admin_export_preparation_api() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="needs_approval",
    )

    artifact_path = None
    second_artifact_path = None

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        learner_token = login(
            LEARNER_EMAIL,
            LEARNER_PASSWORD,
        )

        obligation_id = fixture[
            "obligation_id"
        ]

        approve_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
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

        approval_fingerprint = (
            get_mintrud_obligation_approval_fingerprint(
                obligation_id
            )
        )

        assert approval_fingerprint is not None
        assert len(approval_fingerprint) == 64

        export_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
            + "/export"
        )

        status_code, forbidden = (
            request_json(
                "POST",
                export_path,
                token=learner_token,
            )
        )

        assert status_code == 403
        assert isinstance(
            forbidden,
            dict,
        )

        status_code, attempt = (
            request_json(
                "POST",
                export_path,
                token=admin_token,
            )
        )

        assert status_code == 201
        assert isinstance(
            attempt,
            dict,
        )

        assert (
            attempt[
                "obligation_id"
            ]
            == obligation_id
        )

        assert (
            attempt[
                "attempt_no"
            ]
            == 1
        )

        assert (
            attempt["transport"]
            == "file"
        )

        assert (
            attempt[
                "artifact_kind"
            ]
            == "internal-export-package"
        )

        assert (
            attempt[
                "schema_version"
            ]
            == (
                "obrportal-"
                "registry-export-v1"
            )
        )

        assert (
            attempt[
                "has_artifact"
            ]
            is True
        )

        assert isinstance(
            attempt[
                "artifact_sha256"
            ],
            str,
        )

        assert (
            len(
                attempt[
                    "artifact_sha256"
                ]
            )
            == 64
        )

        assert (
            attempt[
                "submitted_at"
            ]
            is None
        )

        assert (
            attempt[
                "result_status"
            ]
            is None
        )

        package = attempt[
            "snapshot_json"
        ]

        assert (
            package[
                "schema_version"
            ]
            == (
                "obrportal-"
                "registry-export-v1"
            )
        )

        assert (
            package["purpose"]
            == (
                "internal-export-package"
            )
        )

        assert (
            package["registry"]
            == "mintrud"
        )

        assert (
            package[
                "obligation"
            ][
                "id"
            ]
            == obligation_id
        )

        assert (
            package[
                "obligation"
            ][
                "enrollment_id"
            ]
            == fixture[
                "enrollment_id"
            ]
        )

        assert (
            package[
                "approval"
            ][
                "fingerprint"
            ]
            == approval_fingerprint
        )

        assert (
            package[
                "approval"
            ][
                "snapshot"
            ][
                "schema_version"
            ]
            == "registry-approval-v1"
        )

        assert (
            package[
                "approval"
            ][
                "snapshot"
            ][
                "registry"
            ]
            == "mintrud"
        )

        attempt_id = attempt["id"]

        artifact_path = (
            get_mintrud_attempt_artifact_path(
                attempt_id
            )
        )

        assert artifact_path is not None
        assert artifact_path.endswith(
            ".json"
        )

        attempts_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
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
        assert len(attempts) == 1

        assert (
            attempts[0]["id"]
            == attempt_id
        )

        download_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
            + "/attempts/"
            + attempt_id
            + "/download"
        )

        (
            status_code,
            body,
            _headers,
        ) = request_bytes(
            "GET",
            download_path,
            token=admin_token,
        )

        assert status_code == 200

        downloaded_package = (
            json.loads(
                body.decode(
                    "utf-8"
                )
            )
        )

        assert (
            downloaded_package
            == package
        )

        status_code, second_attempt = (
            request_json(
                "POST",
                export_path,
                token=admin_token,
            )
        )

        assert status_code == 201
        assert isinstance(
            second_attempt,
            dict,
        )

        assert (
            second_attempt[
                "attempt_no"
            ]
            == 2
        )

        assert (
            second_attempt[
                "artifact_kind"
            ]
            == "internal-export-package"
        )

        second_artifact_path = (
            get_mintrud_attempt_artifact_path(
                second_attempt["id"]
            )
        )

        assert (
            second_artifact_path
            is not None
        )

        status_code, attempts = (
            request_json(
                "GET",
                attempts_path,
                token=admin_token,
            )
        )

        assert status_code == 200
        assert len(attempts) == 2

        assert (
            attempts[0][
                "attempt_no"
            ]
            == 2
        )

        assert (
            attempts[1][
                "attempt_no"
            ]
            == 1
        )

        assert all(
            item[
                "artifact_kind"
            ]
            == "internal-export-package"
            for item in attempts
        )

        actions = (
            get_mintrud_audit_actions(
                obligation_id
            )
        )

        assert (
            "admin.mintrud_registry_"
            "export_prepared"
            in actions
        )

    finally:
        delete_mintrud_test_artifact(
            artifact_path
        )

        delete_mintrud_test_artifact(
            second_artifact_path
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )



def test_mintrud_rework_api_contract() -> None:
    rejected = create_mintrud_fixture(
        with_context=True,
        obligation_status="rejected",
    )

    correction = create_mintrud_fixture(
        with_context=True,
        obligation_status="correction_required",
    )

    invalid = create_mintrud_fixture(
        with_context=True,
        obligation_status="ready",
    )

    fixtures = [
        rejected,
        correction,
        invalid,
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

        status_code, reopened = request_json(
            "POST",
            (
                "/api/v1/admin/mintrud/obligations/"
                + rejected["obligation_id"]
                + "/reopen"
            ),
            token=admin_token,
        )

        assert status_code == 200
        assert reopened["id"] == rejected["obligation_id"]
        assert reopened["registry"] == "mintrud"
        assert reopened["status"] == "pending_data"
        assert reopened["readiness_errors"] == []
        assert reopened["submitted_at"] is None
        assert reopened["accepted_at"] is None
        assert reopened["external_id"] is None
        assert reopened["last_error"] is None

        status_code, correction_reopened = request_json(
            "POST",
            (
                "/api/v1/admin/mintrud/obligations/"
                + correction["obligation_id"]
                + "/reopen"
            ),
            token=admin_token,
        )

        assert status_code == 200
        assert (
            correction_reopened["status"]
            == "pending_data"
        )

        status_code, forbidden = request_json(
            "POST",
            (
                "/api/v1/admin/mintrud/obligations/"
                + invalid["obligation_id"]
                + "/reopen"
            ),
            token=learner_token,
        )

        assert status_code == 403
        assert isinstance(forbidden, dict)

        status_code, lifecycle_guard = request_json(
            "POST",
            (
                "/api/v1/admin/mintrud/obligations/"
                + invalid["obligation_id"]
                + "/reopen"
            ),
            token=admin_token,
        )

        assert status_code == 409
        assert isinstance(lifecycle_guard, dict)

        status_code, missing = request_json(
            "POST",
            (
                "/api/v1/admin/mintrud/obligations/"
                "00000000-0000-0000-"
                "0000-000000000000/reopen"
            ),
            token=admin_token,
        )

        assert status_code == 404
        assert isinstance(missing, dict)

    finally:
        cleanup_mintrud_fixtures(
            fixtures
        )



def count_mintrud_registry_submission_attempts(
    obligation_id: str,
) -> int:
    async def _count():
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
                    RegistrySubmissionAttempt.id
                ).where(
                    RegistrySubmissionAttempt.obligation_id
                    == obligation_id
                )
            )

            count = len(
                result.scalars().all()
            )

        await engine.dispose()

        return count

    return asyncio.run(
        _count()
    )


def test_mintrud_portal_artifact_official_xml_contract() -> None:
    from xml.etree import ElementTree as ET

    from app.services.mintrud_eisot_xsd import (
        validate_mintrud_eisot_xml_v109,
    )

    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="needs_approval",
    )

    artifact_path = None

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        learner_token = login(
            LEARNER_EMAIL,
            LEARNER_PASSWORD,
        )

        obligation_id = fixture[
            "obligation_id"
        ]

        before_count = (
            count_mintrud_registry_submission_attempts(
                obligation_id
            )
        )

        assert before_count == 0

        approve_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
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
        assert isinstance(
            approved,
            dict,
        )
        assert (
            approved["status"]
            == "approved"
        )

        approval_fingerprint = (
            get_mintrud_obligation_approval_fingerprint(
                obligation_id
            )
        )

        assert approval_fingerprint is not None
        assert len(
            approval_fingerprint
        ) == 64

        portal_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
            + "/portal-artifact"
        )

        status_code, forbidden = (
            request_json(
                "POST",
                portal_path,
                token=learner_token,
            )
        )

        assert status_code == 403
        assert isinstance(
            forbidden,
            dict,
        )

        assert (
            count_mintrud_registry_submission_attempts(
                obligation_id
            )
            == 0
        )

        status_code, attempt = (
            request_json(
                "POST",
                portal_path,
                token=admin_token,
            )
        )

        assert status_code == 201
        assert isinstance(
            attempt,
            dict,
        )

        assert (
            attempt[
                "obligation_id"
            ]
            == obligation_id
        )

        assert (
            attempt[
                "attempt_no"
            ]
            == 1
        )

        assert (
            attempt[
                "artifact_kind"
            ]
            == "portal-upload-artifact"
        )

        assert (
            attempt[
                "transport"
            ]
            == "file"
        )

        assert (
            attempt[
                "schema_version"
            ]
            == "1.0.9"
        )

        assert (
            attempt[
                "has_artifact"
            ]
            is True
        )

        artifact_sha256 = attempt[
            "artifact_sha256"
        ]

        assert isinstance(
            artifact_sha256,
            str,
        )

        assert len(
            artifact_sha256
        ) == 64

        assert (
            attempt[
                "submitted_at"
            ]
            is None
        )

        assert (
            attempt[
                "result_status"
            ]
            is None
        )

        snapshot = attempt[
            "snapshot_json"
        ]

        assert isinstance(
            snapshot,
            dict,
        )

        assert (
            snapshot[
                "schema_version"
            ]
            == "registry-approval-v1"
        )

        assert (
            snapshot[
                "registry"
            ]
            == "mintrud"
        )

        artifact_path = (
            get_mintrud_attempt_artifact_path(
                attempt["id"]
            )
        )

        assert artifact_path is not None
        assert artifact_path.endswith(
            ".xml"
        )

        download_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
            + "/attempts/"
            + attempt["id"]
            + "/download"
        )

        (
            download_status,
            xml_content,
            headers,
        ) = request_bytes(
            "GET",
            download_path,
            token=admin_token,
        )

        assert download_status == 200
        assert isinstance(
            xml_content,
            bytes,
        )
        assert xml_content

        disposition = next(
            (
                value
                for key, value
                in headers.items()
                if key.lower()
                == "content-disposition"
            ),
            "",
        )

        assert (
            "attachment"
            in disposition.lower()
        )

        assert (
            ".xml"
            in disposition.lower()
        )

        validate_mintrud_eisot_xml_v109(
            xml_content
        )

        root = ET.fromstring(
            xml_content
        )

        assert root.tag == "RegistrySet"

        records = root.findall(
            "RegistryRecord"
        )

        assert len(records) == 1

        worker = records[
            0
        ].find(
            "Worker"
        )

        assert worker is not None

        assert (
            worker.findtext(
                "LastName"
            )
            == "Ivanov"
        )

        assert (
            worker.findtext(
                "FirstName"
            )
            == "Ivan"
        )

        assert (
            worker.findtext(
                "MiddleName"
            )
            == "Ivanovich"
        )

        assert (
            worker.findtext(
                "Position"
            )
            == "engineer"
        )

        assert (
            worker.findtext(
                "EmployerInn"
            )
            == "0274000000"
        )

        test_node = records[
            0
        ].find(
            "Test"
        )

        assert test_node is not None

        assert (
            test_node.attrib[
                "isPassed"
            ]
            == "1"
        )

        assert (
            test_node.attrib[
                "learnProgramId"
            ]
            == "1"
        )

        assert (
            test_node.findtext(
                "Date"
            )
            == "2026-09-05"
        )

        protocol_number = (
            test_node.findtext(
                "ProtocolNumber"
            )
        )

        assert isinstance(
            protocol_number,
            str,
        )

        assert protocol_number.startswith(
            "OT-"
        )

        assert (
            count_mintrud_registry_submission_attempts(
                obligation_id
            )
            == 1
        )

        async def _read_status():
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

            try:
                async with session_factory() as session:
                    obligation = (
                        await session.scalar(
                            select(
                                RegistryObligation
                            ).where(
                                RegistryObligation.id
                                == obligation_id
                            )
                        )
                    )

                    assert obligation is not None

                    return (
                        obligation.status
                    )

            finally:
                await engine.dispose()

        assert (
            asyncio.run(
                _read_status()
            )
            == "exported"
        )

        actions = (
            get_mintrud_audit_actions(
                obligation_id
            )
        )

        assert (
            "admin.mintrud_portal_artifact_prepared"
            in actions
        )

    finally:
        delete_mintrud_test_artifact(
            artifact_path
        )

        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )


def test_mintrud_internal_export_rejects_stale_approval() -> None:
    fixture = create_mintrud_fixture(
        with_context=True,
        obligation_status="needs_approval",
    )

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        obligation_id = fixture[
            "obligation_id"
        ]

        approve_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
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

        async def _make_current_data_stale():
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

            try:
                async with session_factory() as session:
                    course = await session.scalar(
                        select(
                            Course
                        ).where(
                            Course.id
                            == fixture[
                                "course_id"
                            ]
                        )
                    )

                    assert course is not None

                    course.title = (
                        course.title
                        + " stale"
                    )

                    await session.commit()

            finally:
                await engine.dispose()

        asyncio.run(
            _make_current_data_stale()
        )

        async def _read_registry_state():
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

            try:
                async with session_factory() as session:
                    obligation = await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == obligation_id
                        )
                    )

                    assert obligation is not None

                    attempt_result = await session.execute(
                        select(
                            RegistrySubmissionAttempt.id
                        ).where(
                            RegistrySubmissionAttempt
                            .obligation_id
                            == obligation_id
                        )
                    )

                    attempt_ids = list(
                        attempt_result.scalars().all()
                    )

                    return (
                        obligation.status,
                        len(
                            attempt_ids
                        ),
                    )

            finally:
                await engine.dispose()

        (
            before_status,
            before_attempt_count,
        ) = asyncio.run(
            _read_registry_state()
        )

        assert (
            before_status
            == "approved"
        )

        assert (
            before_attempt_count
            == 0
        )

        export_path = (
            "/api/v1/admin/"
            "mintrud/obligations/"
            + obligation_id
            + "/export"
        )

        status_code, rejected = (
            request_json(
                "POST",
                export_path,
                token=admin_token,
            )
        )

        assert status_code == 409
        assert isinstance(
            rejected,
            dict,
        )

        detail = str(
            rejected.get(
                "detail",
                "",
            )
        ).lower()

        assert "stale" in detail

        (
            after_status,
            after_attempt_count,
        ) = asyncio.run(
            _read_registry_state()
        )

        assert (
            after_status
            == "approved"
        )

        assert (
            after_attempt_count
            == 0
        )

        actions = get_mintrud_audit_actions(
            obligation_id
        )

        assert (
            "admin.mintrud_registry_"
            "export_prepared"
            not in actions
        )

    finally:
        cleanup_mintrud_fixtures(
            [
                fixture,
            ]
        )

def test_mintrud_batch_api_routes_and_schema_contract():
    import pytest

    from pydantic import ValidationError

    from app.api.v1.admin import router
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchCreate,
        AdminMintrudSubmissionBatchItem,
        AdminMintrudSubmissionBatchMarkSubmitted,
    )

    route_pairs = {
        (
            method,
            route.path,
        )
        for route in router.routes
        for method in (
            route.methods
            or set()
        )
    }

    assert (
        "POST",
        router.prefix
        + "/mintrud/batches",
    ) in route_pairs

    assert (
        "GET",
        router.prefix
        + "/mintrud/batches",
    ) in route_pairs

    assert (
        "POST",
        router.prefix
        + "/mintrud/batches/{batch_id}/imported",
    ) in route_pairs

    assert (
        "POST",
        router.prefix
        + "/mintrud/batches/{batch_id}/submitted",
    ) in route_pairs

    assert (
        "GET",
        router.prefix
        + "/mintrud/batches/{batch_id}/download",
    ) in route_pairs

    payload = (
        AdminMintrudSubmissionBatchCreate(
            obligation_ids=[
                "obligation-1",
                "obligation-2",
            ]
        )
    )

    assert payload.obligation_ids == [
        "obligation-1",
        "obligation-2",
    ]

    with pytest.raises(
        ValidationError
    ):
        AdminMintrudSubmissionBatchCreate(
            obligation_ids=[]
        )

    assert (
        AdminMintrudSubmissionBatchItem
        is not None
    )

    submitted_payload = (
        AdminMintrudSubmissionBatchMarkSubmitted(
            external_reference=(
                "EISOT-SET-1"
            )
        )
    )

    assert (
        submitted_payload.external_reference
        == "EISOT-SET-1"
    )

    with pytest.raises(
        ValidationError
    ):
        AdminMintrudSubmissionBatchMarkSubmitted(
            external_reference=(
                "x" * 256
            )
        )


def test_mintrud_batch_create_route_commits_and_audits(
    monkeypatch,
):
    from datetime import (
        datetime,
        timezone,
    )
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchCreate,
    )

    now = datetime.now(
        timezone.utc
    )

    batch = SimpleNamespace(
        id="batch-success",
        registry="mintrud",
        status="exported",
        artifact_kind=(
            "portal-upload-artifact"
        ),
        transport="file",
        schema_version="1.0.9",
        obligation_count=2,
        record_count=3,
        artifact_path=(
            "generated/registry/mintrud/"
            "batches/batch-success.xml"
        ),
        artifact_sha256=(
            "a" * 64
        ),
        generated_by_user_id=(
            "admin-user"
        ),
        generated_at=now,
        imported_by_user_id=None,
        imported_at=None,
        submitted_by_user_id=None,
        submitted_at=None,
        external_reference=None,
        reconciled_by_user_id=None,
        reconciled_at=None,
        created_at=now,
        updated_at=now,
    )

    calls = {
        "create": None,
        "audit": None,
    }

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fake_create(
        session,
        *,
        obligation_ids,
        generated_by_user_id,
    ):
        calls["create"] = {
            "obligation_ids": list(
                obligation_ids
            ),
            "generated_by_user_id": (
                generated_by_user_id
            ),
        }

        return batch

    async def fake_audit(
        session,
        **kwargs,
    ):
        calls["audit"] = kwargs

    monkeypatch.setattr(
        admin_api,
        "create_mintrud_registry_submission_batch",
        fake_create,
    )

    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        fake_audit,
    )

    session = FakeSession()

    response_item = asyncio.run(
        admin_api.prepare_admin_mintrud_submission_batch(
            payload=(
                AdminMintrudSubmissionBatchCreate(
                    obligation_ids=[
                        "obligation-1",
                        "obligation-2",
                    ]
                )
            ),
            request=SimpleNamespace(),
            current_user=SimpleNamespace(
                id="admin-user"
            ),
            session=session,
        )
    )

    assert response_item.id == (
        "batch-success"
    )

    assert response_item.obligation_count == 2
    assert response_item.record_count == 3
    assert response_item.has_artifact is True
    assert response_item.artifact_sha256 == (
        "a" * 64
    )

    assert calls["create"] == {
        "obligation_ids": [
            "obligation-1",
            "obligation-2",
        ],
        "generated_by_user_id": (
            "admin-user"
        ),
    }

    assert (
        calls["audit"][
            "action"
        ]
        == (
            "admin.mintrud_"
            "submission_batch_prepared"
        )
    )

    assert (
        calls["audit"][
            "entity_type"
        ]
        == "registry_submission_batch"
    )

    assert (
        calls["audit"][
            "payload"
        ][
            "external_registry_io"
        ]
        is False
    )

    assert session.commit_count == 1
    assert session.rollback_count == 0


def test_mintrud_batch_create_route_rolls_back_and_cleans(
    monkeypatch,
):
    import pytest

    from datetime import (
        datetime,
        timezone,
    )
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchCreate,
    )

    now = datetime.now(
        timezone.utc
    )

    artifact_path = (
        "generated/registry/mintrud/"
        "batches/batch-failure.xml"
    )

    batch = SimpleNamespace(
        id="batch-failure",
        registry="mintrud",
        status="exported",
        artifact_kind=(
            "portal-upload-artifact"
        ),
        transport="file",
        schema_version="1.0.9",
        obligation_count=1,
        record_count=1,
        artifact_path=artifact_path,
        artifact_sha256=(
            "b" * 64
        ),
        generated_by_user_id=(
            "admin-user"
        ),
        generated_at=now,
        imported_by_user_id=None,
        imported_at=None,
        submitted_by_user_id=None,
        submitted_at=None,
        external_reference=None,
        reconciled_by_user_id=None,
        reconciled_at=None,
        created_at=now,
        updated_at=now,
    )

    deleted = []

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fake_create(
        session,
        *,
        obligation_ids,
        generated_by_user_id,
    ):
        return batch

    async def fail_audit(
        session,
        **kwargs,
    ):
        raise RuntimeError(
            "forced audit failure"
        )

    def fake_delete(
        storage_path,
    ):
        deleted.append(
            storage_path
        )

        return True

    monkeypatch.setattr(
        admin_api,
        "create_mintrud_registry_submission_batch",
        fake_create,
    )

    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        fail_audit,
    )

    monkeypatch.setattr(
        admin_api,
        "delete_registry_submission_batch_artifact_safely",
        fake_delete,
    )

    session = FakeSession()

    with pytest.raises(
        RuntimeError,
        match="forced audit failure",
    ):
        asyncio.run(
            admin_api.prepare_admin_mintrud_submission_batch(
                payload=(
                    AdminMintrudSubmissionBatchCreate(
                        obligation_ids=[
                            "obligation-1",
                        ]
                    )
                ),
                request=SimpleNamespace(),
                current_user=SimpleNamespace(
                    id="admin-user"
                ),
                session=session,
            )
        )

    assert session.commit_count == 0
    assert session.rollback_count == 1
    assert deleted == [
        artifact_path
    ]


def test_mintrud_batch_create_route_maps_domain_error_to_409(
    monkeypatch,
):
    import pytest

    from types import SimpleNamespace

    from fastapi import HTTPException

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchCreate,
    )

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fail_create(
        session,
        *,
        obligation_ids,
        generated_by_user_id,
    ):
        raise (
            admin_api.RegistrySubmissionBatchError(
                "batch validation failed"
            )
        )

    monkeypatch.setattr(
        admin_api,
        "create_mintrud_registry_submission_batch",
        fail_create,
    )

    session = FakeSession()

    with pytest.raises(
        HTTPException
    ) as exc_info:
        asyncio.run(
            admin_api.prepare_admin_mintrud_submission_batch(
                payload=(
                    AdminMintrudSubmissionBatchCreate(
                        obligation_ids=[
                            "obligation-1",
                        ]
                    )
                ),
                request=SimpleNamespace(),
                current_user=SimpleNamespace(
                    id="admin-user"
                ),
                session=session,
            )
        )

    assert exc_info.value.status_code == 409
    assert exc_info.value.detail == (
        "batch validation failed"
    )

    assert session.commit_count == 0
    assert session.rollback_count == 1


def test_mintrud_batch_download_route_contract(
    monkeypatch,
):
    import pytest

    from types import SimpleNamespace

    from fastapi import HTTPException

    import app.api.v1.admin as admin_api

    batch = SimpleNamespace(
        id="batch-download",
        registry="mintrud",
        schema_version="1.0.9",
        artifact_path=(
            "generated/registry/mintrud/"
            "batches/batch-download.xml"
        ),
        artifact_sha256=(
            "c" * 64
        ),
    )

    content = (
        b'<?xml version="1.0" '
        b'encoding="utf-8"?>'
        b"<RegistrySet />"
    )

    class FakeSession:
        def __init__(
            self,
            scalar_value,
        ):
            self.scalar_value = (
                scalar_value
            )

        async def scalar(
            self,
            statement,
        ):
            return self.scalar_value

    monkeypatch.setattr(
        admin_api,
        "read_registry_submission_batch_artifact",
        lambda value: content,
    )

    response = asyncio.run(
        admin_api.download_admin_mintrud_submission_batch(
            batch_id=(
                "batch-download"
            ),
            _=SimpleNamespace(
                id="admin-user"
            ),
            session=FakeSession(
                batch
            ),
        )
    )

    assert response.status_code == 200
    assert response.body == content
    assert response.media_type == (
        "application/xml"
    )

    assert (
        "mintrud-eisot-v1.0.9-"
        "batch-batch-download.xml"
        in response.headers[
            "content-disposition"
        ]
    )

    with pytest.raises(
        HTTPException
    ) as missing_exc:
        asyncio.run(
            admin_api.download_admin_mintrud_submission_batch(
                batch_id=(
                    "missing-batch"
                ),
                _=SimpleNamespace(
                    id="admin-user"
                ),
                session=FakeSession(
                    None
                ),
            )
        )

    assert (
        missing_exc.value.status_code
        == 404
    )

    def fail_read(
        value,
    ):
        raise (
            admin_api.RegistrySubmissionBatchError(
                "checksum mismatch"
            )
        )

    monkeypatch.setattr(
        admin_api,
        "read_registry_submission_batch_artifact",
        fail_read,
    )

    with pytest.raises(
        HTTPException
    ) as integrity_exc:
        asyncio.run(
            admin_api.download_admin_mintrud_submission_batch(
                batch_id=(
                    "batch-download"
                ),
                _=SimpleNamespace(
                    id="admin-user"
                ),
                session=FakeSession(
                    batch
                ),
            )
        )

    assert (
        integrity_exc.value.status_code
        == 409
    )

    assert (
        integrity_exc.value.detail
        == "checksum mismatch"
    )


def make_admin_mintrud_batch_api_fixture(
    *,
    status: str,
    imported: bool = False,
    submitted: bool = False,
    external_reference: str | None = None,
    reconciled: bool = False,
):
    from datetime import (
        datetime,
        timezone,
    )
    from types import SimpleNamespace

    now = datetime.now(
        timezone.utc
    )

    return SimpleNamespace(
        id=(
            "batch-"
            + status
        ),
        registry="mintrud",
        status=status,
        artifact_kind=(
            "portal-upload-artifact"
        ),
        transport="file",
        schema_version="1.0.9",
        obligation_count=2,
        record_count=3,
        artifact_path=(
            "generated/registry/mintrud/"
            "batches/batch-"
            + status
            + ".xml"
        ),
        artifact_sha256=(
            "d" * 64
        ),
        generated_by_user_id=(
            "generator-user"
        ),
        generated_at=now,
        imported_by_user_id=(
            "import-user"
            if imported
            else None
        ),
        imported_at=(
            now
            if imported
            else None
        ),
        submitted_by_user_id=(
            "submit-user"
            if submitted
            else None
        ),
        submitted_at=(
            now
            if submitted
            else None
        ),
        external_reference=(
            external_reference
        ),
        reconciled_by_user_id=(
            "result-user"
            if reconciled
            else None
        ),
        reconciled_at=(
            now
            if reconciled
            else None
        ),
        created_at=now,
        updated_at=now,
    )


def test_mintrud_batch_list_route_returns_lifecycle_fields(
    monkeypatch,
):
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api

    exported = (
        make_admin_mintrud_batch_api_fixture(
            status="exported",
        )
    )

    submitted = (
        make_admin_mintrud_batch_api_fixture(
            status="submitted",
            imported=True,
            submitted=True,
            external_reference=(
                "EISOT-SET-99"
            ),
        )
    )

    calls = []

    async def fake_list(
        session,
    ):
        calls.append(
            session
        )

        return [
            submitted,
            exported,
        ]

    monkeypatch.setattr(
        admin_api,
        "list_mintrud_registry_submission_batches",
        fake_list,
    )

    session = SimpleNamespace()

    result = asyncio.run(
        admin_api.list_admin_mintrud_submission_batches(
            _=SimpleNamespace(
                id="admin-user"
            ),
            session=session,
        )
    )

    assert calls == [
        session,
    ]

    assert len(result) == 2

    assert (
        result[0].status
        == "submitted"
    )

    assert (
        result[0].imported_by_user_id
        == "import-user"
    )

    assert (
        result[0].imported_at
        is not None
    )

    assert (
        result[0].submitted_by_user_id
        == "submit-user"
    )

    assert (
        result[0].submitted_at
        is not None
    )

    assert (
        result[0].external_reference
        == "EISOT-SET-99"
    )

    assert (
        result[1].status
        == "exported"
    )

    assert (
        result[1].imported_at
        is None
    )

    assert (
        result[1].submitted_at
        is None
    )


def test_mintrud_batch_imported_route_commits_and_audits(
    monkeypatch,
):
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api

    batch = (
        make_admin_mintrud_batch_api_fixture(
            status="imported",
            imported=True,
        )
    )

    calls = {
        "service": None,
        "audit": None,
    }

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fake_import(
        session,
        *,
        batch_id,
        imported_by_user_id,
    ):
        calls[
            "service"
        ] = {
            "batch_id": batch_id,
            "imported_by_user_id": (
                imported_by_user_id
            ),
        }

        return batch

    async def fake_audit(
        session,
        **kwargs,
    ):
        calls[
            "audit"
        ] = kwargs

    monkeypatch.setattr(
        admin_api,
        "mark_mintrud_registry_submission_batch_imported",
        fake_import,
    )

    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        fake_audit,
    )

    session = FakeSession()

    response = asyncio.run(
        admin_api.mark_admin_mintrud_submission_batch_imported(
            batch_id="batch-exported",
            request=SimpleNamespace(),
            current_user=SimpleNamespace(
                id="admin-user"
            ),
            session=session,
        )
    )

    assert response.status == (
        "imported"
    )

    assert response.imported_at is not None

    assert calls[
        "service"
    ] == {
        "batch_id": (
            "batch-exported"
        ),
        "imported_by_user_id": (
            "admin-user"
        ),
    }

    assert (
        calls[
            "audit"
        ][
            "action"
        ]
        == (
            "admin.mintrud_submission_batch_"
            "import_recorded"
        )
    )

    assert (
        calls[
            "audit"
        ][
            "entity_type"
        ]
        == "registry_submission_batch"
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "before"
        ][
            "status"
        ]
        == "exported"
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "after"
        ][
            "status"
        ]
        == "imported"
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "external_registry_io"
        ]
        is False
    )

    assert session.commit_count == 1
    assert session.rollback_count == 0


def test_mintrud_batch_submitted_route_commits_and_audits(
    monkeypatch,
):
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchMarkSubmitted,
    )

    batch = (
        make_admin_mintrud_batch_api_fixture(
            status="submitted",
            imported=True,
            submitted=True,
            external_reference=(
                "EISOT-SET-77"
            ),
        )
    )

    calls = {
        "service": None,
        "audit": None,
    }

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fake_submit(
        session,
        *,
        batch_id,
        submitted_by_user_id,
        external_reference,
    ):
        calls[
            "service"
        ] = {
            "batch_id": batch_id,
            "submitted_by_user_id": (
                submitted_by_user_id
            ),
            "external_reference": (
                external_reference
            ),
        }

        return batch

    async def fake_audit(
        session,
        **kwargs,
    ):
        calls[
            "audit"
        ] = kwargs

    monkeypatch.setattr(
        admin_api,
        "mark_mintrud_registry_submission_batch_submitted",
        fake_submit,
    )

    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        fake_audit,
    )

    session = FakeSession()

    response = asyncio.run(
        admin_api.mark_admin_mintrud_submission_batch_submitted(
            batch_id="batch-imported",
            payload=(
                AdminMintrudSubmissionBatchMarkSubmitted(
                    external_reference=(
                        " EISOT-SET-77 "
                    )
                )
            ),
            request=SimpleNamespace(),
            current_user=SimpleNamespace(
                id="admin-user"
            ),
            session=session,
        )
    )

    assert response.status == (
        "submitted"
    )

    assert (
        response.external_reference
        == "EISOT-SET-77"
    )

    assert calls[
        "service"
    ] == {
        "batch_id": (
            "batch-imported"
        ),
        "submitted_by_user_id": (
            "admin-user"
        ),
        "external_reference": (
            " EISOT-SET-77 "
        ),
    }

    assert (
        calls[
            "audit"
        ][
            "action"
        ]
        == (
            "admin.mintrud_submission_batch_"
            "submission_recorded"
        )
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "before"
        ][
            "status"
        ]
        == "imported"
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "after"
        ][
            "status"
        ]
        == "submitted"
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "after"
        ][
            "external_reference"
        ]
        == "EISOT-SET-77"
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "external_registry_io"
        ]
        is False
    )

    assert session.commit_count == 1
    assert session.rollback_count == 0


def test_mintrud_batch_lifecycle_routes_map_domain_error_to_409(
    monkeypatch,
):
    import pytest

    from types import SimpleNamespace

    from fastapi import HTTPException

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchMarkSubmitted,
    )

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fail_import(
        session,
        *,
        batch_id,
        imported_by_user_id,
    ):
        raise (
            admin_api.RegistrySubmissionBatchError(
                "import transition rejected"
            )
        )

    monkeypatch.setattr(
        admin_api,
        "mark_mintrud_registry_submission_batch_imported",
        fail_import,
    )

    import_session = FakeSession()

    with pytest.raises(
        HTTPException
    ) as import_exc:
        asyncio.run(
            admin_api.mark_admin_mintrud_submission_batch_imported(
                batch_id="batch-exported",
                request=SimpleNamespace(),
                current_user=SimpleNamespace(
                    id="admin-user"
                ),
                session=import_session,
            )
        )

    assert (
        import_exc.value.status_code
        == 409
    )

    assert (
        import_exc.value.detail
        == "import transition rejected"
    )

    assert (
        import_session.commit_count
        == 0
    )

    assert (
        import_session.rollback_count
        == 1
    )

    async def fail_submit(
        session,
        *,
        batch_id,
        submitted_by_user_id,
        external_reference,
    ):
        raise (
            admin_api.RegistrySubmissionBatchError(
                "submit transition rejected"
            )
        )

    monkeypatch.setattr(
        admin_api,
        "mark_mintrud_registry_submission_batch_submitted",
        fail_submit,
    )

    submit_session = FakeSession()

    with pytest.raises(
        HTTPException
    ) as submit_exc:
        asyncio.run(
            admin_api.mark_admin_mintrud_submission_batch_submitted(
                batch_id="batch-imported",
                payload=(
                    AdminMintrudSubmissionBatchMarkSubmitted(
                        external_reference=None
                    )
                ),
                request=SimpleNamespace(),
                current_user=SimpleNamespace(
                    id="admin-user"
                ),
                session=submit_session,
            )
        )

    assert (
        submit_exc.value.status_code
        == 409
    )

    assert (
        submit_exc.value.detail
        == "submit transition rejected"
    )

    assert (
        submit_session.commit_count
        == 0
    )

    assert (
        submit_session.rollback_count
        == 1
    )


def make_admin_mintrud_batch_result_item_fixture(
    *,
    obligation_id: str,
    position: int,
    result_status: str | None = None,
    external_id: str | None = None,
    errors_json=None,
    recorded: bool = False,
):
    from datetime import (
        datetime,
        timezone,
    )
    from types import SimpleNamespace

    now = datetime.now(
        timezone.utc
    )

    return SimpleNamespace(
        id=(
            "item-"
            + str(
                position
            )
        ),
        obligation_id=obligation_id,
        position=position,
        record_count=1,
        result_status=result_status,
        errors_json=list(
            errors_json
            or []
        ),
        external_id=external_id,
        result_recorded_by_user_id=(
            "result-user"
            if recorded
            else None
        ),
        result_recorded_at=(
            now
            if recorded
            else None
        ),
    )


def test_mintrud_batch_detail_route_returns_item_results(
    monkeypatch,
):
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api

    batch = (
        make_admin_mintrud_batch_api_fixture(
            status="submitted",
            imported=True,
            submitted=True,
            external_reference=(
                "EISOT-SET-DETAIL"
            ),
        )
    )

    first = (
        make_admin_mintrud_batch_result_item_fixture(
            obligation_id=(
                "obligation-detail-1"
            ),
            position=0,
        )
    )

    second = (
        make_admin_mintrud_batch_result_item_fixture(
            obligation_id=(
                "obligation-detail-2"
            ),
            position=1,
        )
    )

    async def fake_get(
        session,
        *,
        batch_id,
    ):
        assert (
            batch_id
            == "batch-submitted"
        )

        return (
            batch,
            [
                first,
                second,
            ],
        )

    monkeypatch.setattr(
        admin_api,
        "get_mintrud_registry_submission_batch_detail",
        fake_get,
    )

    result = asyncio.run(
        admin_api.get_admin_mintrud_submission_batch_detail(
            batch_id=(
                "batch-submitted"
            ),
            _=SimpleNamespace(
                id="admin-user"
            ),
            session=SimpleNamespace(),
        )
    )

    assert (
        result.id
        == "batch-submitted"
    )

    assert len(
        result.items
    ) == 2

    assert (
        result.items[0].obligation_id
        == "obligation-detail-1"
    )

    assert (
        result.items[1].obligation_id
        == "obligation-detail-2"
    )

    assert result.reconciled_at is None


def test_mintrud_batch_result_route_commits_and_audits(
    monkeypatch,
):
    from types import SimpleNamespace

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchResultUpdate,
    )

    batch = (
        make_admin_mintrud_batch_api_fixture(
            status="submitted",
            imported=True,
            submitted=True,
            external_reference=(
                "EISOT-SET-RESULT"
            ),
        )
    )

    first = (
        make_admin_mintrud_batch_result_item_fixture(
            obligation_id=(
                "obligation-result-api-1"
            ),
            position=0,
        )
    )

    second = (
        make_admin_mintrud_batch_result_item_fixture(
            obligation_id=(
                "obligation-result-api-2"
            ),
            position=1,
        )
    )

    calls = {
        "service": None,
        "audit": None,
    }

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fake_result(
        session,
        *,
        batch_id,
        recorded_by_user_id,
        results,
    ):
        calls[
            "service"
        ] = {
            "batch_id": batch_id,
            "recorded_by_user_id": (
                recorded_by_user_id
            ),
            "results": results,
        }

        now = datetime.now(
            timezone.utc
        )

        batch.reconciled_by_user_id = (
            recorded_by_user_id
        )

        batch.reconciled_at = now

        first.result_status = (
            "accepted"
        )

        first.external_id = (
            "EXT-API-1"
        )

        first.result_recorded_by_user_id = (
            recorded_by_user_id
        )

        first.result_recorded_at = now

        second.result_status = (
            "rejected"
        )

        second.errors_json = [
            "portal rejected",
        ]

        second.result_recorded_by_user_id = (
            recorded_by_user_id
        )

        second.result_recorded_at = now

        return (
            batch,
            [
                first,
                second,
            ],
        )

    async def fake_audit(
        session,
        **kwargs,
    ):
        calls[
            "audit"
        ] = kwargs

    monkeypatch.setattr(
        admin_api,
        "record_mintrud_registry_submission_batch_result",
        fake_result,
    )

    monkeypatch.setattr(
        admin_api,
        "create_admin_audit_event",
        fake_audit,
    )

    session = FakeSession()

    payload = (
        AdminMintrudSubmissionBatchResultUpdate(
            items=[
                {
                    "obligation_id": (
                        "obligation-result-api-1"
                    ),
                    "result_status": (
                        "accepted"
                    ),
                    "external_id": (
                        "EXT-API-1"
                    ),
                    "errors": [],
                },
                {
                    "obligation_id": (
                        "obligation-result-api-2"
                    ),
                    "result_status": (
                        "rejected"
                    ),
                    "external_id": None,
                    "errors": [
                        "portal rejected",
                    ],
                },
            ]
        )
    )

    response = asyncio.run(
        admin_api.record_admin_mintrud_submission_batch_result(
            batch_id=(
                "batch-submitted"
            ),
            payload=payload,
            request=SimpleNamespace(),
            current_user=SimpleNamespace(
                id="admin-result"
            ),
            session=session,
        )
    )

    assert response.reconciled_at is not None

    assert (
        response.reconciled_by_user_id
        == "admin-result"
    )

    assert len(
        response.items
    ) == 2

    assert (
        response.items[0].result_status
        == "accepted"
    )

    assert (
        response.items[1].result_status
        == "rejected"
    )

    assert (
        calls[
            "service"
        ][
            "recorded_by_user_id"
        ]
        == "admin-result"
    )

    assert (
        calls[
            "audit"
        ][
            "action"
        ]
        == (
            "admin.mintrud_submission_batch_"
            "result_recorded"
        )
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "external_registry_io"
        ]
        is False
    )

    assert (
        calls[
            "audit"
        ][
            "payload"
        ][
            "result_counts"
        ]
        == {
            "accepted": 1,
            "rejected": 1,
        }
    )

    assert session.commit_count == 1
    assert session.rollback_count == 0


def test_mintrud_batch_result_route_maps_domain_error_to_409(
    monkeypatch,
):
    import pytest

    from types import SimpleNamespace

    from fastapi import HTTPException

    import app.api.v1.admin as admin_api
    from app.schemas.admin import (
        AdminMintrudSubmissionBatchResultUpdate,
    )

    class FakeSession:
        def __init__(self):
            self.commit_count = 0
            self.rollback_count = 0

        async def commit(self):
            self.commit_count += 1

        async def rollback(self):
            self.rollback_count += 1

    async def fail_result(
        session,
        *,
        batch_id,
        recorded_by_user_id,
        results,
    ):
        raise (
            admin_api.RegistrySubmissionBatchError(
                "batch result rejected"
            )
        )

    monkeypatch.setattr(
        admin_api,
        "record_mintrud_registry_submission_batch_result",
        fail_result,
    )

    session = FakeSession()

    payload = (
        AdminMintrudSubmissionBatchResultUpdate(
            items=[
                {
                    "obligation_id": (
                        "obligation-1"
                    ),
                    "result_status": (
                        "accepted"
                    ),
                    "external_id": None,
                    "errors": [],
                },
            ]
        )
    )

    with pytest.raises(
        HTTPException
    ) as exc_info:
        asyncio.run(
            admin_api.record_admin_mintrud_submission_batch_result(
                batch_id=(
                    "batch-submitted"
                ),
                payload=payload,
                request=SimpleNamespace(),
                current_user=SimpleNamespace(
                    id="admin-result"
                ),
                session=session,
            )
        )

    assert (
        exc_info.value.status_code
        == 409
    )

    assert (
        exc_info.value.detail
        == "batch result rejected"
    )

    assert session.commit_count == 0
    assert session.rollback_count == 1
