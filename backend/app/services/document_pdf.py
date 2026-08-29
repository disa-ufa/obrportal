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



def fit_text_font_size(
    text: str,
    *,
    font_name: str,
    preferred_size: float,
    min_size: float,
    max_width: float,
) -> float:
    candidate = float(preferred_size)
    minimum = float(min_size)

    while candidate > minimum:
        if pdfmetrics.stringWidth(
            text,
            font_name,
            candidate,
        ) <= max_width:
            return candidate

        candidate = max(
            minimum,
            candidate - 0.5,
        )

    return minimum


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

    outer_margin = 12 * mm
    inner_margin = 16 * mm
    content_left = 24 * mm
    content_right = width - 24 * mm
    content_width = content_right - content_left

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
            f"\u0418\u041d\u041d {organization_inn}"
            if organization_inn
            else "",
            f"\u041a\u041f\u041f {organization_kpp}"
            if organization_kpp
            else "",
            f"\u041e\u0413\u0420\u041d {organization_ogrn}"
            if organization_ogrn
            else "",
        )
        if item
    )

    metadata_candidates = (
        organization_identity,
        organization_license,
        document_basis,
        organization_address,
    )

    metadata_parts: list[str] = []
    metadata_seen: set[str] = set()

    for item in metadata_candidates:
        normalized_item = item.strip()

        if not normalized_item:
            continue

        dedupe_key = normalized_item.casefold()

        if dedupe_key in metadata_seen:
            continue

        metadata_seen.add(dedupe_key)
        metadata_parts.append(normalized_item)

    organization_meta = " \u00b7 ".join(
        metadata_parts
    )

    completed_date = format_document_date(
        context.completed_at
    )

    if context.course_hours is None:
        course_hours = "-"
    else:
        course_hours = str(
            max(
                0,
                int(context.course_hours),
            )
        )

    pdf.setTitle(
        f"{document_type} {document_number}"
    )
    pdf.setAuthor("ObrPortal")
    pdf.setSubject(
        "Completion document"
    )

    blue = colors.HexColor("#1D4ED8")
    navy = colors.HexColor("#172554")
    text = colors.HexColor("#111827")
    muted = colors.HexColor("#64748B")
    border = colors.HexColor("#CBD5E1")
    soft_blue = colors.HexColor("#EFF6FF")
    soft_gray = colors.HexColor("#F8FAFC")
    divider = colors.HexColor("#E2E8F0")

    # Outer certificate frame.
    pdf.setStrokeColor(border)
    pdf.setLineWidth(2.2)
    pdf.rect(
        outer_margin,
        outer_margin,
        width - 2 * outer_margin,
        height - 2 * outer_margin,
    )

    pdf.setStrokeColor(blue)
    pdf.setLineWidth(0.9)
    pdf.rect(
        inner_margin,
        inner_margin,
        width - 2 * inner_margin,
        height - 2 * inner_margin,
    )

    # Restrained ObrPortal accent.
    pdf.setFillColor(blue)
    pdf.rect(
        inner_margin,
        height - 23 * mm,
        width - 2 * inner_margin,
        2.4 * mm,
        fill=1,
        stroke=0,
    )

    # Header.
    y = height - 31 * mm

    pdf.setFillColor(navy)
    organization_font_size = fit_text_font_size(
        organization_name,
        font_name=bold_font,
        preferred_size=11,
        min_size=8,
        max_width=content_width,
    )
    pdf.setFont(
        bold_font,
        organization_font_size,
    )
    pdf.drawCentredString(
        width / 2,
        y,
        organization_name,
    )

    if organization_meta:
        y -= 6 * mm

        pdf.setFillColor(muted)
        pdf.setFont(regular_font, 6.8)

        meta_lines = simpleSplit(
            organization_meta,
            regular_font,
            6.8,
            content_width,
        )[:3]

        for line in meta_lines:
            pdf.drawCentredString(
                width / 2,
                y,
                line,
            )
            y -= 3.4 * mm

    y -= 2.5 * mm

    pdf.setStrokeColor(divider)
    pdf.setLineWidth(0.8)
    pdf.line(
        content_left,
        y,
        content_right,
        y,
    )

    # Document title.
    title_y = y - 15 * mm

    pdf.setFillColor(blue)

    title_size = fit_text_font_size(
        document_type.upper(),
        font_name=bold_font,
        preferred_size=30,
        min_size=20,
        max_width=content_width,
    )

    pdf.setFont(
        bold_font,
        title_size,
    )
    pdf.drawCentredString(
        width / 2,
        title_y,
        document_type.upper(),
    )

    pdf.setFillColor(muted)
    pdf.setFont(regular_font, 9)
    pdf.drawCentredString(
        width / 2,
        title_y - 9 * mm,
        f"\u2116 {document_number}",
    )

    # Main recognition block.
    main_y = title_y - 30 * mm

    pdf.setFillColor(muted)
    pdf.setFont(regular_font, 11.5)
    pdf.drawCentredString(
        width / 2,
        main_y,
        "\u041d\u0430\u0441\u0442\u043e\u044f\u0449\u0438\u0439 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u043f\u043e\u0434\u0442\u0432\u0435\u0440\u0436\u0434\u0430\u0435\u0442, \u0447\u0442\u043e",
    )

    main_y -= 12 * mm

    pdf.setFillColor(text)
    learner_size = fit_text_font_size(
        learner_full_name,
        font_name=bold_font,
        preferred_size=22,
        min_size=14,
        max_width=content_width - 8 * mm,
    )
    pdf.setFont(
        bold_font,
        learner_size,
    )

    main_y = _draw_centered_wrapped_text(
        pdf,
        text=learner_full_name,
        y=main_y,
        max_width=content_width - 8 * mm,
        font_name=bold_font,
        font_size=int(learner_size),
        leading=max(
            18,
            int(learner_size + 4),
        ),
        max_lines=2,
    )

    main_y -= 4 * mm

    pdf.setFillColor(muted)
    pdf.setFont(regular_font, 11.5)
    pdf.drawCentredString(
        width / 2,
        main_y,
        "\u0443\u0441\u043f\u0435\u0448\u043d\u043e \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043b(\u0430) \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043f\u043e \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0435",
    )

    main_y -= 11 * mm

    pdf.setFillColor(navy)
    course_size = fit_text_font_size(
        course_title,
        font_name=bold_font,
        preferred_size=17,
        min_size=12,
        max_width=content_width - 6 * mm,
    )
    pdf.setFont(
        bold_font,
        course_size,
    )

    main_y = _draw_centered_wrapped_text(
        pdf,
        text=course_title,
        y=main_y,
        max_width=content_width - 6 * mm,
        font_name=bold_font,
        font_size=int(course_size),
        leading=max(
            16,
            int(course_size + 5),
        ),
        max_lines=3,
    )

    # Three-column details band.
    details_top = min(
        main_y - 7 * mm,
        123 * mm,
    )

    details_bottom = details_top - 27 * mm

    pdf.setFillColor(soft_gray)
    pdf.setStrokeColor(divider)
    pdf.setLineWidth(0.7)
    pdf.rect(
        content_left,
        details_bottom,
        content_width,
        27 * mm,
        fill=1,
        stroke=1,
    )

    column_gap = 4 * mm
    column_width = (
        content_width
        - 2 * column_gap
    ) / 3

    column_x = [
        content_left,
        content_left
        + column_width
        + column_gap,
        content_left
        + 2 * (
            column_width
            + column_gap
        ),
    ]

    detail_labels = [
        "\u041e\u0431\u044a\u0451\u043c \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u044b",
        "\u0414\u0430\u0442\u0430 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043d\u0438\u044f",
        "\u041d\u043e\u043c\u0435\u0440 \u0434\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u0430",
    ]

    detail_values = [
        f"{course_hours} \u0430\u043a. \u0447.",
        completed_date,
        document_number,
    ]

    for index in range(3):
        x = column_x[index]

        if index > 0:
            separator_x = (
                x
                - column_gap / 2
            )

            pdf.setStrokeColor(divider)
            pdf.setLineWidth(0.7)
            pdf.line(
                separator_x,
                details_bottom + 5 * mm,
                separator_x,
                details_top - 5 * mm,
            )

        pdf.setFillColor(muted)
        pdf.setFont(regular_font, 7.5)
        pdf.drawString(
            x + 4 * mm,
            details_top - 8 * mm,
            detail_labels[index],
        )

        value_size = fit_text_font_size(
            detail_values[index],
            font_name=bold_font,
            preferred_size=12.5,
            min_size=7,
            max_width=column_width - 8 * mm,
        )

        pdf.setFillColor(text)
        pdf.setFont(
            bold_font,
            value_size,
        )
        pdf.drawString(
            x + 4 * mm,
            details_top - 17 * mm,
            detail_values[index],
        )

    # Verification panel.
    panel_x = content_left
    panel_y = 48 * mm
    panel_width = content_width
    panel_height = 35 * mm

    pdf.setFillColor(soft_blue)
    pdf.setStrokeColor(
        colors.HexColor("#BFDBFE")
    )
    pdf.setLineWidth(0.9)
    pdf.rect(
        panel_x,
        panel_y,
        panel_width,
        panel_height,
        fill=1,
        stroke=1,
    )

    qr_size = 25 * mm
    qr_x = (
        panel_x
        + panel_width
        - qr_size
        - 6 * mm
    )
    qr_y = (
        panel_y
        + (
            panel_height
            - qr_size
        ) / 2
    )

    verification_text_x = (
        panel_x + 6 * mm
    )
    verification_text_right = (
        qr_x - 7 * mm
    )
    verification_text_width = (
        verification_text_right
        - verification_text_x
    )

    pdf.setFillColor(blue)
    pdf.setFont(bold_font, 10)
    pdf.drawString(
        verification_text_x,
        panel_y + panel_height - 8 * mm,
        "\u041f\u0440\u043e\u0432\u0435\u0440\u043a\u0430 \u043f\u043e\u0434\u043b\u0438\u043d\u043d\u043e\u0441\u0442\u0438:",
    )

    pdf.setFillColor(muted)
    pdf.setFont(regular_font, 7.2)
    pdf.drawString(
        verification_text_x,
        panel_y + panel_height - 14 * mm,
        "\u041a\u043e\u0434 \u043f\u0440\u043e\u0432\u0435\u0440\u043a\u0438",
    )

    code_size = fit_text_font_size(
        verification_code,
        font_name=bold_font,
        preferred_size=9.5,
        min_size=6,
        max_width=verification_text_width,
    )

    pdf.setFillColor(text)
    pdf.setFont(
        bold_font,
        code_size,
    )
    pdf.drawString(
        verification_text_x,
        panel_y + panel_height - 20 * mm,
        verification_code,
    )

    verification_value = (
        verification_url
        if verification_url != "-"
        else verification_code
    )

    pdf.setFillColor(muted)

    verification_url_size = fit_text_font_size(
        verification_value,
        font_name=regular_font,
        preferred_size=6.5,
        min_size=4.8,
        max_width=verification_text_width,
    )

    pdf.setFont(
        regular_font,
        verification_url_size,
    )
    pdf.drawString(
        verification_text_x,
        panel_y + 7 * mm,
        verification_value,
    )

    draw_verification_qr(
        pdf,
        value=verification_value,
        x=qr_x,
        y=qr_y,
        size=qr_size,
    )

    # Signature block.
    signature_line_y = 34 * mm
    signature_left = content_left + 4 * mm
    signature_right = content_left + 67 * mm

    pdf.setStrokeColor(
        colors.HexColor("#94A3B8")
    )
    pdf.setLineWidth(0.8)
    pdf.line(
        signature_left,
        signature_line_y,
        signature_right,
        signature_line_y,
    )

    signature_center_x = (
        signature_left
        + signature_right
    ) / 2

    pdf.setFillColor(muted)
    pdf.setFont(regular_font, 7.5)
    pdf.drawCentredString(
        signature_center_x,
        signature_line_y - 5 * mm,
        signer_position,
    )

    if signer_full_name:
        signer_size = fit_text_font_size(
            signer_full_name,
            font_name=bold_font,
            preferred_size=8.5,
            min_size=6,
            max_width=(
                signature_right
                - signature_left
            ),
        )

        pdf.setFillColor(text)
        pdf.setFont(
            bold_font,
            signer_size,
        )
        pdf.drawCentredString(
            signature_center_x,
            signature_line_y - 10 * mm,
            signer_full_name,
        )

    if document_place:
        pdf.setFillColor(muted)
        pdf.setFont(regular_font, 7.5)
        pdf.drawRightString(
            content_right,
            signature_line_y - 5 * mm,
            document_place,
        )

    # Small service footer, intentionally separated
    # from the verification code.
    pdf.setFillColor(
        colors.HexColor("#94A3B8")
    )
    pdf.setFont(regular_font, 6.5)
    pdf.drawCentredString(
        width / 2,
        18 * mm,
        "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442 \u0441\u0444\u043e\u0440\u043c\u0438\u0440\u043e\u0432\u0430\u043d \u0432 ObrPortal",
    )

    pdf.showPage()
    pdf.save()

    return buffer.getvalue()
