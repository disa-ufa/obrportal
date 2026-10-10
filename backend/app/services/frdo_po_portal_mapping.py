from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from io import BytesIO
from typing import Final

from openpyxl import load_workbook

from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
)
from app.services.frdo_po_portal_contract import (
    read_verified_frdo_po_template_bytes,
)


FRDO_PO_MAPPING_VERSION: Final = (
    "frdo-po-working-reference-mapping-v1"
)

CATEGORY_DIRECT: Final = "direct"
CATEGORY_DERIVED: Final = "derived"
CATEGORY_CONSTANT: Final = "constant"
CATEGORY_CLASSIFIER: Final = "classifier"
CATEGORY_CONDITIONAL: Final = "conditional"
CATEGORY_GAP: Final = "gap"


class FrdoPoPortalMappingError(ValueError):
    pass


@dataclass(frozen=True)
class FrdoPoColumnSpec:
    index: int
    letter: str
    header: str
    category: str
    source_path: str | None
    classifier: str | None = None
    condition: str | None = None


_CLASSIFIER_DEFINED_NAMES: Final = {
    "document_type": "\u0412\u0438\u0434_\u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
    "document_status": "\u0441\u0442\u0430\u0442\u0443\u0441",
    "loss_confirmation": "\u0443\u0442\u0440\u0430\u0442\u0430\u0430",
    "exchange_confirmation": "\u041e\u043e\u0431\u043c\u0435\u043d",
    "destruction_confirmation": "\u0443\u043d\u0438\u0447",
    "po_program_type": "\u043f\u0440\u043e\u0444",
    "po_profession": "\u041a\u0432\u0430\u043b\u0438\u0444",
    "po_qualification": "\u041a\u043b\u0430\u0441\u04411",
    "sex": "\u043f\u043e\u043b",
    "citizenship_country_code": "\u0433\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u0442\u0432\u043e",
    "study_form": "\u0424\u041e",
    "funding_source": "\u0444\u0438\u043d\u0430\u043d\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u0435",
    "education_delivery_form": "\u041e\u0442\u043d\u043e\u0448\u0435\u043d\u0438\u044f",
}


