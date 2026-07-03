from __future__ import annotations

from typing import Any


LESSON_EDITOR_MODES = {
    "legacy",
    "block",
}

LESSON_PUBLICATION_STATUSES = {
    "draft",
    "published",
    "archived",
}

LESSON_BLOCK_TYPES = {
    "rich_text",
    "video",
    "audio",
    "file_link",
    "presentation",
    "quiz",
    "assignment",
    "callout",
}

LEGACY_CONTENT_TYPE_TO_BLOCK_TYPE = {
    "text": "rich_text",
    "video": "video",
    "file": "file_link",
    "link": "file_link",
    "assignment": "assignment",
}


def normalize_lesson_editor_mode(value: str | None) -> str:
    normalized = (value or "legacy").strip().lower()
    if normalized not in LESSON_EDITOR_MODES:
        raise ValueError("unsupported lesson editor mode")
    return normalized


def normalize_lesson_publication_status(value: str | None) -> str:
    normalized = (value or "published").strip().lower()
    if normalized not in LESSON_PUBLICATION_STATUSES:
        raise ValueError("unsupported lesson publication status")
    return normalized


def normalize_lesson_block_type(value: str) -> str:
    normalized = value.strip().lower()
    if normalized not in LESSON_BLOCK_TYPES:
        raise ValueError("unsupported lesson block type")
    return normalized


def build_synthetic_legacy_lesson_blocks(lesson: Any) -> list[dict[str, Any]]:
    legacy_content_type = (getattr(lesson, "content_type", None) or "text").strip().lower()
    block_type = LEGACY_CONTENT_TYPE_TO_BLOCK_TYPE.get(legacy_content_type, "rich_text")

    content_json: dict[str, Any] = {
        "legacy_content_type": legacy_content_type,
        "text": getattr(lesson, "content_text", None),
        "url": getattr(lesson, "content_url", None),
    }

    return [
        {
            "id": f"legacy-{getattr(lesson, 'id', 'lesson')}-1",
            "lesson_id": str(getattr(lesson, "id", "")),
            "block_type": block_type,
            "position": 1,
            "title": getattr(lesson, "title", None),
            "content_json": content_json,
            "settings_json": {
                "synthetic": True,
                "source": "legacy_course_lesson_fields",
            },
            "is_required": bool(getattr(lesson, "is_required", True)),
            "is_active": bool(getattr(lesson, "is_active", True)),
        }
    ]
