from __future__ import annotations

from types import SimpleNamespace

from app.services.lesson_readiness import (
    build_admin_lesson_readiness_payload,
    get_lesson_block_readiness_issues,
    lesson_readiness_has_tiptap_text,
    normalize_admin_lesson_readiness_payload,
)


def make_lesson(**overrides):
    values = {
        "content_type": "text",
        "content_text": "",
        "content_url": "",
        "description": "",
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def make_block(**overrides):
    values = {
        "block_type": "rich_text",
        "content_json": {},
        "title": "Block title",
        "position": 1,
        "is_active": True,
    }
    values.update(overrides)
    return SimpleNamespace(**values)


def test_tiptap_text_readiness_detects_text():
    payload = {
        "type": "doc",
        "content": [
            {
                "type": "paragraph",
                "content": [{"type": "text", "text": "Hello"}],
            }
        ],
    }

    assert lesson_readiness_has_tiptap_text(payload) is True


def test_rich_text_block_without_text_has_issue():
    block = make_block(content_json={"text": ""})

    assert "\u043d\u0435\u0442 \u0442\u0435\u043a\u0441\u0442\u0430" in get_lesson_block_readiness_issues(block)


def test_studio_blocks_make_lesson_ready_when_active_blocks_have_content():
    lesson = make_lesson()
    block = make_block(content_json={"text": "Filled content"})

    payload = build_admin_lesson_readiness_payload(lesson, [block])

    assert payload["blocks_count"] == 1
    assert payload["active_blocks_count"] == 1
    assert payload["problem_blocks_count"] == 0
    assert payload["is_content_ready"] is True
    assert payload["readiness_status"] == "ready"
    assert payload["readiness_issues"] == []


def test_studio_blocks_report_problem_when_required_content_missing():
    lesson = make_lesson()
    block = make_block(title="Intro", content_json={"text": ""})

    payload = build_admin_lesson_readiness_payload(lesson, [block])

    assert payload["blocks_count"] == 1
    assert payload["active_blocks_count"] == 1
    assert payload["problem_blocks_count"] == 1
    assert payload["is_content_ready"] is False
    assert payload["readiness_status"] == "needs_work"
    assert payload["readiness_issues"]


def test_legacy_lesson_without_blocks_can_still_be_ready():
    lesson = make_lesson(content_type="text", content_text="Legacy content")

    payload = build_admin_lesson_readiness_payload(lesson, [])

    assert payload["blocks_count"] == 0
    assert payload["is_content_ready"] is True
    assert payload["readiness_status"] == "legacy_ready"


def test_normalize_admin_lesson_readiness_payload_defaults_are_safe():
    payload = normalize_admin_lesson_readiness_payload()

    assert payload == {
        "blocks_count": 0,
        "active_blocks_count": 0,
        "problem_blocks_count": 0,
        "is_content_ready": False,
        "readiness_status": "empty",
        "readiness_issues": [],
    }