FRDO_PO_COLUMNS: Final = (
    FrdoPoColumnSpec(
        1,
        "A",
        "\u0412\u0438\u0434 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
        CATEGORY_CLASSIFIER,
        "frdo_context.po_document_type",
        "document_type",
    ),
    FrdoPoColumnSpec(
        2,
        "B",
        "\u0421\u0442\u0430\u0442\u0443\u0441 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
        CATEGORY_CLASSIFIER,
        "frdo_context.document_status",
        "document_status",
    ),
    FrdoPoColumnSpec(
        3,
        "C",
        "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0443\u0442\u0440\u0430\u0442\u044b",
        CATEGORY_CLASSIFIER,
        "frdo_context.loss_confirmation",
        "loss_confirmation",
    ),
    FrdoPoColumnSpec(
        4,
        "D",
        "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u043e\u0431\u043c\u0435\u043d\u0430",
        CATEGORY_CLASSIFIER,
        "frdo_context.exchange_confirmation",
        "exchange_confirmation",
    ),
    FrdoPoColumnSpec(
        5,
        "E",
        "\u041f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0435\u043d\u0438\u0435 \u0443\u043d\u0438\u0447\u0442\u043e\u0436\u0435\u043d\u0438\u044f",
        CATEGORY_CLASSIFIER,
        "frdo_context.destruction_confirmation",
        "destruction_confirmation",
    ),
    FrdoPoColumnSpec(
        6,
        "F",
        "\u0421\u0435\u0440\u0438\u044f \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
        CATEGORY_CONDITIONAL,
        "document.document_series",
        condition=(
            "Required unless document type is training certificate; "
            "use official no-series marker when applicable."
        ),
    ),
    FrdoPoColumnSpec(
        7,
        "G",
        "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
        CATEGORY_CONDITIONAL,
        "document.document_number",
        condition=(
            "Required unless document type is training certificate."
        ),
    ),
    FrdoPoColumnSpec(
        8,
        "H",
        "\u0414\u0430\u0442\u0430 \u0432\u044b\u0434\u0430\u0447\u0438 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
        CATEGORY_DIRECT,
        "document.issued_at",
    ),
    FrdoPoColumnSpec(
        9,
        "I",
        "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0439 \u043d\u043e\u043c\u0435\u0440",
        CATEGORY_DIRECT,
        "document.registration_number",
    ),
    FrdoPoColumnSpec(
        10,
        "J",
        "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f, \u043d\u0430\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u0438\u0435 \u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438",
        CATEGORY_CLASSIFIER,
        "frdo_context.po_program_type",
        "po_program_type",
        "Optional when the source document legitimately has no value.",
    ),
    FrdoPoColumnSpec(
        11,
        "K",
        "\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0433\u043e \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
        CATEGORY_DIRECT,
        "course.title",
    ),
    FrdoPoColumnSpec(
        12,
        "L",
        "\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0439 \u0440\u0430\u0431\u043e\u0447\u0438\u0445, \u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0435\u0439 \u0441\u043b\u0443\u0436\u0430\u0449\u0438\u0445",
        CATEGORY_CLASSIFIER,
        "frdo_context.po_profession",
        "po_profession",
    ),
    FrdoPoColumnSpec(
        13,
        "M",
        "\u041f\u0440\u0438\u0441\u0432\u043e\u0435\u043d\u043d\u044b\u0439 \u043a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0439 \u0440\u0430\u0437\u0440\u044f\u0434, \u043a\u043b\u0430\u0441\u0441, \u043a\u0430\u0442\u0435\u0433\u043e\u0440\u0438\u044f (\u043f\u0440\u0438 \u043d\u0430\u043b\u0438\u0447\u0438\u0438)",
        CATEGORY_CLASSIFIER,
        "frdo_context.po_qualification",
        "po_qualification",
        "Optional; template allows the explicit value meaning none.",
    ),
    FrdoPoColumnSpec(
        14,
        "N",
        "\u0413\u043e\u0434 \u043d\u0430\u0447\u0430\u043b\u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
        CATEGORY_DERIVED,
        "enrollment.started_at",
        condition="Derived as calendar year.",
    ),
    FrdoPoColumnSpec(
        15,
        "O",
        "\u0413\u043e\u0434 \u043e\u043a\u043e\u043d\u0447\u0430\u043d\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
        CATEGORY_DERIVED,
        "enrollment.completed_at",
        condition="Derived as calendar year.",
    ),
    FrdoPoColumnSpec(
        16,
        "P",
        "\u0421\u0440\u043e\u043a \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f, \u0447\u0430\u0441\u043e\u0432",
        CATEGORY_DIRECT,
        "course.hours",
        condition="Professional-training duration must be at least 6 hours.",
    ),
    FrdoPoColumnSpec(
        17,
        "Q",
        "\u0424\u0430\u043c\u0438\u043b\u0438\u044f \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f",
        CATEGORY_DIRECT,
        "learner_profile.last_name",
    ),
    FrdoPoColumnSpec(
        18,
        "R",
        "\u0418\u043c\u044f \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f",
        CATEGORY_DIRECT,
        "learner_profile.first_name",
    ),
    FrdoPoColumnSpec(
        19,
        "S",
        "\u041e\u0442\u0447\u0435\u0441\u0442\u0432\u043e \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f",
        CATEGORY_DERIVED,
        "learner_profile.middle_name",
        condition="Use the FRDO no-patronymic marker when absent.",
    ),
    FrdoPoColumnSpec(
        20,
        "T",
        "\u0414\u0430\u0442\u0430 \u0440\u043e\u0436\u0434\u0435\u043d\u0438\u044f \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f",
        CATEGORY_DIRECT,
        "learner_profile.birth_date",
    ),
    FrdoPoColumnSpec(
        21,
        "U",
        "\u041f\u043e\u043b \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f",
        CATEGORY_CLASSIFIER,
        "learner_profile.sex",
        "sex",
    ),
    FrdoPoColumnSpec(
        22,
        "V",
        "\u0421\u041d\u0418\u041b\u0421",
        CATEGORY_CONDITIONAL,
        "learner_profile.snils",
        condition=(
            "Required for citizenship 643 when document issue year "
            "is 2021 or later."
        ),
    ),
    FrdoPoColumnSpec(
        23,
        "W",
        "\u0413\u0440\u0430\u0436\u0434\u0430\u043d\u0441\u0442\u0432\u043e \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f (\u043a\u043e\u0434 \u0441\u0442\u0440\u0430\u043d\u044b \u043f\u043e \u041e\u041a\u0421\u041c)",
        CATEGORY_CONDITIONAL,
        "learner_profile.citizenship_country_code",
        "citizenship_country_code",
        "Required for documents issued in 2021 or later.",
    ),
    FrdoPoColumnSpec(
        24,
        "X",
        "\u0424\u043e\u0440\u043c\u0430 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
        CATEGORY_CONDITIONAL,
        "frdo_context.study_form",
        "study_form",
        "Required for documents issued in 2021 or later.",
    ),
    FrdoPoColumnSpec(
        25,
        "Y",
        "\u0418\u0441\u0442\u043e\u0447\u043d\u0438\u043a \u0444\u0438\u043d\u0430\u043d\u0441\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u044f",
        CATEGORY_CONDITIONAL,
        "frdo_context.funding_source",
        "funding_source",
        (
            "Required for documents issued in 2021 or later; "
            "generic budget is intentionally not mapped."
        ),
    ),
    FrdoPoColumnSpec(
        26,
        "Z",
        "\u0424\u043e\u0440\u043c\u0430 \u043f\u043e\u043b\u0443\u0447\u0435\u043d\u0438\u044f \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u044f \u043d\u0430 \u043c\u043e\u043c\u0435\u043d\u0442 \u043f\u0440\u0435\u043a\u0440\u0430\u0449\u0435\u043d\u0438\u044f \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u044b\u0445 \u043e\u0442\u043d\u043e\u0448\u0435\u043d\u0438\u0439",
        CATEGORY_CONDITIONAL,
        "frdo_context.education_delivery_form",
        "education_delivery_form",
        "Required for documents issued in 2021 or later.",
    ),
    FrdoPoColumnSpec(
        27,
        "AA",
        "\u041d\u0430\u0438\u043c\u0435\u043d\u043e\u0432\u0430\u043d\u0438\u0435 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u043e\u0431 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0438 (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.document_type",
        "document_type",
        "Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        28,
        "AB",
        "\u0421\u0435\u0440\u0438\u044f (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.document_series",
        condition="Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        29,
        "AC",
        "\u041d\u043e\u043c\u0435\u0440 (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.document_number",
        condition="Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        30,
        "AD",
        "\u0420\u0435\u0433\u0438\u0441\u0442\u0440\u0430\u0446\u0438\u043e\u043d\u043d\u044b\u0439 N (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.registration_number",
        condition="Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        31,
        "AE",
        "\u0414\u0430\u0442\u0430 \u0432\u044b\u0434\u0430\u0447\u0438 (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.issue_date",
        condition="Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        32,
        "AF",
        "\u0424\u0430\u043c\u0438\u043b\u0438\u044f \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.recipient_last_name",
        condition="Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        33,
        "AG",
        "\u0418\u043c\u044f \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.recipient_first_name",
        condition="Required only when B is duplicate.",
    ),
    FrdoPoColumnSpec(
        34,
        "AH",
        "\u041e\u0442\u0447\u0435\u0441\u0442\u0432\u043e \u043f\u043e\u043b\u0443\u0447\u0430\u0442\u0435\u043b\u044f (\u043e\u0440\u0438\u0433\u0438\u043d\u0430\u043b\u0430)",
        CATEGORY_CONDITIONAL,
        "frdo_context.original_document_snapshot_json.recipient_middle_name",
        condition=(
            "Required only when B is duplicate; use no-patronymic "
            "marker when absent."
        ),
    ),
    FrdoPoColumnSpec(
        35,
        "AI",
        "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430 \u0434\u043b\u044f \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f",
        CATEGORY_CONSTANT,
        None,
        condition="Must always remain blank for this upload workflow.",
    ),
)


