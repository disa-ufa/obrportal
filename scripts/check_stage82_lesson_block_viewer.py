from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-block-viewer.md"
COURSE_PAGE = ROOT / "frontend/src/pages/CourseDetailPage.jsx"

EMAIL_RE = re.compile(r"(?<![\\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}(?![\\w*.-])")
PHONE_RE = re.compile(r"(?<!\\d)(?:\\+7|8)\\d{10}(?!\\d)")


def fail(message: str) -> None:
    raise SystemExit(f"stage 82.7 lesson block viewer guard failed: {message}")


def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")


def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")


manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)
course_page = read(COURSE_PAGE)

for name, text in {
    "stage doc": stage_doc,
    "CourseDetailPage": course_page,
}.items():
    if EMAIL_RE.search(text):
        fail(f"{name} contains raw email-like value")
    if PHONE_RE.search(text):
        fail(f"{name} contains raw phone-like value")

for marker in [
    "stage82_7_status=learner_lesson_block_viewer_implemented",
    "stage82_7_learner_viewer=yes",
    "stage82_7_legacy_adapter=yes",
    "stage82_7_backend_changed=no",
    "stage82_7_database_changed=no",
    "stage82_7_frontend_only=yes",
]:
    require(stage_doc, marker, "stage doc")

for marker in [
    "STAGE82_LEARNER_LESSON_BLOCK_VIEWER",
    "stage82_7_learner_lesson_block_viewer",
    "LEARNER_LESSON_BLOCK_VIEWER_LABELS",
    "getLearnerLessonBlockViewerFacts",
    "getLearnerLessonBlockViewerBlocks",
    "LearnerLessonBlockViewerBlock",
    "CourseLearnerLessonBlockViewerPanel",
    "data-testid=\"learner-lesson-block-viewer-panel\"",
    "data-testid=\"learner-lesson-block-viewer-block\"",
    "data-testid=\"learner-lesson-block-viewer-list\"",
    "legacy-content-adapter",
    "lesson?.blocks",
    "lesson?.lesson_blocks",
    "lesson?.content_blocks",
    "<CourseLearnerLessonBlockViewerPanel",
]:
    require(course_page, marker, "CourseDetailPage")

if manifest.get("current_stage") != "82.7":
    fail("current_stage must be 82.7")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["81.15", "82.1", "82.2", "82.3", "82.4", "82.5", "82.6", "82.7"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage = stages["82.7"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.7 status mismatch")
if stage.get("branch") != "stage82-7-lesson-block-viewer":
    fail("stage 82.7 branch mismatch")
if stage.get("deployment_type") != "frontend-only":
    fail("stage 82.7 deployment_type mismatch")
if stage.get("database_migration_required") is not False:
    fail("stage 82.7 database_migration_required must be false")
if stage.get("backend_runtime_changed") is not False:
    fail("stage 82.7 backend_runtime_changed must be false")
if stage.get("frontend_runtime_changed") is not True:
    fail("stage 82.7 frontend_runtime_changed must be true")
if stage.get("learner_viewer") is not True:
    fail("stage 82.7 learner_viewer must be true")
if stage.get("legacy_adapter") is not True:
    fail("stage 82.7 legacy_adapter must be true")
if stage.get("raw_contacts_committed") is not False:
    fail("stage 82.7 raw_contacts_committed must be false")
if stage.get("password_committed") is not False:
    fail("stage 82.7 password_committed must be false")

print("stage 82.7 lesson block viewer guard passed")
