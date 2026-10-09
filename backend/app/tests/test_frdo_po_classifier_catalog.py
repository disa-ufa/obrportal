from __future__ import annotations

from app.schemas.admin import (
    AdminFrdoPoClassifierCatalog,
    AdminFrdoPoProfessionSearchResult,
)
from app.services.frdo_po_portal_mapping import (
    FRDO_PO_MAPPING_VERSION,
    get_frdo_po_classifier_values,
    search_frdo_po_classifier_values,
)


def test_classifier_catalog_schema_contract() -> None:
    model = AdminFrdoPoClassifierCatalog(
        mapping_version=FRDO_PO_MAPPING_VERSION,
        classifiers={
            "document_status": ["Original"],
        },
        profession_count=5599,
    )

    assert model.mapping_version == FRDO_PO_MAPPING_VERSION
    assert model.profession_count == 5599


def test_profession_search_schema_contract() -> None:
    model = AdminFrdoPoProfessionSearchResult(
        mapping_version=FRDO_PO_MAPPING_VERSION,
        query="driver",
        total=1,
        values=["Driver"],
    )

    assert model.total == 1
    assert model.values == ["Driver"]


def test_profession_search_uses_pinned_classifier() -> None:
    expected = (
        "\u0412\u043e\u0434\u0438\u0442\u0435\u043b\u044c "
        "\u0430\u0432\u0442\u043e\u043c\u043e\u0431\u0438\u043b\u044f"
    )

    values, total = search_frdo_po_classifier_values(
        "po_profession",
        expected,
        limit=10,
    )

    assert total >= 1
    assert expected in values
    assert expected in get_frdo_po_classifier_values(
        "po_profession"
    )


def test_empty_profession_search_is_bounded() -> None:
    values, total = search_frdo_po_classifier_values(
        "po_profession",
        "",
        limit=50,
    )

    assert total == 5599
    assert len(values) == 50
