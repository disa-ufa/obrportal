from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-blocks-api-payload.md"
PUBLIC_API = ROOT / "backend" / "app" / "api" / "v1" / "public.py"
ACCOUNT_API = ROOT / "backend" / "app" / "api" / "v1" / "account.py"
PUBLIC_SCHEMA = ROOT / "backend" / "app" / "schemas" / "public.py"
ACCOUNT_SCHEMA = ROOT / "backend" / "app" / "schemas" / "account.py"
TEST_FILE = ROOT / "backend" / "app" / "tests" / "test_lesson_block_payload_api.py"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.8 lesson blocks API payload guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
public_api = read(PUBLIC_API)
account_api = read(ACCOUNT_API)
public_schema = read(PUBLIC_SCHEMA)
account_schema = read(ACCOUNT_SCHEMA)
test_file = read(TEST_FILE)

for name, text in {
    "stage doc": stage_doc,
    "public api": public_api,
    "account api": account_api,
    "public schema": public_schema,
    "account schema": account_schema,
}.items():
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

for marker in [
    "stage82_8_status=lesson_blocks_api_payload_implemented",
    "stage82_8_public_payload_blocks=yes",
    "stage82_8_account_payload_blocks=yes",
    "stage82_8_frontend_changed=no",
    "stage82_8_backend_changed=yes",
    "stage82_8_database_changed=no",
    "stage82_8_database_migration_required=no",
]:
    require(stage_doc, marker, "stage doc")

for marker in [
    "from app.models.lesson_block import LessonBlock",
    "PublicLessonBlockResponse",
    "def build_public_lesson_block",
    "blocks_by_lesson_id: dict[str, list[LessonBlock]]",
    "LessonBlock.lesson_id.in_(lesson_ids)",
    "LessonBlock.is_active.is_(True)",
    "blocks=[build_public_lesson_block(block) for block in lesson_blocks]",
]:
    require(public_api, marker, "public api")

for marker in [
    "from app.models.lesson_block import LessonBlock",
    "AccountLessonBlockResponse",
    "def build_account_lesson_block",
    "blocks_by_lesson_id: dict[str, list[LessonBlock]]",
    "LessonBlock.lesson_id.in_(lesson_ids)",
    "LessonBlock.is_active.is_(True)",
    "blocks=[build_account_lesson_block(block) for block in lesson_blocks]",
]:
    require(account_api, marker, "account api")

for marker in [
    "class PublicLessonBlockResponse",
    "content_json: dict[str, Any]",
    "settings_json: dict[str, Any]",
    "blocks: list[PublicLessonBlockResponse]",
]:
    require(public_schema, marker, "public schema")

for marker in [
    "class AccountLessonBlockResponse",
    "content_json: dict[str, Any]",
    "settings_json: dict[str, Any]",
    "blocks: list[AccountLessonBlockResponse]",
]:
    require(account_schema, marker, "account schema")

for marker in [
    "test_public_course_detail_includes_active_lesson_blocks",
    "test_account_course_detail_includes_active_lesson_blocks",
    "/api/v1/public/courses/",
    "/api/v1/account/courses/",
    "content_json",
]:
    require(test_file, marker, "backend test")

if manifest.get("current_stage") != "82.8":
    fail("current_stage must be 82.8")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["81.15", "82.1", "82.2", "82.3", "82.4", "82.5", "82.6", "82.7", "82.8"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.8"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.8 status mismatch")
if stage.get("branch") != "stage82-8-lesson-blocks-api-payload":
    fail("stage 82.8 branch mismatch")
if stage.get("deployment_type") != "backend-only":
    fail("stage 82.8 deployment_type mismatch")
if stage.get("database_migration_required") is not False:
    fail("stage 82.8 database_migration_required must be false")
if stage.get("backend_runtime_changed") is not True:
    fail("stage 82.8 backend_runtime_changed must be true")
if stage.get("frontend_runtime_changed") is not False:
    fail("stage 82.8 frontend_runtime_changed must be false")
if stage.get("public_payload_blocks") is not True:
    fail("stage 82.8 public_payload_blocks must be true")
if stage.get("account_payload_blocks") is not True:
    fail("stage 82.8 account_payload_blocks must be true")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.8 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.8 password_committed must be false")

print("stage 82.8 lesson blocks API payload guard passed")
