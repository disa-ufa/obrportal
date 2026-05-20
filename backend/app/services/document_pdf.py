from __future__ import annotations

import os
from io import BytesIO
from pathlib import Path

from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
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



def build_verification_qr_drawing(value: str | None, size: float) -> Drawing | None:
    normalized_value = normalize_document_text(value, fallback="").strip()

    if not normalized_value or normalized_value == "-":
        return None

    qr_code = QrCodeWidget(normalized_value)
    bounds = qr_code.getBounds()
    qr_width = bounds[2] - bounds[0]
    qr_height = bounds[3] - bounds[1]

    if qr_width <= 0 or qr_height <= 0:
        return None

    scale_x = size / qr_width
    scale_y = size / qr_height

    drawing = Drawing(
        size,
        size,
        transform=[
            scale_x,
            0,
            0,
            scale_y,
            -bounds[0] * scale_x,
            -bounds[1] * scale_y,
        ],
    )
    drawing.add(qr_code)

    return drawing


def draw_verification_qr(
    pdf: canvas.Canvas,
    *,
    value: str | None,
    x: float,
    y: float,
    size: float,
) -> bool:
    drawing = build_verification_qr_drawing(value, size)

    if drawing is None:
        return False

    renderPDF.draw(drawing, pdf, x, y)
    return True


def render_completion_document_pdf(context: CompletionDocumentTemplateContext) -> bytes:
    buffer = BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)

    width, height = A4
    margin = 22 * mm

    regular_font = register_pdf_fonts()
    bold_font = get_pdf_bold_font_name()

    learner_full_name = normalize_document_text(
        context.learner_full_name,
        fallback="\u0424\u0418\u041e \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0435\u0433\u043e\u0441\u044f",
    )
    course_title = normalize_document_text(
        context.course_title,
        fallback="\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430",
    )
    document_type = normalize_document_text(
        context.document_type,
        fallback="\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442",
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
    organization_name = normalize_document_text(
        context.organization_name,
        fallback="\u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043e\u0440\u0433\u0430\u043d\u0438\u0437\u0430\u0446\u0438\u044f",
    )
    organization_short_name = normalize_document_text(
        context.organization_short_name,
        fallback="",
    )
    organization_license = normalize_document_text(
        context.organization_license,
        fallback="",
    )
    document_basis = normalize_document_text(
        context.document_basis,
        fallback="",
    )
    document_place = normalize_document_text(
        context.document_place,
        fallback="",
    )
    organization_address = normalize_document_text(
        context.organization_address,
        fallback="",
    )
    organization_inn = normalize_document_text(
        context.organization_inn,
        fallback="",
    )
    organization_kpp = normalize_document_text(
        context.organization_kpp,
        fallback="",
    )
    organization_ogrn = normalize_document_text(
        context.organization_ogrn,
        fallback="",
    )
    signer_position = normalize_document_text(
        context.signer_position,
        fallback="\u041e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0435 \u043b\u0438\u0446\u043e",
    )
    signer_full_name = normalize_document_text(
        context.signer_full_name,
        fallback="",
    )

    organization_identity = " \u00b7 ".join(
        item
        for item in (
            f"\u0418\u041d\u041d {organization_inn}" if organization_inn else "",
            f"\u041a\u041f\u041f {organization_kpp}" if organization_kpp else "",
            f"\u041e\u0413\u0420\u041d {organization_ogrn}" if organization_ogrn else "",
        )
        if item
    )
    organization_meta = " \u00b7 ".join(
        item
        for item in (
            organization_identity,
            organization_license,
            document_basis,
            organization_address,
        )
        if item
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
    pdf.rect(
        margin + 6 * mm,
        margin + 6 * mm,
        width - 2 * (margin + 6 * mm),
        height - 2 * (margin + 6 * mm),
    )

    y = height - 32 * mm

    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 9)
    y = _draw_centered_wrapped_text(
        pdf,
        text=organization_name,
        y=y,
        max_width=width - 70 * mm,
        font_name=bold_font,
        font_size=9,
        leading=11,
        max_lines=2,
    )

    if organization_meta:
        y -= 1 * mm
        pdf.setFillColor(colors.HexColor("#4b5563"))
        pdf.setFont(regular_font, 7)
        y = _draw_centered_wrapped_text(
            pdf,
            text=organization_meta,
            y=y,
            max_width=width - 70 * mm,
            font_name=regular_font,
            font_size=7,
            leading=9,
            max_lines=2,
        )

    y -= 7 * mm

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
    pdf.drawCentredString(width / 2, y, f"\u2116 {document_number}")

    y -= 38 * mm

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 14)
    pdf.drawCentredString(
        width / 2,
        y,
        "\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0438\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442, \u0447\u0442\u043e",
    )

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
    pdf.drawCentredString(
        width / 2,
        y,
        "\u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043b(\u0430) \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u043e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435",
    )

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
    pdf.drawString(left_x, row_y, "\u041e\u0431\u044a\u0451\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b")
    pdf.drawString(right_x, row_y, "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f")

    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 13)
    pdf.drawString(left_x, row_y - 7 * mm, f"{course_hours} \u0430\u043a. \u0447.")
    pdf.drawString(right_x, row_y - 7 * mm, completed_date)

    row_y -= 22 * mm

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 10)
    pdf.drawString(left_x, row_y, "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438")
    pdf.drawString(right_x, row_y, "\u041c\u0435\u0441\u0442\u043e \u0432\u044b\u0434\u0430\u0447\u0438" if document_place else "\u0421\u0442\u0430\u0442\u0443\u0441")

    pdf.setFillColor(colors.HexColor("#111827"))
    pdf.setFont(bold_font, 13)
    pdf.drawString(left_x, row_y - 7 * mm, verification_code)
    pdf.drawString(
        right_x,
        row_y - 7 * mm,
        document_place or "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d \u0432 ObrPortal",
    )

    footer_y = margin + 34 * mm

    pdf.setStrokeColor(colors.HexColor("#111827"))
    pdf.setLineWidth(0.8)
    pdf.line(margin + 18 * mm, footer_y, margin + 75 * mm, footer_y)

    signature_center_x = margin + 46.5 * mm

    pdf.setFillColor(colors.HexColor("#4b5563"))
    pdf.setFont(regular_font, 8)
    pdf.drawCentredString(signature_center_x, footer_y - 6 * mm, signer_position)

    if signer_full_name:
        pdf.setFillColor(colors.HexColor("#111827"))
        pdf.setFont(bold_font, 8)
        pdf.drawCentredString(signature_center_x, footer_y - 11 * mm, signer_full_name)

    pdf.setFont(regular_font, 8)
    pdf.drawRightString(
        width - margin - 18 * mm,
        footer_y + 4 * mm,
        "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u043e\u0434\u043b\u0438\u043d\u043d\u043e\u0441\u0442\u0438:",
    )
    pdf.drawRightString(width - margin - 18 * mm, footer_y - 2 * mm, verification_url)

    qr_size = 24 * mm
    qr_x = width - margin - 18 * mm - qr_size
    qr_y = margin + 8 * mm

    if draw_verification_qr(
        pdf,
        value=verification_url if verification_url != "-" else verification_code,
        x=qr_x,
        y=qr_y,
        size=qr_size,
    ):
        pdf.setFillColor(colors.HexColor("#4b5563"))
        pdf.setFont(regular_font, 7)
        pdf.drawCentredString(qr_x + qr_size / 2, qr_y - 3 * mm, "QR")

    pdf.showPage()
    pdf.save()

    return buffer.getvalue()
