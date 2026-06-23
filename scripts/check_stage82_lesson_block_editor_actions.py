from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-block-editor-actions.md"
EDITOR = ROOT / "frontend/src/components/admin/LessonBlocksEditor.jsx"
CLIENT = ROOT / "frontend/src/api/client.js"
ADMIN_PAGE = ROOT / "frontend/src/pages/AdminCoursesPage.jsx"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.5 lesson block editor actions guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
editor = read(EDITOR)
client = read(CLIENT)
admin_page = read(ADMIN_PAGE)

for name, text in {
    "stage doc": stage_doc,
    "editor": editor,
}.items():
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

for marker in [
    "stage82_5_status=lesson_block_editor_actions_implemented",
    "stage82_5_actions=create_update_delete_reorder",
    "stage82_5_legacy_blocks_read_only=yes",
    "stage82_5_backend_changed=no",
    "stage82_5_legacy_editor_preserved=yes",
]:
    require(stage_doc, marker, "stage doc")

for marker in [
    "createAdminLessonBlock",
    "deleteAdminLessonBlock",
    "getAdminLessonBlocks",
    "reorderAdminLessonBlocks",
    "updateAdminLessonBlock",
    "STAGE82_LESSON_EDITOR_ACTIONS",
    "stage82_5_lesson_block_editor_actions",
    "data-testid=\"stage82-lesson-blocks-editor-actions\"",
    "data-testid=\"stage82-lesson-block-create-form\"",
    "handleCreateSubmit",
    "handleEditSubmit",
    "handleDelete",
    "handleMove",
    "isLegacyBlock",
    "disabled={legacy || busy}",
    "Это синтетический legacy-блок. Его нельзя редактировать напрямую.",
]:
    require(editor, marker, "LessonBlocksEditor")

for marker in [
    "export async function createAdminLessonBlock",
    "export async function updateAdminLessonBlock",
    "export async function deleteAdminLessonBlock",
    "export async function reorderAdminLessonBlocks",
]:
    require(client, marker, "API client")

for marker in [
    "<LessonBlocksEditor lessonId={lessonId} />",
    "lessonId={lesson.id}",
    "CourseLessonFormFields",
]:
    require(admin_page, marker, "AdminCoursesPage")

if manifest.get("current_stage") != "82.5":
    fail("current_stage must be 82.5")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["81.15", "82.1", "82.2", "82.3", "82.4", "82.5"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.5"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.5 status mismatch")
if stage.get("branch") != "stage82-5-lesson-block-editor-actions":
    fail("stage 82.5 branch mismatch")
if stage.get("deployment_type") != "frontend-only":
    fail("stage 82.5 deployment_type mismatch")
if stage.get("database_migration_required") is not False:
    fail("stage 82.5 database_migration_required must be false")
if stage.get("backend_runtime_changed") is not False:
    fail("stage 82.5 backend_runtime_changed must be false")
if stage.get("frontend_runtime_changed") is not True:
    fail("stage 82.5 frontend_runtime_changed must be true")
if stage.get("legacy_blocks_read_only") is not True:
    fail("stage 82.5 legacy_blocks_read_only must be true")
if stage.get("legacy_editor_preserved") is not True:
    fail("stage 82.5 legacy_editor_preserved must be true")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.5 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.5 password_committed must be false")

print("stage 82.5 lesson block editor actions guard passed")