FRDO_PO_KNOWN_MAPPING_GAPS: Final = (
    (
        "funding_source_budget",
        (
            "Generic funding_source value 'budget' cannot determine "
            "federal, regional, or local budget."
        ),
    ),
    (
        "training_reference_art_preprofessional_profession",
        (
            "The working-reference PO instruction describes a special "
            "profession value for training references issued for art "
            "preprofessional programs, but that value is absent from "
            "the pinned po_profession classifier and the current domain "
            "model has no separate art-preprofessional discriminator. "
            "The portal must not infer or invent this value."
        ),
    ),
)


_ALIAS_MAPS: Final = {
    "document_status": {
        "original": "\u041e\u0440\u0438\u0433\u0438\u043d\u0430\u043b",
        "duplicate": "\u0414\u0443\u0431\u043b\u0438\u043a\u0430\u0442",
    },
    "loss_confirmation": {
        "no": "\u041d\u0435\u0442",
    },
    "exchange_confirmation": {
        "no": "\u041d\u0435\u0442",
    },
    "destruction_confirmation": {
        "no": "\u041d\u0435\u0442",
        "yes": "\u0414\u0430",
    },
    "po_program_type": {
        "initial_training": (
            "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 "
            "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 "
            "\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 \u043f\u043e "
            "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 \u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
            "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 \u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
        ),
        "initial training": (
            "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 "
            "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u043e\u0439 "
            "\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 \u043f\u043e "
            "\u043f\u0440\u043e\u0444\u0435\u0441\u0441\u0438\u0438 \u0440\u0430\u0431\u043e\u0447\u0435\u0433\u043e, "
            "\u0434\u043e\u043b\u0436\u043d\u043e\u0441\u0442\u0438 \u0441\u043b\u0443\u0436\u0430\u0449\u0435\u0433\u043e"
        ),
        "retraining": (
            "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 "
            "\u043f\u0435\u0440\u0435\u043f\u043e\u0434\u0433\u043e\u0442\u043e\u0432\u043a\u0438 "
            "\u0440\u0430\u0431\u043e\u0447\u0438\u0445, \u0441\u043b\u0443\u0436\u0430\u0449\u0438\u0445"
        ),
        "advanced_training": (
            "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 "
            "\u043f\u043e\u0432\u044b\u0448\u0435\u043d\u0438\u044f "
            "\u043a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438 "
            "\u0440\u0430\u0431\u043e\u0447\u0438\u0445, \u0441\u043b\u0443\u0436\u0430\u0449\u0438\u0445"
        ),
        "advanced training": (
            "\u041f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430 "
            "\u043f\u043e\u0432\u044b\u0448\u0435\u043d\u0438\u044f "
            "\u043a\u0432\u0430\u043b\u0438\u0444\u0438\u043a\u0430\u0446\u0438\u0438 "
            "\u0440\u0430\u0431\u043e\u0447\u0438\u0445, \u0441\u043b\u0443\u0436\u0430\u0449\u0438\u0445"
        ),
    },
    "sex": {
        "male": "\u041c\u0443\u0436",
        "female": "\u0416\u0435\u043d",
    },
    "study_form": {
        "full_time": "\u041e\u0447\u043d\u0430\u044f",
        "full-time": "\u041e\u0447\u043d\u0430\u044f",
        "full time": "\u041e\u0447\u043d\u0430\u044f",
        "part_time_evening": (
            "\u041e\u0447\u043d\u043e-\u0437\u0430\u043e\u0447\u043d\u0430\u044f "
            "(\u0432\u0435\u0447\u0435\u0440\u043d\u044f\u044f)"
        ),
        "correspondence": "\u0417\u0430\u043e\u0447\u043d\u0430\u044f",
    },
    "funding_source": {
        "federal_budget": "\u0424\u0435\u0434\u0435\u0440\u0430\u043b\u044c\u043d\u044b\u0439 \u0431\u044e\u0434\u0436\u0435\u0442",
        "regional_budget": "\u0420\u0435\u0433\u0438\u043e\u043d\u0430\u043b\u044c\u043d\u044b\u0439 \u0431\u044e\u0434\u0436\u0435\u0442",
        "local_budget": "\u041c\u0435\u0441\u0442\u043d\u044b\u0439 \u0431\u044e\u0434\u0436\u0435\u0442",
        "paid": "\u041f\u043b\u0430\u0442\u043d\u043e\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435",
        "paid_training": "\u041f\u043b\u0430\u0442\u043d\u043e\u0435 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435",
    },
    "education_delivery_form": {
        "onsite": "\u0432 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
        "in_organization": "\u0432 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
        "in organization": "\u0432 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
        "offsite": "\u0432\u043d\u0435 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
        "outside_organization": "\u0432\u043d\u0435 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u0438",
    },
}


