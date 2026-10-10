from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace

from app.services.compliance_registry_contract import (
    REGISTRY_FRDO,
)
from app.services.compliance_registry_readiness import (
    evaluate_registry_readiness,
)


PO_WORKER_CERTIFICATE = (
    "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
    "\u043e "
    "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 "
    "\u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
    "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 "
    "\u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
)

PO_TRAINING_REFERENCE = (
    "\u0421\u043f\u0440\u0430\u0432\u043a\u0430 "
    "\u043e\u0431 "
    "\u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0438"
)

PO_DRIVER = (
    "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
    "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
)


def make_enrollment(
    *,
    year: int,
):
    return SimpleNamespace(
        id="enrollment-1",
        status="completed",
        started_at=datetime(
            year,
            1,
            10,
            tzinfo=timezone.utc,
        ),
        completed_at=datetime(
            year,
            8,
            20,
            tzinfo=timezone.utc,
        ),
    )


def make_course():
    return SimpleNamespace(
        title="PO test",
        regulatory_program_type="vocational_training",
        hours=40,
    )


def make_learner():
    return SimpleNamespace(
        id="learner-1",
        full_name=(
            "\u0418\u0432\u0430\u043d\u043e\u0432 "
            "\u0418\u0432\u0430\u043d "
            "\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
        ),
    )


def make_profile(
    *,
    citizenship: str | None,
    snils: str | None,
):
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
        citizenship_country_code=citizenship,
        snils=snils,
    )


def make_document(
    *,
    issued_at: date,
    series: str | None,
    number: str | None,
):
    return SimpleNamespace(
        enrollment_id="enrollment-1",
        document_series=series,
        document_number=number,
        document_type="Certificate",
        issued_at=issued_at,
        registration_number="REG-1",
        revoked_at=None,
    )


def make_context(
    *,
    po_document_type: str,
    post_2021_fields: bool,
):
    return SimpleNamespace(
        document_status="Original",
        loss_confirmation="No",
        exchange_confirmation="No",
        destruction_confirmation="No",
        study_form=(
            "Full-time"
            if post_2021_fields
            else None
        ),
        funding_source=(
            "Paid"
            if post_2021_fields
            else None
        ),
        education_delivery_form=(
            "In organization"
            if post_2021_fields
            else None
        ),
        po_document_type=po_document_type,
        po_program_type=None,
        po_profession=PO_DRIVER,
        po_qualification=None,
        dpo_professional_activity_area=None,
        dpo_enlarged_specialty_group=None,
        dpo_qualification=None,
        prior_education_snapshot_json=None,
        original_document_snapshot_json=None,
    )


def evaluate(
    *,
    year: int,
    issued_at: date,
    citizenship: str | None,
    snils: str | None,
    series: str | None,
    number: str | None,
    po_document_type: str,
    post_2021_fields: bool,
):
    return evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=make_enrollment(
            year=year,
        ),
        course=make_course(),
        learner=make_learner(),
        learner_profile=make_profile(
            citizenship=citizenship,
            snils=snils,
        ),
        document=make_document(
            issued_at=issued_at,
            series=series,
            number=number,
        ),
        frdo_context=make_context(
            po_document_type=po_document_type,
            post_2021_fields=post_2021_fields,
        ),
    )


def test_po_training_reference_allows_blank_series_and_number() -> None:
    result = evaluate(
        year=2026,
        issued_at=date(
            2026,
            9,
            1,
        ),
        citizenship="643",
        snils="112-233-445 95",
        series=None,
        number=None,
        po_document_type=PO_TRAINING_REFERENCE,
        post_2021_fields=True,
    )

    assert result.is_ready is True

    assert (
        "document.series_missing"
        not in result.error_codes
    )

    assert (
        "document.number_missing"
        not in result.error_codes
    )


def test_po_worker_certificate_still_requires_series() -> None:
    result = evaluate(
        year=2026,
        issued_at=date(
            2026,
            9,
            1,
        ),
        citizenship="643",
        snils="112-233-445 95",
        series=None,
        number="000001",
        po_document_type=PO_WORKER_CERTIFICATE,
        post_2021_fields=True,
    )

    assert result.is_ready is False
    assert "document.series_missing" in result.error_codes


def test_po_worker_certificate_still_requires_number() -> None:
    result = evaluate(
        year=2026,
        issued_at=date(
            2026,
            9,
            1,
        ),
        citizenship="643",
        snils="112-233-445 95",
        series="AA",
        number=None,
        po_document_type=PO_WORKER_CERTIFICATE,
        post_2021_fields=True,
    )

    assert result.is_ready is False
    assert "document.number_missing" in result.error_codes


def test_pre_2021_po_allows_missing_citizenship() -> None:
    result = evaluate(
        year=2020,
        issued_at=date(
            2020,
            12,
            31,
        ),
        citizenship=None,
        snils=None,
        series="AA",
        number="000001",
        po_document_type=PO_WORKER_CERTIFICATE,
        post_2021_fields=False,
    )

    assert result.is_ready is True

    assert (
        "learner_profile.citizenship_country_code_missing"
        not in result.error_codes
    )

    assert (
        "frdo.po.citizenship_country_code_missing"
        not in result.error_codes
    )


def test_post_2021_po_requires_citizenship() -> None:
    result = evaluate(
        year=2026,
        issued_at=date(
            2026,
            9,
            1,
        ),
        citizenship=None,
        snils=None,
        series="AA",
        number="000001",
        po_document_type=PO_WORKER_CERTIFICATE,
        post_2021_fields=True,
    )

    assert result.is_ready is False

    assert (
        "frdo.po.citizenship_country_code_missing"
        in result.error_codes
    )
