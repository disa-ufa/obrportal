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
from app.models.frdo_registry_context import FrdoRegistryContext
from app.models.learner_profile import LearnerProfile
from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)
from app.models.user import User

from test_account_learner_profile_api import (
    unique_snils,
)


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
    with_context: bool = True,
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
                    "\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
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
                    "vocational_training"
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
                    last_name="\u0418\u0432\u0430\u043d\u043e\u0432",
                    first_name="\u0418\u0432\u0430\u043d",
                    middle_name="\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
                    birth_date=date(
                        1990,
                        1,
                        2,
                    ),
                    sex="male",
                    citizenship_country_code=(
                        "643"
                    ),
                    snils=unique_snils(),
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
                document_series="FRDO",
                document_number=(
                    "FRDO-API-"
                    + suffix[:24]
                ),
                issued_at=now.date(),
                registration_number=(
                    "REG-FRDO-"
                    + suffix[:20]
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

            await session.flush()

            if with_context:
                frdo_context = FrdoRegistryContext(
                    obligation_id=str(
                        obligation.id
                    ),
                    document_status="\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b",
                    loss_confirmation="\u041d\u0435\u0442",
                    exchange_confirmation="\u041d\u0435\u0442",
                    destruction_confirmation="\u041d\u0435\u0442",
                    study_form="\u041e\u0447\u043d\u0430\u044f",
                    funding_source="\u041f\u043b\u0430\u0442\u043d\u043e\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435",
                    education_delivery_form=(
                        "\u0432 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438"
                    ),
                    po_document_type=(
                        "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
                        "\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
                        "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
                        "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
                        "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
                    ),
                    po_program_type=(
                        "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 \u043f\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 \u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, \u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 \u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
                    ),
                    po_profession="\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f",
                    po_qualification=None,
                    dpo_professional_activity_area=None,
                    dpo_enlarged_specialty_group=None,
                    dpo_qualification=None,
                    prior_education_snapshot_json=None,
                    original_document_snapshot_json=None,
                )

                session.add(
                    frdo_context
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


def test_frdo_admin_context_write_api() -> None:
    editable = create_frdo_fixture(
        with_profile=True,
        with_context=False,
    )

    approved = create_frdo_fixture(
        with_profile=True,
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
            "frdo/obligations/"
            + editable[
                "obligation_id"
            ]
            + "/context"
        )

        complete_payload = {
            "document_status": (
                "  Original  "
            ),
            "loss_confirmation": (
                "  No  "
            ),
            "exchange_confirmation": (
                "  No  "
            ),
            "destruction_confirmation": (
                "  No  "
            ),
            "study_form": (
                "  Full-time  "
            ),
            "funding_source": (
                "  Paid  "
            ),
            "education_delivery_form": (
                "  In organization  "
            ),
            "po_document_type": (
                "  \u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
                "\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
                "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
                "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
                "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e  "
            ),
            "po_program_type": (
                "  Initial training  "
            ),
            "po_profession": (
                "  \u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f  "
            ),
            "po_qualification": (
                "  1  "
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
        assert (
            created["id"]
            == editable[
                "obligation_id"
            ]
        )
        assert (
            created["status"]
            == "ready"
        )
        assert (
            created[
                "readiness_errors"
            ]
            == []
        )

        context = created[
            "frdo_context"
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
                "document_status"
            ]
            == "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b"
        )
        assert (
            context[
                "po_program_type"
            ]
            == (
                "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 "
                "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 "
                "\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 "
                "\u043f\u043e \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
                "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
                "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
                "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
            )
        )
        assert (
            context[
                "po_profession"
            ]
            == "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c \u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
        )
        assert (
            context[
                "po_qualification"
            ]
            == "1"
        )

        status_code, partial = (
            request_json(
                "PATCH",
                context_path,
                {
                    "po_qualification": (
                        "  2  "
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 200
        assert (
            partial[
                "frdo_context"
            ][
                "id"
            ]
            == first_context_id
        )
        assert (
            partial[
                "frdo_context"
            ][
                "po_qualification"
            ]
            == "2"
        )
        assert (
            partial["status"]
            == "ready"
        )

        status_code, cleared = (
            request_json(
                "PATCH",
                context_path,
                {
                    "po_profession": None,
                },
                token=admin_token,
            )
        )

        assert status_code == 200
        assert (
            cleared[
                "frdo_context"
            ][
                "id"
            ]
            == first_context_id
        )
        assert (
            cleared[
                "frdo_context"
            ][
                "po_profession"
            ]
            is None
        )
        assert (
            cleared["status"]
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
            "frdo.po.profession_missing"
            in cleared_codes
        )

        status_code, restored = (
            request_json(
                "PATCH",
                context_path,
                {
                    "po_profession": (
                        "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
                        "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 200
        assert (
            restored["status"]
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
                "frdo_context"
            ][
                "id"
            ]
            == first_context_id
        )

        actions = (
            get_frdo_audit_actions(
                editable[
                    "obligation_id"
                ]
            )
        )

        assert (
            "admin.frdo_context_updated"
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

        status_code, too_long = (
            request_json(
                "PATCH",
                context_path,
                {
                    "po_profession": (
                        "X" * 513
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 422
        assert isinstance(
            too_long,
            dict,
        )

        status_code, forbidden = (
            request_json(
                "PATCH",
                context_path,
                {
                    "po_profession": (
                        "Forbidden"
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
            "frdo/obligations/"
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
                    "po_profession": (
                        "Should not write"
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
            "frdo/obligations/"
            "00000000-0000-0000-"
            "0000-000000000000/"
            "context"
        )

        status_code, missing = (
            request_json(
                "PATCH",
                missing_path,
                {
                    "po_profession": (
                        "Missing"
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
        cleanup_frdo_fixtures(
            fixtures
        )

def test_frdo_approved_document_legal_change_invalidates_approval() -> None:
    import httpx

    from app.services.compliance_registry_approval import (
        APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED,
    )

    fixture = create_frdo_fixture(
        with_profile=True,
        with_context=True,
        obligation_status="needs_approval",
    )

    async def read_obligation_state() -> dict:
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
                    RegistryObligation
                ).where(
                    RegistryObligation.id
                    == fixture[
                        "obligation_id"
                    ]
                )
            )

            obligation = (
                result.scalar_one()
            )

            state = {
                "status": obligation.status,
                "approved_by_user_id": (
                    str(
                        obligation.approved_by_user_id
                    )
                    if obligation.approved_by_user_id
                    else None
                ),
                "approved_at": (
                    obligation.approved_at
                ),
                "approval_snapshot_json": (
                    obligation.approval_snapshot_json
                ),
                "approval_fingerprint": (
                    obligation.approval_fingerprint
                ),
                "approval_invalidated_at": (
                    obligation.approval_invalidated_at
                ),
                "approval_invalidation_reason": (
                    obligation.approval_invalidation_reason
                ),
            }

        await engine.dispose()

        return state

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        approve_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + fixture[
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
        assert isinstance(
            approved,
            dict,
        )

        assert (
            approved["status"]
            == "approved"
        )

        before = asyncio.run(
            read_obligation_state()
        )

        assert (
            before["status"]
            == "approved"
        )

        assert (
            before[
                "approved_by_user_id"
            ]
            is not None
        )

        assert (
            before[
                "approved_at"
            ]
            is not None
        )

        assert (
            before[
                "approval_snapshot_json"
            ]
            is not None
        )

        assert (
            before[
                "approval_fingerprint"
            ]
            is not None
        )

        assert (
            before[
                "approval_invalidated_at"
            ]
            is None
        )

        assert (
            before[
                "approval_invalidation_reason"
            ]
            is None
        )

        response = httpx.patch(
            (
                BASE_URL
                + "/api/v1/admin/documents/"
                + fixture[
                    "document_id"
                ]
            ),
            headers={
                "Authorization": (
                    "Bearer "
                    + admin_token
                ),
            },
            data={
                "document_series": (
                    "FRDO-CHANGED"
                ),
            },
            timeout=20.0,
        )

        assert (
            response.status_code
            == 200
        )

        updated_document = (
            response.json()
        )

        assert (
            updated_document[
                "document_series"
            ]
            == "FRDO-CHANGED"
        )

        after = asyncio.run(
            read_obligation_state()
        )

        assert (
            after["status"]
            == "needs_approval"
        )

        assert (
            after[
                "approval_invalidated_at"
            ]
            is not None
        )

        assert (
            after[
                "approval_invalidation_reason"
            ]
            == (
                APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED
            )
        )

        assert (
            after[
                "approved_by_user_id"
            ]
            == before[
                "approved_by_user_id"
            ]
        )

        assert (
            after[
                "approved_at"
            ]
            == before[
                "approved_at"
            ]
        )

        assert (
            after[
                "approval_snapshot_json"
            ]
            == before[
                "approval_snapshot_json"
            ]
        )

        assert (
            after[
                "approval_fingerprint"
            ]
            == before[
                "approval_fingerprint"
            ]
        )

    finally:
        cleanup_frdo_fixtures(
            [
                fixture,
            ]
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
                artifact_kind=(
                    "portal-upload-artifact"
                ),
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


def test_frdo_admin_submission_attempt_download() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
        obligation_status="approved",
    )

    other_fixture = create_frdo_fixture(
        with_profile=True,
        obligation_status="approved",
    )

    artifact_path = None
    other_artifact_path = None

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_frdo_exported_attempt(
            fixture
        )

        (
            other_attempt_id,
            other_artifact_path,
        ) = prepare_frdo_exported_attempt(
            other_fixture
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
            == b"frdo-manual-submission-test"
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

        wrong_pair_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + fixture[
                "obligation_id"
            ]
            + "/attempts/"
            + other_attempt_id
            + "/download"
        )

        (
            status_code,
            _body,
            _headers,
        ) = request_bytes(
            "GET",
            wrong_pair_path,
            token=admin_token,
        )

        assert (
            status_code
            == 404
        )

        missing_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
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
            b"tampered-frdo-artifact"
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
        delete_frdo_test_artifact(
            artifact_path
        )

        delete_frdo_test_artifact(
            other_artifact_path
        )

        cleanup_frdo_fixtures(
            [
                fixture,
                other_fixture,
            ]
        )



def get_frdo_attempt_artifact_path(
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



def get_frdo_obligation_approval_fingerprint(
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


def test_frdo_admin_export_preparation_api() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
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
            "frdo/obligations/"
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
            get_frdo_obligation_approval_fingerprint(
                obligation_id
            )
        )

        assert approval_fingerprint is not None
        assert len(approval_fingerprint) == 64

        export_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
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

        assert attempt[
            "attempt_no"
        ] == 1

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

        assert (
            attempt[
                "errors_json"
            ]
            == []
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
            == "frdo"
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
                "obligation"
            ][
                "document_id"
            ]
            == fixture[
                "document_id"
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
            == "registry-approval-frdo-v2"
        )

        attempt_id = attempt["id"]

        artifact_path = (
            get_frdo_attempt_artifact_path(
                attempt_id
            )
        )

        assert artifact_path is not None
        assert artifact_path.endswith(
            ".json"
        )

        attempts_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
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
            "frdo/obligations/"
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
            get_frdo_attempt_artifact_path(
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
            get_frdo_audit_actions(
                obligation_id
            )
        )

        assert (
            "admin.frdo_registry_"
            "export_prepared"
            in actions
        )

    finally:
        delete_frdo_test_artifact(
            artifact_path
        )

        delete_frdo_test_artifact(
            second_artifact_path
        )

        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )



def test_frdo_rework_api_contract() -> None:
    rejected = create_frdo_fixture(
        with_profile=True,
        obligation_status="rejected",
    )

    correction = create_frdo_fixture(
        with_profile=True,
        obligation_status="correction_required",
    )

    invalid = create_frdo_fixture(
        with_profile=True,
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
                "/api/v1/admin/frdo/obligations/"
                + rejected["obligation_id"]
                + "/reopen"
            ),
            token=admin_token,
        )

        assert status_code == 200
        assert reopened["id"] == rejected["obligation_id"]
        assert reopened["registry"] == "frdo"
        assert reopened["status"] == "pending_data"
        assert reopened["readiness_errors"] == []
        assert reopened["submitted_at"] is None
        assert reopened["accepted_at"] is None
        assert reopened["external_id"] is None
        assert reopened["last_error"] is None

        status_code, correction_reopened = request_json(
            "POST",
            (
                "/api/v1/admin/frdo/obligations/"
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
                "/api/v1/admin/frdo/obligations/"
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
                "/api/v1/admin/frdo/obligations/"
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
                "/api/v1/admin/frdo/obligations/"
                "00000000-0000-0000-"
                "0000-000000000000/reopen"
            ),
            token=admin_token,
        )

        assert status_code == 404
        assert isinstance(missing, dict)

    finally:
        cleanup_frdo_fixtures(
            fixtures
        )



def count_frdo_registry_submission_attempts(
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


def test_frdo_portal_artifact_working_reference_xlsx_contract() -> None:
    from hashlib import sha256

    from app.services.compliance_registry_contract import (
        PROGRAM_TYPE_VOCATIONAL_TRAINING,
    )
    from app.services.frdo_po_portal_contract import (
        FRDO_PO_TEMPLATE_CONTRACT_VERSION,
        read_verified_frdo_po_template_bytes,
    )
    from app.services.frdo_po_xlsx_validator import (
        validate_frdo_po_xlsx,
    )

    fixture = create_frdo_fixture(
        with_profile=True,
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

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 0
        )

        approve_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
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
            get_frdo_obligation_approval_fingerprint(
                obligation_id
            )
        )

        assert approval_fingerprint is not None
        assert len(
            approval_fingerprint
        ) == 64

        portal_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
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
            count_frdo_registry_submission_attempts(
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
            attempt["obligation_id"]
            == obligation_id
        )

        assert (
            attempt["attempt_no"]
            == 1
        )

        assert (
            attempt["artifact_kind"]
            == "portal-upload-artifact"
        )

        assert (
            attempt["transport"]
            == "file"
        )

        assert (
            attempt["schema_version"]
            == FRDO_PO_TEMPLATE_CONTRACT_VERSION
        )

        assert (
            attempt["has_artifact"]
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
            attempt["submitted_at"]
            is None
        )
        assert (
            attempt["result_status"]
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
            snapshot["registry"]
            == "frdo"
        )

        artifact_path = (
            get_frdo_attempt_artifact_path(
                attempt["id"]
            )
        )

        assert artifact_path is not None
        assert artifact_path.endswith(
            ".xlsx"
        )

        download_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + obligation_id
            + "/attempts/"
            + attempt["id"]
            + "/download"
        )

        (
            download_status,
            xlsx_content,
            headers,
        ) = request_bytes(
            "GET",
            download_path,
            token=admin_token,
        )

        assert download_status == 200
        assert isinstance(
            xlsx_content,
            bytes,
        )
        assert xlsx_content.startswith(
            b"PK"
        )

        assert (
            sha256(
                xlsx_content
            ).hexdigest()
            == artifact_sha256
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
            ".xlsx"
            in disposition.lower()
        )

        validate_frdo_po_xlsx(
            content=xlsx_content,
            approval_snapshot=snapshot,
            template_bytes=(
                read_verified_frdo_po_template_bytes(
                    program_type=(
                        PROGRAM_TYPE_VOCATIONAL_TRAINING
                    ),
                )
            ),
        )

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 1
        )

        status_code, attempts = (
            request_json(
                "GET",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    + obligation_id
                    + "/attempts"
                ),
                token=admin_token,
            )
        )

        assert status_code == 200
        assert isinstance(
            attempts,
            list,
        )
        assert len(
            attempts
        ) == 1
        assert (
            attempts[0]["id"]
            == attempt["id"]
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

                    return obligation.status
            finally:
                await engine.dispose()

        assert (
            asyncio.run(
                _read_status()
            )
            == "exported"
        )

        status_code, missing = (
            request_json(
                "POST",
                (
                    "/api/v1/admin/"
                    "frdo/obligations/"
                    "00000000-0000-0000-"
                    "0000-000000000000/"
                    "portal-artifact"
                ),
                token=admin_token,
            )
        )

        assert status_code == 404
        assert isinstance(
            missing,
            dict,
        )

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 1
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


def test_frdo_portal_artifact_training_reference_gap_returns_409_without_attempt() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
        obligation_status="pending_data",
    )

    try:
        admin_token = login(
            ADMIN_EMAIL,
            ADMIN_PASSWORD,
        )

        obligation_id = fixture[
            "obligation_id"
        ]

        context_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + obligation_id
            + "/context"
        )

        status_code, updated = (
            request_json(
                "PATCH",
                context_path,
                {
                    "po_document_type": (
                        "\u0421\u043f\u0440\u0430\u0432\u043a\u0430 "
                        "\u043e\u0431 "
                        "\u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438"
                    ),
                },
                token=admin_token,
            )
        )

        assert status_code == 200
        assert isinstance(
            updated,
            dict,
        )
        assert (
            updated["status"]
            == "ready"
        )

        approve_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
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

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 0
        )

        portal_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + obligation_id
            + "/portal-artifact"
        )

        status_code, rejected = (
            request_json(
                "POST",
                portal_path,
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
        )

        assert (
            "training_reference_"
            "art_preprofessional_profession"
            in detail
        )

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 0
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
                    obligation = await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == obligation_id
                        )
                    )

                    assert obligation is not None

                    return obligation.status
            finally:
                await engine.dispose()

        assert (
            asyncio.run(
                _read_status()
            )
            == "approved"
        )

        actions = get_frdo_audit_actions(
            obligation_id
        )

        assert (
            "admin.frdo_portal_artifact_prepared"
            not in actions
        )

    finally:
        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )


def test_frdo_portal_artifact_rejects_stale_approval_without_attempt() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
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
            "frdo/obligations/"
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
                        + " stale portal"
                    )

                    await session.commit()

            finally:
                await engine.dispose()

        asyncio.run(
            _make_current_data_stale()
        )

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 0
        )

        portal_path = (
            "/api/v1/admin/"
            "frdo/obligations/"
            + obligation_id
            + "/portal-artifact"
        )

        status_code, rejected = (
            request_json(
                "POST",
                portal_path,
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

        assert (
            count_frdo_registry_submission_attempts(
                obligation_id
            )
            == 0
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
                    obligation = await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == obligation_id
                        )
                    )

                    assert obligation is not None

                    return obligation.status
            finally:
                await engine.dispose()

        assert (
            asyncio.run(
                _read_status()
            )
            == "approved"
        )

        actions = get_frdo_audit_actions(
            obligation_id
        )

        assert (
            "admin.frdo_portal_artifact_prepared"
            not in actions
        )

    finally:
        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )


def test_frdo_internal_export_rejects_stale_approval() -> None:
    fixture = create_frdo_fixture(
        with_profile=True,
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
            "frdo/obligations/"
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
            "frdo/obligations/"
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

        actions = get_frdo_audit_actions(
            obligation_id
        )

        assert (
            "admin.frdo_registry_"
            "export_prepared"
            not in actions
        )

    finally:
        cleanup_frdo_fixtures(
            [
                fixture,
            ]
        )
