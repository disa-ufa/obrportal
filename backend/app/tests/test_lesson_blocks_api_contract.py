from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
ADMIN_API = ROOT / "backend" / "app" / "api" / "v1" / "admin.py"


def read_admin_api() -> str:
    return ADMIN_API.read_text(encoding="utf-8")


def test_lesson_block_admin_routes_are_registered() -> None:
    text = read_admin_api()

    assert '@router.get("/course-lessons/{lesson_id}/blocks"' in text
    assert '@router.post(\n    "/course-lessons/{lesson_id}/blocks"' in text
    assert '@router.patch("/lesson-blocks/{block_id}"' in text
    assert '@router.delete("/lesson-blocks/{block_id}"' in text
    assert '@router.post("/course-lessons/{lesson_id}/blocks/reorder"' in text


def test_lesson_block_create_data_normalization_contract() -> None:
    text = read_admin_api()

    assert "def normalize_lesson_block_create_data" in text
    assert 'normalized["block_type"] = normalize_lesson_block_type' in text
    assert 'normalized["title"] = normalize_optional_text' in text
    assert "Lesson block content_json must be an object" in text
    assert "Lesson block settings_json must be an object" in text


def test_lesson_block_update_data_normalization_contract() -> None:
    text = read_admin_api()

    assert "def normalize_lesson_block_update_data" in text
    assert 'if "block_type" in normalized' in text
    assert 'normalize_lesson_block_type(normalized["block_type"])' in text
    assert 'if "content_json" in normalized' in text
    assert 'if "settings_json" in normalized' in text


def test_lesson_block_legacy_adapter_and_audit_contract() -> None:
    text = read_admin_api()

    assert "build_synthetic_legacy_lesson_blocks(lesson)" in text
    assert "build_admin_lesson_block_item_from_legacy_dict" in text
    assert "admin.lesson_block_created" in text
    assert "admin.lesson_block_updated" in text
    assert "admin.lesson_block_deleted" in text
    assert "admin.lesson_blocks_reordered" in text
