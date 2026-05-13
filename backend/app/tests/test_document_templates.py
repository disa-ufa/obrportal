from __future__ import annotations

from datetime import datetime, timezone

from app.services.document_templates import (
    CompletionDocumentTemplateContext,
    build_completion_document_title,
    build_document_verification_url,
    format_document_date,
    normalize_document_text,
    render_completion_document_html,
)


def test_normalize_document_text_strips_extra_spaces() -> None:
    assert normalize_document_text("  Иван   Иванов  ") == "Иван Иванов"
    assert normalize_document_text("") == "—"
    assert normalize_document_text(None, fallback="Нет данных") == "Нет данных"


def test_format_document_date_returns_russian_date() -> None:
    completed_at = datetime(2026, 4, 26, 12, 30, tzinfo=timezone.utc)

    assert format_document_date(completed_at) == "26.04.2026"
    assert format_document_date(None) == "—"


def test_build_document_verification_url_uses_public_base_url() -> None:
    url = build_document_verification_url(
        public_base_url="https://obrportal.example.ru/",
        verification_code="DOCV-ABC 123",
    )

    assert url == "https://obrportal.example.ru/verify/DOCV-ABC%20123"


def test_build_document_verification_url_falls_back_to_relative_url() -> None:
    url = build_document_verification_url(
        public_base_url=None,
        verification_code="DOCV-ABC123",
    )

    assert url == "/verify/DOCV-ABC123"


def test_build_completion_document_title_uses_safe_fallbacks() -> None:
    assert (
        build_completion_document_title(
            document_type="Удостоверение",
            course_title="Python для начинающих",
        )
        == "Удостоверение: Python для начинающих"
    )

    assert (
        build_completion_document_title(
            document_type=None,
            course_title=None,
        )
        == "Сертификат: образовательная программа"
    )


def test_render_completion_document_html_contains_required_fields() -> None:
    html = render_completion_document_html(
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

    assert "<!doctype html>" in html
    assert 'lang="ru"' in html
    assert "Иванов Иван Иванович" in html
    assert "Основы программирования на Python" in html
    assert "Сертификат" in html
    assert "AUTO-1234567890ABCDEF" in html
    assert "DOCV-ABC123" in html
    assert "26.04.2026" in html
    assert "72 ак. ч." in html
    assert "https://obrportal.example.ru/verify/DOCV-ABC123" in html


def test_render_completion_document_html_escapes_unsafe_values() -> None:
    html = render_completion_document_html(
        CompletionDocumentTemplateContext(
            learner_full_name='<script>alert("x")</script>',
            course_title="<b>Danger course</b>",
            document_type="Сертификат",
            document_number="AUTO-123",
            verification_code="DOCV-123",
            completed_at=None,
            course_hours=None,
            verification_url="/verify/DOCV-123",
        )
    )

    assert '<script>alert("x")</script>' not in html
    assert "<b>Danger course</b>" not in html
    assert "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;" in html
    assert "&lt;b&gt;Danger course&lt;/b&gt;" in html
    assert "— ак. ч." in html
    assert "Дата завершения" in html
