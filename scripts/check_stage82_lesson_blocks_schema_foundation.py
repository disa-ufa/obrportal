from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-blocks-schema-foundation.md"

REQUIRED_FILES = [
    "backend/alembic/versions/6422_lesson_blocks_schema_foundation.py",
    "backend/app/models/lesson_block.py",
    "backend/app/services/lesson_blocks.py",
    "backend/app/tests/test_lesson_blocks_schema_foundation.py",
    "docs/stage82-lesson-blocks-schema-foundation.md",
]

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.2 lesson blocks schema foundation guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

if EMAIL_RE.search(stage_doc):
    fail("stage doc contains raw email-like value")
if PHONE_RE.search(stage_doc):
    fail("stage doc contains raw phone-like value")

for file_name in REQUIRED_FILES:
    if not (ROOT / file_name).exists():
        fail(f"required file missing: {file_name}")

for marker in [
    "Stage 82.2 - lesson blocks schema foundation",
    "stage82_2_status=lesson_blocks_schema_foundation_implemented",
    "stage82_2_new_table=lesson_blocks",
    "stage82_2_migration=6422_lesson_blocks_schema",
    "stage82_2_legacy_fields_preserved=yes",
    "stage82_2_mvp_block_types=rich_text,video,file_link,quiz,assignment,callout",
    "stage82_2_backward_compatibility=legacy_dual_read_synthetic_blocks",
    "build_synthetic_legacy_lesson_blocks",
    "Do not restart frontend for this stage",
]:
    require(stage_doc, marker, "stage82.2 doc")

migration = read(ROOT / "backend/alembic/versions/6422_lesson_blocks_schema_foundation.py")
for marker in [
    'revision = "6422_lesson_blocks_schema"',
    'down_revision = "6421_org_doc_profile"',
    'op.add_column(',
    '"editor_mode"',
    '"status"',
    '"published_version_id"',
    'op.create_table(',
    '"lesson_blocks"',
    'sa.ForeignKeyConstraint(',
    '["course_lessons.id"]',
    'uq_lesson_block_lesson_position',
]:
    require(migration, marker, "migration")

lesson_block_model = read(ROOT / "backend/app/models/lesson_block.py")
for marker in [
    "class LessonBlock",
    '__tablename__ = "lesson_blocks"',
    "lesson_id",
    "block_type",
    "position",
    "content_json",
    "settings_json",
    "is_required",
    "is_active",
]:
    require(lesson_block_model, marker, "LessonBlock model")

course_lesson_model = read(ROOT / "backend/app/models/course_lesson.py")
for marker in [
    "editor_mode",
    "published",
    "published_version_id",
]:
    require(course_lesson_model, marker, "CourseLesson model")

service = read(ROOT / "backend/app/services/lesson_blocks.py")
for marker in [
    "LESSON_BLOCK_TYPES",
    '"rich_text"',
    '"video"',
    '"file_link"',
    '"quiz"',
    '"assignment"',
    '"callout"',
    "LEGACY_CONTENT_TYPE_TO_BLOCK_TYPE",
    "build_synthetic_legacy_lesson_blocks",
]:
    require(service, marker, "lesson block service")

schemas = read(ROOT / "backend/app/schemas/admin.py")
for marker in [
    "class AdminLessonBlockItem",
    "class AdminLessonBlockCreate",
    "class AdminLessonBlockUpdate",
    "class AdminLessonBlockReorder",
    "editor_mode",
    "published_version_id",
]:
    require(schemas, marker, "admin schemas")

if manifest.get("current_stage") != "82.2":
    fail("current_stage must be 82.2")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["81.15", "82.1", "82.2"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.2"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.2 status mismatch")
if stage.get("branch") != "stage82-2-lesson-blocks-schema-foundation":
    fail("stage 82.2 branch mismatch")
if stage.get("deployment_type") != "backend-schema-foundation":
    fail("stage 82.2 deployment_type mismatch")
if stage.get("database_migration_required") is not True:
    fail("stage 82.2 database_migration_required must be true")
if stage.get("frontend_runtime_changed") is not False:
    fail("stage 82.2 frontend_runtime_changed must be false")
if stage.get("backend_runtime_changed") is not True:
    fail("stage 82.2 backend_runtime_changed must be true")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.2 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.2 password_committed must be false")

print("stage 82.2 lesson blocks schema foundation guard passed")
