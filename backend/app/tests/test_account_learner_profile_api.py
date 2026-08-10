from __future__ import annotations

import json
import uuid

from test_account_course_detail_api import register_learner
from test_course_lessons_admin_api import (
    ADMIN_EMAIL,
    ADMIN_PASSWORD,
    login,
    request_json,
)


def unique_snils() -> str:
    number = 100_000_000 + (
        uuid.uuid4().int % 900_000_000
    )
    number_digits = f"{number:09d}"
    weighted_sum = sum(
        int(digit) * weight
        for digit, weight in zip(
            number_digits,
            range(9, 0, -1),
        )
    )
    remainder = weighted_sum % 101
    control_number = 0 if remainder == 100 else remainder

    return (
        f"{number_digits[:3]}-"
        f"{number_digits[3:6]}-"
        f"{number_digits[6:9]} "
        f"{control_number:02d}"
    )


def learner_token(prefix: str) -> tuple[dict, str]:
    learner = register_learner(prefix=prefix)
    token = login(learner["email"], learner["password"])
    return learner, token


def test_account_profile_get_is_non_mutating_and_patch_upserts_profile() -> None:
    learner, token = learner_token("account-profile-upsert")

    status, initial = request_json(
        "GET",
        "/api/v1/account/profile",
        token=token,
    )
    assert status == 200
    assert isinstance(initial, dict)
    assert initial["id"] is None
    assert initial["user_id"] == str(learner["response"]["id"])
    assert initial["last_name"] is None
    assert initial["first_name"] is None
    assert initial["snils"] is None
    assert initial["identity_document_status"] == "not_provided"
    assert initial["education_document_status"] == "not_provided"

    snils = unique_snils()

    status, created = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "  Иванов  ",
            "first_name": " Иван ",
            "middle_name": " Иванович ",
            "birth_date": "1990-05-17",
            "snils": f"  {snils.replace('-', '').replace(' ', '')}  ",
            "phone": " 8 (999) 111-22-33 ",
            "email": " LEARNER.PROFILE@EXAMPLE.COM ",
            "identity_document_type": " Паспорт РФ ",
            "identity_document_series": " 80 01 ",
            "identity_document_number": " 123456 ",
            "identity_document_issued_by": " МВД России ",
            "identity_document_issued_at": "2010-06-10",
            "identity_document_department_code": " 020-001 ",
        },
        token=token,
    )
    assert status == 200
    assert isinstance(created, dict)
    assert created["id"]
    assert created["user_id"] == str(learner["response"]["id"])
    assert created["last_name"] == "Иванов"
    assert created["first_name"] == "Иван"
    assert created["middle_name"] == "Иванович"
    assert created["birth_date"] == "1990-05-17"
    assert created["snils"] == snils
    assert created["phone"] == "+79991112233"
    assert created["email"] == "learner.profile@example.com"
    assert created["identity_document_type"] == "Паспорт РФ"
    assert created["identity_document_series"] == "80 01"
    assert created["identity_document_number"] == "123456"
    assert created["identity_document_issued_by"] == "МВД России"
    assert created["identity_document_issued_at"] == "2010-06-10"
    assert created["identity_document_department_code"] == "020-001"
    assert created["source"] == "self_service"

    status, fetched = request_json(
        "GET",
        "/api/v1/account/profile",
        token=token,
    )
    assert status == 200
    assert fetched == created

    status, updated = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "middle_name": None,
            "identity_document_issued_by": "  МВД по РБ  ",
        },
        token=token,
    )
    assert status == 200
    assert updated["id"] == created["id"]
    assert updated["middle_name"] is None
    assert updated["identity_document_issued_by"] == "МВД по РБ"


def test_account_profile_is_scoped_to_authenticated_user() -> None:
    first, first_token = learner_token("account-profile-first")
    second, second_token = learner_token("account-profile-second")

    status, first_profile = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "Первый",
            "first_name": "Слушатель",
            "snils": unique_snils(),
        },
        token=first_token,
    )
    assert status == 200

    status, second_initial = request_json(
        "GET",
        "/api/v1/account/profile",
        token=second_token,
    )
    assert status == 200
    assert second_initial["user_id"] == str(second["response"]["id"])
    assert second_initial["id"] is None
    assert second_initial["last_name"] is None
    assert second_initial["snils"] is None

    status, first_again = request_json(
        "GET",
        "/api/v1/account/profile",
        token=first_token,
    )
    assert status == 200
    assert first_again["user_id"] == str(first["response"]["id"])
    assert first_again["id"] == first_profile["id"]
    assert first_again["last_name"] == "Первый"


def test_account_profile_duplicate_snils_returns_conflict() -> None:
    _, first_token = learner_token("account-profile-snils-first")
    _, second_token = learner_token("account-profile-snils-second")
    snils = unique_snils()

    status, first_profile = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "Первый",
            "first_name": "Слушатель",
            "snils": snils,
        },
        token=first_token,
    )
    assert status == 200
    assert first_profile["snils"] == snils

    status, conflict = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "Второй",
            "first_name": "Слушатель",
            "snils": snils,
        },
        token=second_token,
    )
    assert status == 409
    assert isinstance(conflict, dict)
    assert "SNILS" in str(conflict.get("detail", ""))


