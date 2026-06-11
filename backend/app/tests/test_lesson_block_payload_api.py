from __future__ import annotations

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[2]
APP_ROOT = BACKEND_ROOT / "app"

PUBLIC_API = APP_ROOT / "api" / "v1" / "public.py"
ACCOUNT_API = APP_ROOT / "api" / "v1" / "account.py"
PUBLIC_SCHEMA = APP_ROOT / "schemas" / "public.py"
ACCOUNT_SCHEMA = APP_ROOT / "schemas" / "account.py"

PUBLIC_COURSE_ENDPOINT_MARKER = "/api/v1/public/courses/"
ACCOUNT_COURSE_ENDPOINT_MARKER = "/api/v1/account/courses/"


def read(path: Path) -> str:
    assert path.exists(), f"missing file: {path}"
    return path.read_text(encoding="utf-8")


def test_public_course_detail_includes_active_lesson_blocks() -> None:
    public_api = read(PUBLIC_API)
    public_schema = read(PUBLIC_SCHEMA)

    assert PUBLIC_COURSE_ENDPOINT_MARKER
    assert "from app.models.lesson_block import LessonBlock" in public_api
    assert "PublicLessonBlockResponse" in public_api
    assert "def build_public_lesson_block" in public_api
    assert "content_json=block.content_json or {}" in public_api
    assert "settings_json=block.settings_json or {}" in public_api
    assert "blocks_by_lesson_id: dict[str, list[LessonBlock]]" in public_api
    assert "LessonBlock.lesson_id.in_(lesson_ids)" in public_api
    assert "LessonBlock.is_active.is_(True)" in public_api
    assert "blocks=[build_public_lesson_block(block) for block in lesson_blocks]" in public_api
    assert "blocks_by_lesson_id=blocks_by_lesson_id" in public_api

    assert "class PublicLessonBlockResponse" in public_schema
    assert "content_json: dict[str, Any]" in public_schema
    assert "settings_json: dict[str, Any]" in public_schema
    assert "blocks: list[PublicLessonBlockResponse] = Field(default_factory=list)" in public_schema


def test_account_course_detail_includes_active_lesson_blocks() -> None:
    account_api = read(ACCOUNT_API)
    account_schema = read(ACCOUNT_SCHEMA)

    assert ACCOUNT_COURSE_ENDPOINT_MARKER
    assert "from app.models.lesson_block import LessonBlock" in account_api
    assert "AccountLessonBlockResponse" in account_api
    assert "def build_account_lesson_block" in account_api
    assert "content_json=block.content_json or {}" in account_api
    assert "settings_json=block.settings_json or {}" in account_api
    assert "blocks_by_lesson_id: dict[str, list[LessonBlock]]" in account_api
    assert "LessonBlock.lesson_id.in_(lesson_ids)" in account_api
    assert "LessonBlock.is_active.is_(True)" in account_api
    assert "blocks=[build_account_lesson_block(block) for block in lesson_blocks]" in account_api
    assert "blocks_by_lesson_id=blocks_by_lesson_id" in account_api

    assert "class AccountLessonBlockResponse" in account_schema
    assert "content_json: dict[str, Any]" in account_schema
    assert "settings_json: dict[str, Any]" in account_schema
    assert "blocks: list[AccountLessonBlockResponse] = Field(default_factory=list)" in account_schema
