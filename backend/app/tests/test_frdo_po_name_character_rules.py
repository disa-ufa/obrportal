from __future__ import annotations

from app.services.compliance_registry_readiness import (
    _frdo_po_person_name_is_valid,
)


def test_frdo_po_person_name_accepts_instruction_punctuation():
    assert (
        _frdo_po_person_name_is_valid(
            "\u041e'\u041a\u043e\u043d\u043d\u043e\u0440"
        )
        is True
    )

    assert (
        _frdo_po_person_name_is_valid(
            "\u0418\u0432\u0430\u043d\u043e\u0432 (\u0421\u0442\u0430\u0440\u0448\u0438\u0439)"
        )
        is True
    )

    assert (
        _frdo_po_person_name_is_valid(
            "\u0410\u043d\u043d\u0430-\u041c\u0430\u0440\u0438\u044f"
        )
        is True
    )

    assert (
        _frdo_po_person_name_is_valid(
            "\u0418\u0432\u0430\u043d\u043e\u0432.\u0418"
        )
        is True
    )


def test_frdo_po_person_name_rejects_backtick():
    assert (
        _frdo_po_person_name_is_valid(
            "\u0418\u0432\u0430\u043d`\u043e\u0432"
        )
        is False
    )


def test_frdo_po_person_name_rejects_latin_letters():
    assert (
        _frdo_po_person_name_is_valid(
            "Ivanov"
        )
        is False
    )
