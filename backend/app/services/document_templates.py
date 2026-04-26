from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from html import escape
from urllib.parse import quote


@dataclass(frozen=True, slots=True)
class CompletionDocumentTemplateContext:
    learner_full_name: str
    course_title: str
    document_type: str
    document_number: str
    verification_code: str
    completed_at: datetime | None = None
    course_hours: int | None = None
    verification_url: str | None = None


def normalize_document_text(value: str | None, fallback: str = "—") -> str:
    if value is None:
        return fallback

    normalized = " ".join(str(value).split())
    return normalized or fallback


def format_document_date(value: datetime | None) -> str:
    if value is None:
        return "—"

    return value.strftime("%d.%m.%Y")


def build_document_verification_url(
    *,
    public_base_url: str | None,
    verification_code: str,
) -> str:
    safe_code = quote(normalize_document_text(verification_code, fallback="").strip(), safe="")

    if not safe_code:
        return ""

    normalized_base_url = normalize_document_text(public_base_url, fallback="").rstrip("/")

    if not normalized_base_url:
        return f"/verify/{safe_code}"

    return f"{normalized_base_url}/verify/{safe_code}"


def build_completion_document_title(
    *,
    document_type: str | None,
    course_title: str | None,
) -> str:
    safe_document_type = normalize_document_text(document_type, fallback="Сертификат")
    safe_course_title = normalize_document_text(course_title, fallback="образовательная программа")
    return f"{safe_document_type}: {safe_course_title}"


def render_completion_document_html(context: CompletionDocumentTemplateContext) -> str:
    learner_full_name = escape(
        normalize_document_text(context.learner_full_name, fallback="ФИО обучающегося")
    )
    course_title = escape(
        normalize_document_text(context.course_title, fallback="образовательная программа")
    )
    document_type = escape(
        normalize_document_text(context.document_type, fallback="Сертификат")
    )
    document_number = escape(
        normalize_document_text(context.document_number, fallback="—")
    )
    verification_code = escape(
        normalize_document_text(context.verification_code, fallback="—")
    )
    completed_date = escape(format_document_date(context.completed_at))

    if context.course_hours is None:
        course_hours = "—"
    else:
        course_hours = str(max(0, int(context.course_hours)))

    verification_url = escape(
        normalize_document_text(context.verification_url, fallback="—")
    )

    return f"""<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>{document_type} {document_number}</title>
  <style>
    :root {{
      --text: #111827;
      --muted: #4b5563;
      --border: #d1d5db;
      --accent: #1d4ed8;
      --bg: #ffffff;
    }}

    * {{
      box-sizing: border-box;
    }}

    body {{
      margin: 0;
      padding: 48px;
      background: var(--bg);
      color: var(--text);
      font-family: "DejaVu Sans", Arial, sans-serif;
      line-height: 1.45;
    }}

    .document {{
      min-height: 980px;
      border: 8px solid var(--border);
      padding: 56px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }}

    .header {{
      text-align: center;
    }}

    .document-type {{
      margin: 0;
      color: var(--accent);
      font-size: 42px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }}

    .document-number {{
      margin-top: 12px;
      color: var(--muted);
      font-size: 16px;
    }}

    .content {{
      margin: 80px 0;
      text-align: center;
    }}

    .caption {{
      color: var(--muted);
      font-size: 18px;
    }}

    .learner {{
      margin: 18px 0 28px;
      font-size: 36px;
      font-weight: 700;
    }}

    .course {{
      margin: 18px auto 0;
      max-width: 760px;
      font-size: 28px;
      font-weight: 600;
    }}

    .meta {{
      margin-top: 42px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      text-align: left;
    }}

    .meta-card {{
      border: 1px solid var(--border);
      padding: 16px 18px;
      border-radius: 12px;
    }}

    .meta-label {{
      color: var(--muted);
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }}

    .meta-value {{
      margin-top: 6px;
      font-size: 18px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }}

    .footer {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 32px;
      align-items: end;
    }}

    .signature-line {{
      border-top: 1px solid var(--text);
      padding-top: 10px;
      color: var(--muted);
      font-size: 14px;
      text-align: center;
    }}

    .verification {{
      color: var(--muted);
      font-size: 13px;
      text-align: right;
      overflow-wrap: anywhere;
    }}
  </style>
</head>
<body>
  <main class="document">
    <section class="header">
      <h1 class="document-type">{document_type}</h1>
      <div class="document-number">№ {document_number}</div>
    </section>

    <section class="content">
      <div class="caption">Настоящий документ подтверждает, что</div>
      <div class="learner">{learner_full_name}</div>
      <div class="caption">успешно завершил(а) обучение по программе</div>
      <div class="course">{course_title}</div>

      <div class="meta">
        <div class="meta-card">
          <div class="meta-label">Объём программы</div>
          <div class="meta-value">{course_hours} ак. ч.</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Дата завершения</div>
          <div class="meta-value">{completed_date}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Код проверки</div>
          <div class="meta-value">{verification_code}</div>
        </div>
        <div class="meta-card">
          <div class="meta-label">Статус</div>
          <div class="meta-value">Документ сформирован в ObrPortal</div>
        </div>
      </div>
    </section>

    <section class="footer">
      <div class="signature-line">Ответственное лицо</div>
      <div class="verification">
        Проверка подлинности:<br />
        {verification_url}
      </div>
    </section>
  </main>
</body>
</html>
"""
