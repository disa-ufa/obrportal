from __future__ import annotations

from datetime import datetime, timezone

import app.services.document_pdf as document_pdf

from app.services.document_pdf import (
    build_verification_qr_drawing,
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


def test_build_verification_qr_drawing_returns_reportlab_drawing() -> None:
    drawing = build_verification_qr_drawing(
        "https://obrportal.example.ru/verify/DOCV-ABC123",
        96,
    )

    assert drawing is not None
    assert drawing.width == 96
    assert drawing.height == 96
    assert len(drawing.contents) == 1


def test_build_verification_qr_drawing_skips_empty_values() -> None:
    assert build_verification_qr_drawing(None, 96) is None
    assert build_verification_qr_drawing("", 96) is None
    assert build_verification_qr_drawing("   ", 96) is None
    assert build_verification_qr_drawing("-", 96) is None


def test_render_completion_document_pdf_uses_clean_russian_text_constants() -> None:
    from types import CodeType

    def collect_string_constants(code: CodeType) -> list[str]:
        values: list[str] = []

        for constant in code.co_consts:
            if isinstance(constant, str):
                values.append(constant)
            elif isinstance(constant, CodeType):
                values.extend(collect_string_constants(constant))

        return values

    constants = collect_string_constants(render_completion_document_pdf.__code__)
    combined = "\n".join(constants)

    expected_strings = [
        "\u0424\u0418\u041e \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0435\u0433\u043e\u0441\u044f",
        "\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430",
        "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442",
        "\u2116 ",
        "\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0438\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442, \u0447\u0442\u043e",
        "\u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043b(\u0430) \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u043e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435",
        "\u041e\u0431\u044a\u0451\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b",
        "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f",
        "\u0430\u043a. \u0447.",
        "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
        "\u0421\u0442\u0430\u0442\u0443\u0441",
        "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d \u0432 ObrPortal",
        "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u043e\u0434\u043b\u0438\u043d\u043d\u043e\u0441\u0442\u0438:",
    ]

    mojibake_markers = [
        "\u0420\u00a4",
        "\u0420\u0098",
        "\u0420\u009d",
        "\u0420\u040e",
        "\u0420\u040b",
        "\u0420\u0459",
        "\u0420\u0452",
        "\u0420\u045c",
        "\u0421\u0453",
        "\u0421\u2021",
        "\u0421\u20ac",
        "\u0421\u2039",
        "\u0421\u040e",
        "\u0421\u040f",
        "\u0432\u201e\u2013",
    ]

    missing = [value for value in expected_strings if value not in combined]
    bad = [marker for marker in mojibake_markers if marker in combined]

    assert missing == []
    assert bad == []


def test_render_completion_document_pdf_accepts_organization_and_signer_metadata() -> None:
    pdf_bytes = render_completion_document_pdf(
        CompletionDocumentTemplateContext(
            learner_full_name="",
            course_title="",
            document_type="",
            document_number="AUTO-ORG-META",
            verification_code="DOCV-ORG-META",
            course_hours=72,
            verification_url="http://localhost:5173/verify-document?code=DOCV-ORG-META",
            organization_name="",
            organization_address="Республика Башкортостан, г. Уфа",
            organization_license="Лицензия на осуществление образовательной деятельности",
            signer_position="",
            signer_full_name="Ответственное лицо",
        )
    )

    assert pdf_bytes.startswith(b"%PDF")
    assert len(pdf_bytes) > 1000




def test_render_completion_document_pdf_draws_expected_visible_metadata(monkeypatch) -> None:
    drawn_text: list[str] = []

    class FakeCanvas:
        def __init__(self, buffer, pagesize):
            self.buffer = buffer

        def setTitle(self, *args, **kwargs): pass
        def setAuthor(self, *args, **kwargs): pass
        def setSubject(self, *args, **kwargs): pass
        def setStrokeColor(self, *args, **kwargs): pass
        def setLineWidth(self, *args, **kwargs): pass
        def rect(self, *args, **kwargs): pass
        def setFillColor(self, *args, **kwargs): pass
        def setFont(self, *args, **kwargs): pass
        def line(self, *args, **kwargs): pass
        def showPage(self, *args, **kwargs): pass

        def drawCentredString(self, _x, _y, text):
            drawn_text.append(str(text))

        def drawString(self, _x, _y, text):
            drawn_text.append(str(text))

        def drawRightString(self, _x, _y, text):
            drawn_text.append(str(text))

        def save(self):
            self.buffer.write(b"%PDF-fake\n%%EOF")

    monkeypatch.setattr(document_pdf.canvas, "Canvas", FakeCanvas)
    monkeypatch.setattr(document_pdf, "draw_verification_qr", lambda *args, **kwargs: True)

    pdf_bytes = document_pdf.render_completion_document_pdf(
        CompletionDocumentTemplateContext(
            learner_full_name="\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
            course_title="\u041e\u0441\u043d\u043e\u0432\u044b \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f \u043d\u0430 Python",
            document_type="\u0423\u0434\u043e\u0441\u0442\u043e\u0432\u0435\u0440\u0435\u043d\u0438\u0435",
            document_number="AUTO-DRAW",
            verification_code="DOCV-DRAW",
            completed_at=datetime(2026, 12, 31, 12, 0, tzinfo=timezone.utc),
            course_hours=72,
            verification_url="https://obrportal.example.ru/verify/DOCV-DRAW",
            organization_name="\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e",
            organization_address="\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u0411\u0430\u0448\u043a\u043e\u0440\u0442\u043e\u0441\u0442\u0430\u043d, \u0433. \u0423\u0444\u0430",
            organization_license="\u041b\u0438\u0446\u0435\u043d\u0437\u0438\u044f \u043d\u0430 \u043e\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u0434\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u0438",
            document_basis="Приказ о завершении обучения",
            document_place="г. Уфа",
            organization_inn="0278000001",
            organization_kpp="027801001",
            organization_ogrn="1020200000001",
            signer_position="\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440",
            signer_full_name="\u041f\u0435\u0442\u0440\u043e\u0432 \u041f.\u041f.",
        )
    )

    assert pdf_bytes.startswith(b"%PDF-")

    combined = "\n".join(drawn_text)
    expected = [
        "\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e",
        "\u0418\u041d\u041d 0278000001",
        "\u041a\u041f\u041f 027801001",
        "\u041e\u0413\u0420\u041d 1020200000001",
        "\u041b\u0438\u0446\u0435\u043d\u0437\u0438\u044f",
        "Приказ о завершении обучения",
        "г. Уфа",
        "\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u0411\u0430\u0448\u043a\u043e\u0440\u0442\u043e\u0441\u0442\u0430\u043d",
        "\u0423\u0414\u041e\u0421\u0422\u041e\u0412\u0415\u0420\u0415\u041d\u0418\u0415",
        "\u2116 AUTO-DRAW",
        "\u0418\u0432\u0430\u043d\u043e\u0432 \u0418\u0432\u0430\u043d \u0418\u0432\u0430\u043d\u043e\u0432\u0438\u0447",
        "\u041e\u0441\u043d\u043e\u0432\u044b \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0438\u0440\u043e\u0432\u0430\u043d\u0438\u044f",
        "72 \u0430\u043a. \u0447.",
        "31.12.2026",
        "DOCV-DRAW",
        "https://obrportal.example.ru/verify/DOCV-DRAW",
        "\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440",
        "\u041f\u0435\u0442\u0440\u043e\u0432 \u041f.\u041f.",
    ]

    missing = [value for value in expected if value not in combined]
    assert missing == []
