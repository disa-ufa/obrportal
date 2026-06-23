from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-editor-shell.md"
CLIENT = ROOT / "frontend/src/api/client.js"
ADMIN_PAGE = ROOT / "frontend/src/pages/AdminCoursesPage.jsx"
EDITOR = ROOT / "frontend/src/components/admin/LessonBlocksEditor.jsx"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.4 lesson editor shell guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
client = read(CLIENT)
admin_page = read(ADMIN_PAGE)
editor = read(EDITOR)

for name, text in {
    "stage doc": stage_doc,
    "editor": editor,
}.items():
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

for marker in [
    "stage82_4_status=lesson_editor_shell_implemented",
    "stage82_4_shell_mode=read_only",
    "stage82_4_legacy_editor_preserved=yes",
    "stage82_4_lesson_block_api_client=yes",
    "stage82_4_component=LessonBlocksEditor",
]:
    require(stage_doc, marker, "stage doc")

for marker in [
    "export async function getAdminLessonBlocks",
    "export async function createAdminLessonBlock",
    "export async function updateAdminLessonBlock",
    "export async function deleteAdminLessonBlock",
    "export async function reorderAdminLessonBlocks",
    "/api/v1/admin/course-lessons/${lessonId}/blocks",
    "/api/v1/admin/lesson-blocks/${blockId}",
]:
    require(client, marker, "API client")

for marker in [
    "STAGE82_LESSON_EDITOR_SHELL",
    "stage82_4_lesson_editor_shell",
    "getAdminLessonBlocks",
    "data-testid=\"stage82-lesson-blocks-editor-shell\"",
    "data-testid=\"stage82-lesson-block-card\"",
    "legacy adapter",
    "Старый редактор ниже остаётся рабочим",
]:
    require(editor, marker, "LessonBlocksEditor")

for marker in [
    'import { LessonBlocksEditor } from "../components/admin/LessonBlocksEditor";',
    "function CourseLessonFormFields({ values, onChange, prefix = \"\", lessonId = \"\" })",
    "<LessonBlocksEditor lessonId={lessonId} />",
    "lessonId={lesson.id}",
    "content_text",
    "content_url",
    "CourseLessonContentPreviewPanel",
]:
    require(admin_page, marker, "AdminCoursesPage")

if manifest.get("current_stage") != "82.4":
    fail("current_stage must be 82.4")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["81.15", "82.1", "82.2", "82.3", "82.4"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.4"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.4 status mismatch")
if stage.get("branch") != "stage82-4-lesson-editor-shell":
    fail("stage 82.4 branch mismatch")
if stage.get("deployment_type") != "frontend-only":
    fail("stage 82.4 deployment_type mismatch")
if stage.get("database_migration_required") is not False:
    fail("stage 82.4 database_migration_required must be false")
if stage.get("backend_runtime_changed") is not False:
    fail("stage 82.4 backend_runtime_changed must be false")
if stage.get("frontend_runtime_changed") is not True:
    fail("stage 82.4 frontend_runtime_changed must be true")
if stage.get("legacy_editor_preserved") is not True:
    fail("stage 82.4 legacy_editor_preserved must be true")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.4 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.4 password_committed must be false")

print("stage 82.4 lesson editor shell guard passed")
