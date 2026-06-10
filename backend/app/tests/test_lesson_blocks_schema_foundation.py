from __future__ import annotations

from types import SimpleNamespace

from app.models.course_lesson import CourseLesson
from app.models.lesson_block import LessonBlock
from app.services.lesson_blocks import (
    LESSON_BLOCK_TYPES,
    build_synthetic_legacy_lesson_blocks,
    normalize_lesson_block_type,
    normalize_lesson_editor_mode,
    normalize_lesson_publication_status,
)


def test_course_lesson_has_block_editor_foundation_fields() -> None:
    assert hasattr(CourseLesson, "editor_mode")
    assert hasattr(CourseLesson, "status")
    assert hasattr(CourseLesson, "published_version_id")


def test_lesson_block_model_contract() -> None:
    assert LessonBlock.__tablename__ == "lesson_blocks"
    columns = LessonBlock.__table__.columns

    for name in [
        "id",
        "lesson_id",
        "block_type",
        "position",
        "title",
        "content_json",
        "settings_json",
        "is_required",
        "is_active",
        "created_at",
        "updated_at",
    ]:
        assert name in columns


def test_lesson_block_type_normalization() -> None:
    assert "rich_text" in LESSON_BLOCK_TYPES
    assert "video" in LESSON_BLOCK_TYPES
    assert "file_link" in LESSON_BLOCK_TYPES
    assert "quiz" in LESSON_BLOCK_TYPES
    assert "assignment" in LESSON_BLOCK_TYPES
    assert "callout" in LESSON_BLOCK_TYPES

    assert normalize_lesson_block_type(" Video ") == "video"
    assert normalize_lesson_editor_mode(None) == "legacy"
    assert normalize_lesson_editor_mode(" BLOCK ") == "block"
    assert normalize_lesson_publication_status(None) == "published"
    assert normalize_lesson_publication_status(" DRAFT ") == "draft"


def test_legacy_lesson_can_be_exposed_as_synthetic_block() -> None:
    lesson = SimpleNamespace(
        id="lesson-1",
        title="Legacy lesson",
        content_type="video",
        content_text="Legacy text",
        content_url="https://example.invalid/video",
        is_required=True,
        is_active=True,
    )

    blocks = build_synthetic_legacy_lesson_blocks(lesson)

    assert len(blocks) == 1
    block = blocks[0]
    assert block["id"] == "legacy-lesson-1-1"
    assert block["lesson_id"] == "lesson-1"
    assert block["block_type"] == "video"
    assert block["position"] == 1
    assert block["title"] == "Legacy lesson"
    assert block["content_json"]["legacy_content_type"] == "video"
    assert block["content_json"]["text"] == "Legacy text"
    assert block["content_json"]["url"] == "https://example.invalid/video"
    assert block["settings_json"]["synthetic"] is True
    assert block["is_required"] is True
    assert block["is_active"] is True
