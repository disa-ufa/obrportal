from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-blocks-viewer-contract.md"
COURSE_DETAIL_PAGE = ROOT / "frontend" / "src" / "pages" / "CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.9 lesson blocks viewer contract guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
course_detail = read(COURSE_DETAIL_PAGE)

for name, text in {
    "stage doc": stage_doc,
    "course detail page": course_detail,
}.items():
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

for marker in [
    "stage82_9_status=lesson_blocks_viewer_contract_implemented",
    "stage82_9_frontend_changed=no",
    "stage82_9_backend_changed=no",
    "stage82_9_contract_guard_added=yes",
    "stage82_9_database_migration_required=no",
]:
    require(stage_doc, marker, "stage doc")

for marker in [
    'const STAGE82_LEARNER_LESSON_BLOCK_VIEWER = "stage82_7_learner_lesson_block_viewer"',
    "function getLearnerLessonBlockViewerBlocks(lesson)",
    "lesson?.blocks, lesson?.lesson_blocks, lesson?.content_blocks",
    ".filter((block) => block?.is_active !== false)",
    ".sort((left, right) => (Number(left.position) || 0) - (Number(right.position) || 0))",
    "block_type: normalizeLearnerLessonBlockType(block.block_type || block.content_type)",
    "legacy-content-adapter",
    "const blocks = locked ? [] : getLearnerLessonBlockViewerBlocks(lesson)",
    "function CourseLearnerLessonBlockViewerPanel",
    'data-testid="learner-lesson-block-viewer-panel"',
    "<CourseLearnerLessonBlockViewerPanel",
    "mergeCourseWithAccountCourseDetail(course, accountCourseDetail)",
    "modules: Array.isArray(accountCourseDetail.modules) ? accountCourseDetail.modules : course.modules",
]:
    require(course_detail, marker, "CourseDetailPage.jsx")

for marker in [
    "rich_text",
    "video",
    "file_link",
    "quiz",
    "assignment",
    "callout",
]:
    require(course_detail, marker, "CourseDetailPage.jsx block types")

if manifest.get("current_stage") != "82.9":
    fail("current_stage must be 82.9")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["82.7", "82.8", "82.9"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.9"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.9 status mismatch")
if stage.get("branch") != "stage82-9-lesson-blocks-viewer-contract":
    fail("stage 82.9 branch mismatch")
if stage.get("deployment_type") != "contract-only":
    fail("stage 82.9 deployment_type mismatch")
if stage.get("database_migration_required") is not False:
    fail("stage 82.9 database_migration_required must be false")
if stage.get("frontend_runtime_changed") is not False:
    fail("stage 82.9 frontend_runtime_changed must be false")
if stage.get("backend_runtime_changed") is not False:
    fail("stage 82.9 backend_runtime_changed must be false")
if stage.get("viewer_contract_guard") is not True:
    fail("stage 82.9 viewer_contract_guard must be true")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.9 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.9 password_committed must be false")

print("stage 82.9 lesson blocks viewer contract guard passed")
