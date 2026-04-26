from __future__ import annotations

from datetime import datetime, timezone

from app.services.document_pdf import (
    PDF_FONT_NAME,
    find_pdf_regular_font_path,
    register_pdf_fonts,
    render_completion_document_pdf,
)
from app.services.document_templates import CompletionDocumentTemplateContext


def test_register_pdf_fonts_returns_usable_font_name() -> None:
    font_name = register_pdf_fonts()

    assert font_name
    assert isinstance(font_name, str)

    if find_pdf_regular_font_path() is not None:
        assert font_name == PDF_FONT_NAME


def test_render_completion_document_pdf_returns_pdf_bytes() -> None:
    pdf_bytes = render_completion_document_pdf(
        CompletionDocumentTemplateContext(
            learner_full_name="Иванов Иван Иванович",
            course_title="Основы программирования на Python",
            document_type="Сертификат",
            document_number="AUTO-1234567890ABCDEF",
            verification_code="DOCV-ABC123",
            completed_at=datetime(2026, 4, 26, 12, 30, tzinfo=timezone.utc),
            course_hours=72,
            verification_url="https://obrportal.example.ru/verify/DOCV-ABC123",
        )
    )

    assert pdf_bytes.startswith(b"%PDF-")
    assert b"%%EOF" in pdf_bytes
    assert len(pdf_bytes) > 2_500


def test_render_completion_document_pdf_handles_missing_optional_fields() -> None:
    pdf_bytes = render_completion_document_pdf(
        CompletionDocumentTemplateContext(
            learner_full_name="Петров Петр Петрович",
            course_title="Курс без часов",
            document_type="Удостоверение",
            document_number="AUTO-EMPTY",
            verification_code="DOCV-EMPTY",
            completed_at=None,
            course_hours=None,
            verification_url=None,
        )
    )

    assert pdf_bytes.startswith(b"%PDF-")
    assert b"%%EOF" in pdf_bytes
    assert len(pdf_bytes) > 2_500


def test_render_completion_document_pdf_handles_long_values() -> None:
    long_course_title = (
        "Очень длинная образовательная программа повышения квалификации "
        "по современным цифровым образовательным технологиям и управлению "
        "электронным обучением в организации"
    )

    pdf_bytes = render_completion_document_pdf(
        CompletionDocumentTemplateContext(
            learner_full_name="Сидоров Сидор Сидорович",
            course_title=long_course_title,
            document_type="Сертификат",
            document_number="AUTO-LONG",
            verification_code="DOCV-LONG",
            completed_at=datetime(2026, 4, 26, 12, 30, tzinfo=timezone.utc),
            course_hours=144,
            verification_url="https://obrportal.example.ru/verify/DOCV-LONG",
        )
    )

    assert pdf_bytes.startswith(b"%PDF-")
    assert b"%%EOF" in pdf_bytes
    assert len(pdf_bytes) > 2_500