def get_frdo_po_column_specs() -> tuple[FrdoPoColumnSpec, ...]:
    return FRDO_PO_COLUMNS


@lru_cache(maxsize=1)
def _load_classifier_catalog() -> dict[str, tuple[str, ...]]:
    content = read_verified_frdo_po_template_bytes(
        program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING,
    )

    workbook = load_workbook(
        BytesIO(content),
        read_only=False,
        data_only=False,
    )

    catalog: dict[str, tuple[str, ...]] = {}

    for classifier, defined_name in (
        _CLASSIFIER_DEFINED_NAMES.items()
    ):
        definition = workbook.defined_names.get(
            defined_name
        )

        if definition is None:
            raise FrdoPoPortalMappingError(
                "FRDO PO classifier defined name is missing: "
                + classifier
            )

        destinations = list(
            definition.destinations
        )

        if len(destinations) != 1:
            raise FrdoPoPortalMappingError(
                "FRDO PO classifier range is ambiguous: "
                + classifier
            )

        sheet_name, cell_range = destinations[0]

        worksheet = workbook[sheet_name]

        values: list[str] = []

        for row in worksheet[cell_range]:
            for cell in row:
                if cell.value is None:
                    continue

                value = str(cell.value).strip()

                if value:
                    values.append(value)

        if not values:
            raise FrdoPoPortalMappingError(
                "FRDO PO classifier is empty: "
                + classifier
            )

        catalog[classifier] = tuple(values)

    return catalog


