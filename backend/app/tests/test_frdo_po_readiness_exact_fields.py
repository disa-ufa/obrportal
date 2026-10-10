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

ART_CERTIFICATE = (
    "\u0421\u0432\u0438\u0434\u0435\u0442\u0435\u043b\u044c\u0441\u0442\u0432\u043e "
    "\u043e\u0431 "
    "\u043e\u0441\u0432\u043e\u0435\u043d\u0438\u0438 "
    "\u0434\u043e\u043f\u043e\u043b\u043d\u0438\u0442\u0435\u043b\u044c\u043d\u044b\u0445 "
    "\u043f\u0440\u0435\u0434\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0445 "
    "\u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c "
    "\u0432 "
    "\u043e\u0431\u043b\u0430\u0441\u0442\u0438 "
    "\u0438\u0441\u043a\u0443\u0441\u0441\u0442\u0432"
)

DRIVER = (
    "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
    "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
)


def enrollment(
    start_year=2026,
    end_year=2026,
):
    return SimpleNamespace(
        id="enrollment-1",
        status="completed",
        started_at=datetime(
            start_year,
            1,
            10,
            tzinfo=timezone.utc,
        ),
        completed_at=datetime(
            end_year,
            8,
            20,
            tzinfo=timezone.utc,
        ),
    )


def course(
    title="PO test",
):
    return SimpleNamespace(
        title=title,
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


def profile(
    last_name="\u0418\u0432\u0430\u043d\u043e\u0432",
    first_name="\u0418\u0432\u0430\u043d",
    middle_name="\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
):
    return SimpleNamespace(
        last_name=last_name,
        first_name=first_name,
        middle_name=middle_name,
        birth_date=date(
            1990,
            1,
            2,
        ),
        sex="male",
        citizenship_country_code="643",
        snils="112-233-445 95",
    )


def document(
    series="AA",
    number="000001",
    registration_number="1548",
):
    return SimpleNamespace(
        enrollment_id="enrollment-1",
        document_series=series,
        document_number=number,
        document_type="Certificate",
        issued_at=date(
            2026,
            9,
            1,
        ),
        registration_number=(
            registration_number
        ),
        revoked_at=None,
    )


def context(
    document_status="Original",
    po_document_type=WORKER_CERTIFICATE,
    po_program_type="Initial training",
    po_profession=DRIVER,
):
    return SimpleNamespace(
        document_status=document_status,
        loss_confirmation="No",
        exchange_confirmation="No",
        destruction_confirmation="No",
        study_form="Full-time",
        funding_source="Paid",
        education_delivery_form=(
            "In organization"
        ),
        po_document_type=po_document_type,
        po_program_type=po_program_type,
        po_profession=po_profession,
        po_qualification=None,
        dpo_professional_activity_area=None,
        dpo_enlarged_specialty_group=None,
        dpo_qualification=None,
        prior_education_snapshot_json=None,
        original_document_snapshot_json=None,
    )


def evaluate(
    enrollment_value=None,
    course_value=None,
    profile_value=None,
    document_value=None,
    context_value=None,
):
    return evaluate_registry_readiness(
        registry=REGISTRY_FRDO,
        enrollment=(
            enrollment_value
            if enrollment_value is not None
            else enrollment()
        ),
        course=(
            course_value
            if course_value is not None
            else course()
        ),
        learner=learner(),
        learner_profile=(
            profile_value
            if profile_value is not None
            else profile()
        ),
        document=(
            document_value
            if document_value is not None
            else document()
        ),
        frdo_context=(
            context_value
            if context_value is not None
            else context()
        ),
    )


def test_exact_main_row_baseline_ready():
    result = evaluate()

    assert result.is_ready is True
    assert result.error_codes == ()


def test_art_certificate_requires_j_and_l_blank():
    result = evaluate(
        context_value=context(
            po_document_type=ART_CERTIFICATE,
            po_program_type="Initial training",
            po_profession=DRIVER,
        )
    )

    assert (
        "frdo.po."
        "program_type_must_be_blank_for_art_certificate"
        in result.error_codes
    )

    assert (
        "frdo.po."
        "profession_must_be_blank_for_art_certificate"
        in result.error_codes
    )


def test_art_certificate_accepts_blank_j_and_l():
    result = evaluate(
        context_value=context(
            po_document_type=ART_CERTIFICATE,
            po_program_type=None,
            po_profession=None,
        )
    )

    assert result.is_ready is True


def test_original_start_year_minimum_1978():
    result = evaluate(
        enrollment_value=enrollment(
            1977,
            1978,
        )
    )

    assert (
        "frdo.po.start_year_before_minimum"
        in result.error_codes
    )


def test_duplicate_start_year_minimum_1955():
    result = evaluate(
        enrollment_value=enrollment(
            1954,
            1955,
        ),
        context_value=context(
            document_status="Duplicate",
        ),
    )

    assert (
        "frdo.po.start_year_before_minimum"
        in result.error_codes
    )


def test_end_year_cannot_precede_start():
    result = evaluate(
        enrollment_value=enrollment(
            2026,
            2025,
        )
    )

    assert (
        "frdo.po.end_year_before_start"
        in result.error_codes
    )


def test_future_training_years_rejected():
    future = date.today().year + 1

    result = evaluate(
        enrollment_value=enrollment(
            future,
            future,
        )
    )

    assert (
        "frdo.po.start_year_future"
        in result.error_codes
    )

    assert (
        "frdo.po.end_year_future"
        in result.error_codes
    )


def test_document_and_program_length_limits():
    result = evaluate(
        document_value=document(
            series="A" * 21,
            number="1" * 41,
            registration_number="R" * 31,
        ),
        course_value=course(
            title="A" * 256,
        ),
    )

    expected = {
        "frdo.po.document_series_too_long",
        "frdo.po.document_number_too_long",
        "frdo.po.registration_number_too_long",
        "frdo.po.program_name_too_long",
    }

    assert expected.issubset(
        set(
            result.error_codes
        )
    )


def test_document_character_rules():
    result = evaluate(
        document_value=document(
            series="AA@",
            number="001@",
            registration_number="REG@",
        )
    )

    expected = {
        "frdo.po.document_series_invalid",
        "frdo.po.document_number_invalid",
        "frdo.po.registration_number_invalid",
    }

    assert expected.issubset(
        set(
            result.error_codes
        )
    )


def test_names_must_be_cyrillic():
    result = evaluate(
        profile_value=profile(
            first_name="Ivan",
        )
    )

    assert (
        "frdo.po.first_name_invalid"
        in result.error_codes
    )


def test_name_cannot_start_with_hyphen():
    result = evaluate(
        profile_value=profile(
            middle_name=(
                "-"
                "\u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447"
            )
        )
    )

    assert (
        "frdo.po.middle_name_invalid"
        in result.error_codes
    )


def test_name_length_limit_50():
    result = evaluate(
        profile_value=profile(
            last_name="\u0410" * 51,
        )
    )

    assert (
        "frdo.po.last_name_too_long"
        in result.error_codes
    )


def test_no_patronymic_marker_is_valid():
    result = evaluate(
        profile_value=profile(
            middle_name="\u041d\u0435\u0442",
        )
    )

    assert (
        "frdo.po.middle_name_invalid"
        not in result.error_codes
    )
