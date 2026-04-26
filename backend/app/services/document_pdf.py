from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

from app.services.document_templates import (
    CompletionDocumentTemplateContext,
    format_document_date,
    normalize_document_text,
)

PDF_FONT_NAME = "DejaVuSans"
PDF_FONT_BOLD_NAME = "DejaVuSans-Bold"

REGULAR_FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans.ttf",
    "/usr/local/share/fonts/DejaVuSans.ttf",
    "C:/Windows/Fonts/arial.ttf",
)

BOLD_FONT_CANDIDATES = (
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/usr/local/share/fonts/DejaVuSans-Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
)


def _font_is_registered(font_name: str) -> bool:
    try:
        pdfmetrics.getFont(font_name)
    except KeyError:
        return False

    return True


def _first_existing_path(paths: tuple[str, ...]) -> Path | None:
    for raw_path in paths:
        path = Path(raw_path)
        if path.exists() and path.is_file():
            return path

    return None


def find_pdf_regular_font_path() -> Path | None:
    env_path = os.getenv("OBRPORTAL_PDF_FONT_PATH")

    if env_path:
        path = Path(env_path)
        if path.exists() and path.is_file():
            return path

    return _first_existing_path(REGULAR_FONT_CANDIDATES)


def find_pdf_bold_font_path() -> Path | None:
    env_path = os.getenv("OBRPORTAL_PDF_BOLD_FONT_PATH")

    if env_path:
        path = Path(env_path)
        if path.exists() and path.is_file():
            return path

    return _first_existing_path(BOLD_FONT_CANDIDATES)


def register_pdf_fonts() -> str:
    if _font_is_registered(PDF_FONT_NAME):
        return PDF_FONT_NAME

    regular_font_path = find_pdf_regular_font_path()

    if regular_font_path is None:
        return "Helvetica"

    pdfmetrics.registerFont(TTFont(PDF_FONT_NAME, str(regular_font_path)))

    bold_font_path = find_pdf_bold_font_path()
    if bold_font_path is not None and not _font_is_registered(PDF_FONT_BOLD_NAME):
        pdfmetrics.registerFont(TTFont(PDF_FONT_BOLD_NAME, str(bold_font_path)))

    return PDF_FONT_NAME


def get_pdf_bold_font_name() -> str:
    if _font_is_registered(PDF_FONT_BOLD_NAME):
        return PDF_FONT_BOLD_NAME

    return register_pdf_fonts()


def _draw_centered_wrapped_text(
    pdf: canvas.Canvas,
    *,
    text: str,
    y: float,
    max_width: float,
    font_name: str,
    font_size: int,
    leading: int,
    max_lines: int = 3,
) -> float:
    lines = simpleSplit(text, font_name, font_size, max_width)

    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = lines[-1].rstrip(" .") + "..."

    for line in lines:
        pdf.drawCentredString(A4[0] / 2, y, line)
        y -= leading

    return y


def render_completion_document_pdf(context: CompletionDocumentTemplateContext) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)

    width, height = A4
    margin = 22 * mm

    regular_font = register_pdf_fonts()
    bold_font = get_pdf_bold_font_name()

    learner_full_name = normalize_document_text(
        context.learner_full_name,
        fallback="ФИО обучающегося",
    )
    course_title = normalize_document_text(
        context.course_title,
        fallback="образовательная программа",
    )
    document_type = normalize_document_text(
        context.document_type,
        fallback="Сертификат",
    )
    document_number = normalize_document_text(
        context.document_number,
        fallback="-",
    )
    verification_code = normalize_document_text(
        context.verification_code,
        fallback="-",
    )
    verification_url = normalize_document_text(
        context.verification_url,
        fallback="-",
    )
    completed_date = format_document_date(context.completed_at)

    if context.course_hours is None:
        course_hours = "-"
    else:
        course_hours = str(max(0, int(context.course_hours)))

    pdf.setTitle(f"{document_type} {document_number}")
    pdf.setAuthor("ObrPortal")
    pdf.setSubject("Completion document")

    pdf.setStrokeColor(colors.HexColor("#d1d5db"))
    pdf.setLineWidth(3)
    pdf.rect(margin, margin, width - 2 * margin, height - 2 * margin)

    pdf.setStrokeColor(colors.HexColor("#1d4ed8"))
    pdf.setLineWidth(1.2)
    pdf.rect(margin + 6 * mm, margin + 6 * mm, width - 2 * (margin + 6 * mm), height - 2 * (margin + 6 * mm))

    y = height - 48 * mm

    pdf.setFillColor(colors.HexColor("#1d4ed8"))
    pdf.setFont(bold_font, 28)
    y = _draw_centered_wrapped_text(
        pdf,
        text=document_type.upper(),
        y=y,
        max_width=width - 70 * mm,
        font_name=bold_font,
        font_size=28,
        leading=32,
        max_lines=2,
    )

    y -= 3 * mm
    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 11)
    pdf.drawCentredString(width / 2, y, f"№ {document_number}")

    y -= 38 * mm

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 14)
    pdf.drawCentredString(width / 2, y, "Настоящий документ подтверждает, что")

    y -= 15 * mm
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 22)
    y = _draw_centered_wrapped_text(
        pdf,
        text=learner_full_name,
        y=y,
        max_width=width - 65 * mm,
        font_name=bold_font,
        font_size=22,
        leading=26,
        max_lines=2,
    )

    y -= 7 * mm
    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 14)
    pdf.drawCentredString(width / 2, y, "успешно завершил(а) обучение по программе")

    y -= 16 * mm
    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 17)
    y = _draw_centered_wrapped_text(
        pdf,
        text=course_title,
        y=y,
        max_width=width - 55 * mm,
        font_name=bold_font,
        font_size=17,
        leading=22,
        max_lines=3,
    )

    y -= 16 * mm

    left_x = margin + 22 * mm
    right_x = width / 2 + 8 * mm
    row_y = y

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 10)
    pdf.drawString(left_x, row_y, "Объём программы")
    pdf.drawString(right_x, row_y, "Дата завершения")

    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 13)
    pdf.drawString(left_x, row_y - 7 * mm, f"{course_hours} ак. ч.")
    pdf.drawString(right_x, row_y - 7 * mm, completed_date)

    row_y -= 22 * mm

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 10)
    pdf.drawString(left_x, row_y, "Код проверки")
    pdf.drawString(right_x, row_y, "Статус")

    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 13)
    pdf.drawString(left_x, row_y - 7 * mm, verification_code)
    pdf.drawString(right_x, row_y - 7 * mm, "Документ сформирован в ObrPortal")

    footer_y = margin + 34 * mm

    pdf.setStrokeColor(colors.HexColor("#111827"))
    pdf.setLineWidth(0.8)
    pdf.line(margin + 18 * mm, footer_y, margin + 75 * mm, footer_y)

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 9)
    pdf.drawCentredString(margin + 46.5 * mm, footer_y - 6 * mm, "Ответственное лицо")

    pdf.setFont(regular_font, 8)
    pdf.drawRightString(width - margin - 18 * mm, footer_y + 4 * mm, "Проверка подлинности:")
    pdf.drawRightString(width - margin - 18 * mm, footer_y - 2 * mm, verification_url)

    pdf.showPage()
    pdf.save()

    return buffer.getvalue()