def test_account_profile_rejects_invalid_identity_formats() -> None:
    _, token = learner_token("account-profile-validation")

    invalid_payloads = [
        (
            {"snils": "123"},
            "SNILS",
        ),
        (
            {"snils": "12345678901"},
            "SNILS",
        ),
        (
            {"email": "not-an-email"},
            "email",
        ),
        (
            {"phone": "abc"},
            "phone",
        ),
    ]

    for payload, detail_fragment in invalid_payloads:
        status, response = request_json(
            "PATCH",
            "/api/v1/account/profile",
            payload,
            token=token,
        )
        assert status == 422
        assert isinstance(response, dict)
        assert detail_fragment.lower() in str(
            response.get("detail", "")
        ).lower()

    status, profile = request_json(
        "GET",
        "/api/v1/account/profile",
        token=token,
    )
    assert status == 200
    assert profile["id"] is None


def test_account_profile_audit_contains_only_changed_field_names() -> None:
    learner, token = learner_token("account-profile-audit")
    snils = unique_snils()

    status, profile = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "Иванов",
            "first_name": "Иван",
            "snils": snils,
            "identity_document_type": "Паспорт РФ",
            "identity_document_series": "80 01",
            "identity_document_number": "123456",
            "identity_document_issued_by": "МВД России",
        },
        token=token,
    )
    assert status == 200
    assert profile["id"]

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    status, events = request_json(
        "GET",
        (
            "/api/v1/admin/audit-events"
            "?action=account.learner_profile_created"
            "&entity_type=learner_profile"
            f"&entity_id={profile['id']}"
        ),
        token=admin_token,
    )
    assert status == 200
    assert isinstance(events, list)

    event = next(
        item
        for item in events
        if (
            item["actor_user_id"]
            == str(learner["response"]["id"])
        )
    )

    assert event["action"] == "account.learner_profile_created"
    assert event["entity_type"] == "learner_profile"
    assert event["entity_id"] == profile["id"]
    assert event["payload"]["profile_created"] is True
    assert event["payload"]["changed_fields"] == sorted(
        [
            "first_name",
            "identity_document_issued_by",
            "identity_document_number",
            "identity_document_series",
            "identity_document_type",
            "last_name",
            "snils",
        ]
    )

    audit_payload_text = json.dumps(
        event["payload"],
        ensure_ascii=False,
    )

    for sensitive_value in (
        "Иванов",
        "Иван",
        snils,
        "Паспорт РФ",
        "80 01",
        "123456",
        "МВД России",
    ):
        assert sensitive_value not in audit_payload_text


def test_account_profile_noop_patch_does_not_create_extra_audit_event() -> None:
    learner, token = learner_token("account-profile-noop")

    status, profile = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "Иванов",
            "first_name": "Иван",
        },
        token=token,
    )
    assert status == 200

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    def count_events() -> int:
        audit_status, events = request_json(
            "GET",
            (
                "/api/v1/admin/audit-events"
                "?entity_type=learner_profile"
                f"&entity_id={profile['id']}"
            ),
            token=admin_token,
        )
        assert audit_status == 200
        assert isinstance(events, list)
        return sum(
            item["actor_user_id"]
            == str(learner["response"]["id"])
            for item in events
        )

    before_count = count_events()

    status, unchanged = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "  Иванов  ",
            "first_name": "Иван",
        },
        token=token,
    )
    assert status == 200
    assert unchanged["id"] == profile["id"]

    after_count = count_events()
    assert after_count == before_count


def test_account_profile_rejects_system_managed_fields() -> None:
    _, token = learner_token("account-profile-forbidden-fields")

    for field_name, value in (
        ("identity_document_status", "verified"),
        ("education_document_status", "verified"),
        ("personal_data_basis", "manual"),
        ("source", "manual"),
        ("notes", "should not be writable"),
    ):
        status, response = request_json(
            "PATCH",
            "/api/v1/account/profile",
            {
                field_name: value,
            },
            token=token,
        )
        assert status == 422
        assert isinstance(response, dict)

    status, profile = request_json(
        "GET",
        "/api/v1/account/profile",
        token=token,
    )
    assert status == 200
    assert profile["id"] is None


def test_account_profile_update_audit_contains_only_changed_field_names() -> None:
    learner, token = learner_token("account-profile-update-audit")

    status, profile = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "last_name": "Иванов",
            "first_name": "Иван",
        },
        token=token,
    )
    assert status == 200

    status, updated = request_json(
        "PATCH",
        "/api/v1/account/profile",
        {
            "phone": "8 (999) 222-33-44",
            "identity_document_number": "654321",
        },
        token=token,
    )
    assert status == 200
    assert updated["phone"] == "+79992223344"
    assert updated["identity_document_number"] == "654321"

    admin_token = login(ADMIN_EMAIL, ADMIN_PASSWORD)

    status, events = request_json(
        "GET",
        (
            "/api/v1/admin/audit-events"
            "?action=account.learner_profile_updated"
            "&entity_type=learner_profile"
            f"&entity_id={profile['id']}"
        ),
        token=admin_token,
    )
    assert status == 200
    assert isinstance(events, list)

    event = next(
        item
        for item in events
        if (
            item["actor_user_id"]
            == str(learner["response"]["id"])
        )
    )

    assert event["payload"]["profile_created"] is False
    assert event["payload"]["changed_fields"] == [
        "identity_document_number",
        "phone",
    ]

    audit_payload_text = json.dumps(
        event["payload"],
        ensure_ascii=False,
    )
    assert "+79992223344" not in audit_payload_text
    assert "654321" not in audit_payload_text
