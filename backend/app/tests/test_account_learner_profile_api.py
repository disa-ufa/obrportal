from __future__ import annotations

import uuid

from test_account_course_detail_api import register_learner
from test_course_lessons_admin_api import login, request_json


def unique_snils() -> str:
    digits = f"{uuid.uuid4().int % 1_000_000_000:09d}"
    return f"{digits[:3]}-{digits[3:6]}-{digits[6:9]} 00"


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
            "snils": f"  {snils}  ",
            "phone": " +7 999 111-22-33 ",
            "email": " learner.profile@example.test ",
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
    assert created["phone"] == "+7 999 111-22-33"
    assert created["email"] == "learner.profile@example.test"
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
