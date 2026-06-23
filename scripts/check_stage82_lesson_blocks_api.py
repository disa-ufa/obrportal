from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-blocks-api.md"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.3 lesson blocks API guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
admin_api = read(ROOT / "backend/app/api/v1/admin.py")
test_file = read(ROOT / "backend/app/tests/test_lesson_blocks_api_contract.py")

if EMAIL_RE.search(stage_doc):
    fail("stage doc contains raw email-like value")
if PHONE_RE.search(stage_doc):
    fail("stage doc contains raw phone-like value")

for marker in [
    "Stage 82.3 - lesson blocks backend API",
    "stage82_3_status=lesson_blocks_backend_api_implemented",
    "stage82_3_endpoints=get_list_create_update_delete_reorder",
    "stage82_3_legacy_adapter=synthetic_legacy_block_on_list",
    "stage82_3_database_migration_required=no",
]:
    require(stage_doc, marker, "stage82.3 doc")

for marker in [
    "from app.models.lesson_block import LessonBlock",
    "AdminLessonBlockCreate",
    "AdminLessonBlockDetail",
    "AdminLessonBlockItem",
    "AdminLessonBlockReorder",
    "AdminLessonBlockUpdate",
    "build_synthetic_legacy_lesson_blocks",
    "normalize_lesson_block_type",
    "\"/course-lessons/{lesson_id}/blocks\"",
    "\"/lesson-blocks/{block_id}\"",
    "\"/course-lessons/{lesson_id}/blocks/reorder\"",
    "admin.lesson_block_created",
    "admin.lesson_block_updated",
    "admin.lesson_block_deleted",
    "admin.lesson_blocks_reordered",
    "build_admin_lesson_block_item_from_legacy_dict",
]:
    require(admin_api, marker, "admin API")

for marker in [
    "test_lesson_block_admin_routes_are_registered",
    "test_lesson_block_create_data_normalization_contract",
    "test_lesson_block_update_data_normalization_contract",
    "test_lesson_block_legacy_adapter_and_audit_contract",
]:
    require(test_file, marker, "API contract test")

if manifest.get("current_stage") != "82.3":
    fail("current_stage must be 82.3")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["81.15", "82.1", "82.2", "82.3"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.3"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.3 status mismatch")
if stage.get("branch") != "stage82-3-lesson-blocks-api":
    fail("stage 82.3 branch mismatch")
if stage.get("deployment_type") != "backend-api":
    fail("stage 82.3 deployment_type mismatch")
if stage.get("database_migration_required") is not False:
    fail("stage 82.3 database_migration_required must be false")
if stage.get("backend_runtime_changed") is not True:
    fail("stage 82.3 backend_runtime_changed must be true")
if stage.get("frontend_runtime_changed") is not False:
    fail("stage 82.3 frontend_runtime_changed must be false")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.3 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.3 password_committed must be false")

print("stage 82.3 lesson blocks API guard passed")