def get_frdo_po_classifier_values(
    classifier: str,
) -> tuple[str, ...]:
    try:
        return _load_classifier_catalog()[
            classifier
        ]
    except KeyError as exc:
        raise FrdoPoPortalMappingError(
            "Unknown FRDO PO classifier: "
            + str(classifier)
        ) from exc


def normalize_frdo_po_classifier_value(
    classifier: str,
    value: object,
) -> str:
    if not isinstance(value, str):
        raise FrdoPoPortalMappingError(
            "FRDO PO classifier value must be text: "
            + classifier
        )

    raw = value.strip()

    if not raw:
        raise FrdoPoPortalMappingError(
            "FRDO PO classifier value is empty: "
            + classifier
        )

    allowed = get_frdo_po_classifier_values(
        classifier
    )

    if raw in allowed:
        return raw

    folded_matches = [
        candidate
        for candidate in allowed
        if candidate.casefold() == raw.casefold()
    ]

    if len(folded_matches) == 1:
        return folded_matches[0]

    aliases = _ALIAS_MAPS.get(
        classifier,
        {},
    )

    alias = aliases.get(
        raw.casefold()
    )

    if alias is not None:
        if alias not in allowed:
            raise FrdoPoPortalMappingError(
                "FRDO PO alias points outside classifier: "
                + classifier
            )

        return alias

    raise FrdoPoPortalMappingError(
        "FRDO PO classifier value is unsupported: "
        + classifier
        + "="
        + raw
    )

def search_frdo_po_classifier_values(
    classifier: str,
    query: str | None,
    *,
    limit: int = 50,
) -> tuple[tuple[str, ...], int]:
    if limit < 1:
        raise ValueError(
            "FRDO PO classifier search limit must be positive"
        )

    values = get_frdo_po_classifier_values(
        classifier
    )

    needle = (
        query.strip().casefold()
        if isinstance(query, str)
        else ""
    )

    if needle:
        matches = tuple(
            value
            for value in values
            if needle in value.casefold()
        )
    else:
        matches = values

    return (
        matches[:limit],
        len(matches),
    )
