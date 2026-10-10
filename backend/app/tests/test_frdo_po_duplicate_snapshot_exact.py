from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
)
from app.services.compliance_registry_readiness import (
    evaluate_registry_readiness,
)


WORKER_CERTIFICATE = (
    "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
    "\u043e "
    "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
    "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
    "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
    "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
)

DRIVER = (
    "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
    "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
)


def enrollment():
    return SimpleNamespace(
        id="enrollment-1",
        status="completed",
        started_at=datetime(
            2026,
            1,
            10,
            tzinfo=timezone.utc,
        ),
        completed_at=datetime(
            2026,
            8,
            20,
            tzinfo=timezone.utc,
        ),
    )


def course():
    return SimpleNamespace(
        title="PO test",
        regulatory_program_type=(
            "vocational_training"
        ),
        hours=40,
    )


def learner():
    return SimpleNamespace(
        id="learner-1",
        full_name=(
            "\u0418\u0432\u0430\u043d\u043e\u0432 "
            "\u0418\u0432\u0430\u043d "
            "\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
        ),
    )


def profile():
    return SimpleNamespace(
        last_name="\u0418\u0432\u0430\u043d\u043e\u0432",
        first_name="\u0418\u0432\u0430\u043d",
        middle_name="\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
        birth_date=date(
            1990,
            1,
            2,
        ),
        sex="male",
        citizenship_country_code="643",
        snils="112-233-445 95",
    )


def document():
    return SimpleNamespace(
        enrollment_id="enrollment-1",
        document_series="AA",
        document_number="000001",
        document_type="Certificate",
        issued_at=date(
            2026,
            9,
            1,
        ),
        registration_number="1548",
        revoked_at=None,
    )


def valid_original_snapshot(
    issue_date="2025-01-01",
):
    return {
        "document_type": WORKER_CERTIFICATE,
        "document_series": "AA",
        "document_number": "000001",
        "registration_number": "1548",
        "issue_date": issue_date,
        "recipient_last_name": (
            "\u0418\u0432\u0430\u043d\u043e\u0432"
        ),
        "recipient_first_name": (
            "\u0418\u0432\u0430\u043d"
        ),
        "recipient_middle_name": (
            "\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
        ),
    }


def context(
    snapshot,
):
    return SimpleNamespace(
        document_status="Duplicate",
        loss_confirmation="No",
        exchange_confirmation="No",
        destruction_confirmation="No",
        study_form="Full-time",
        funding_source="Paid",
        education_delivery_form=(
            "In organization"
        ),
        po_document_type=WORKER_CERTIFICATE,
        po_program_type="Initial training",
        po_profession=DRIVER,
        po_qualification=None,
        dpo_professional_activity_area=None,
        dpo_enlarged_specialty_group=None,
        dpo_qualification=None,
        prior_education_snapshot_json=None,
        original_document_snapshot_json=(
            snapshot
        ),
    )


def evaluate(
    snapshot,
):
    return evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=enrollment(),
        course=course(),
        learner=learner(),
        learner_profile=profile(),
        document=document(),
        frdo_context=context(
            snapshot
        ),
    )


def test_duplicate_exact_baseline_is_ready():
    result = evaluate(
        valid_original_snapshot()
    )

    assert result.is_ready is True
    assert result.error_codes == ()


def test_duplicate_accepts_instruction_date_format():
    result = evaluate(
        valid_original_snapshot(
            issue_date="01.01.2025",
        )
    )

    assert result.is_ready is True


def test_duplicate_accepts_internal_date_object():
    result = evaluate(
        valid_original_snapshot(
            issue_date=date(
                2025,
                1,
                1,
            ),
        )
    )

    assert result.is_ready is True


def test_duplicate_rejects_unsupported_document_type():
    snapshot = valid_original_snapshot()

    snapshot[
        "document_type"
    ] = "Unsupported"

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "document_type_unsupported"
        in result.error_codes
    )


def test_duplicate_series_limit_and_characters():
    too_long = valid_original_snapshot()
    too_long[
        "document_series"
    ] = "A" * 21

    result = evaluate(
        too_long
    )

    assert (
        "frdo.original_document."
        "document_series_too_long"
        in result.error_codes
    )

    invalid = valid_original_snapshot()
    invalid[
        "document_series"
    ] = "AA@"

    result = evaluate(
        invalid
    )

    assert (
        "frdo.original_document."
        "document_series_invalid"
        in result.error_codes
    )


def test_duplicate_number_digits_and_limit():
    invalid = valid_original_snapshot()
    invalid[
        "document_number"
    ] = "12A"

    result = evaluate(
        invalid
    )

    assert (
        "frdo.original_document."
        "document_number_invalid"
        in result.error_codes
    )

    too_long = valid_original_snapshot()
    too_long[
        "document_number"
    ] = "1" * 21

    result = evaluate(
        too_long
    )

    assert (
        "frdo.original_document."
        "document_number_too_long"
        in result.error_codes
    )


def test_duplicate_registration_rules():
    invalid = valid_original_snapshot()
    invalid[
        "registration_number"
    ] = "REG@"

    result = evaluate(
        invalid
    )

    assert (
        "frdo.original_document."
        "registration_number_invalid"
        in result.error_codes
    )

    too_long = valid_original_snapshot()
    too_long[
        "registration_number"
    ] = "R" * 21

    result = evaluate(
        too_long
    )

    assert (
        "frdo.original_document."
        "registration_number_too_long"
        in result.error_codes
    )


def test_duplicate_rejects_invalid_issue_date():
    snapshot = valid_original_snapshot()

    snapshot[
        "issue_date"
    ] = "2025/01/01"

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "issue_date_invalid"
        in result.error_codes
    )


def test_duplicate_original_names_must_be_cyrillic():
    snapshot = valid_original_snapshot()

    snapshot[
        "recipient_first_name"
    ] = "Ivan"

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "recipient_first_name_invalid"
        in result.error_codes
    )


def test_duplicate_original_name_limit_50():
    snapshot = valid_original_snapshot()

    snapshot[
        "recipient_last_name"
    ] = "\u0410" * 51

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "recipient_last_name_too_long"
        in result.error_codes
    )


def test_duplicate_original_middle_name_no_marker_valid():
    snapshot = valid_original_snapshot()

    snapshot[
        "recipient_middle_name"
    ] = "\u041d\u0435\u0442"

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "recipient_middle_name_invalid"
        not in result.error_codes
    )

    assert result.is_ready is True


def test_duplicate_still_requires_all_eight_fields():
    snapshot = valid_original_snapshot()

    del snapshot[
        "registration_number"
    ]

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "registration_number_missing"
        in result.error_codes
    )


def test_duplicate_registration_number_rejects_numero_sign():
    snapshot = valid_original_snapshot()

    snapshot[
        "registration_number"
    ] = "REG\u21161"

    result = evaluate(
        snapshot
    )

    assert (
        "frdo.original_document."
        "registration_number_invalid"
        in result.error_codes
    )
