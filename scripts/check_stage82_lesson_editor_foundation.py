from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage82-lesson-editor-foundation.md"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")

def fail(message: str) -> None:
    raise SystemExit(f"stage 82.1 lesson editor foundation guard failed: {message}")

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

required_markers = [
    "Stage 82.1 - lesson editor foundation",
    "stage82_1_status=lesson_editor_foundation_ready",
    "stage82_1_server_touched=no",
    "stage82_1_data_changed=no",
    "stage82_1_runtime_rebuild=no",
    "stage82_1_runtime_restart=no",
    "stage82_1_database_migration_run=no",
    "stage82_1_cleanup_performed=no",
    "stage82_1_decision=prepare_block_based_lesson_editor_architecture",
    "stage82_1_next_stage=82.2",
    "stage82_1_mvp_block_types=rich_text,video,file_link,quiz,assignment,callout",
    "stage82_1_backward_compatibility=legacy_dual_read_synthetic_blocks",
    "stage82_1_editor_layout=outline_canvas_properties",
    "stage82_1_publication_model=draft_publish_version_snapshot",
    "stage82_1_security_policy=xss_safe_allowlist_embeds_no_raw_html_by_default",
    "stage82_1_rollout_strategy=additive_feature_flag_friendly",
    "Course -> Module -> Lesson -> LessonBlock[]",
    "`content_type=text` -> synthetic `rich_text` block",
    "`content_type=video` -> synthetic `video` block",
    "`content_type=file` -> synthetic `file_link` block",
    "`content_type=link` -> synthetic `file_link` block",
    "`content_type=assignment` -> synthetic `assignment` block",
    "GET /api/v1/admin/course-lessons/{lesson_id}/editor",
    "POST /api/v1/admin/course-lessons/{lesson_id}/blocks",
    "POST /api/v1/admin/course-lessons/{lesson_id}/publish",
    "Stage 82.2 should create only backend-safe schema foundation",
]
for marker in required_markers:
    require(stage_doc, marker, "stage82.1 doc")

if manifest.get("current_stage") != "82.1":
    fail("current_stage must be 82.1")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.15":
    fail("production checkpoint must remain at 81.15")
if checkpoint.get("last_confirmed_head") != "299d428":
    fail("production checkpoint head must be 299d428")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
if "82.1" not in stages:
    fail("stage 82.1 record is missing")

stage = stages["82.1"]
if stage.get("status") != "implementation_ready":
    fail("stage 82.1 status mismatch")
if stage.get("branch") != "stage82-1-lesson-editor-foundation":
    fail("stage 82.1 branch mismatch")
if stage.get("deployment_type") != "docs-and-guard-only":
    fail("stage 82.1 deployment_type mismatch")
if stage.get("decision") != "prepare_block_based_lesson_editor_architecture":
    fail("stage 82.1 decision mismatch")
if stage.get("next_stage") != "82.2":
    fail("stage 82.1 next_stage mismatch")

expected_booleans = {
    "server_touched": False,
    "frontend_runtime_changed": False,
    "backend_runtime_changed": False,
    "database_migration_run": False,
    "runtime_rebuild": False,
    "runtime_restart": False,
    "production_data_changed": False,
    "cleanup_performed": False,
    "raw_contacts_committed": False,
    "password_committed": False,
}
for key, expected in expected_booleans.items():
    if stage.get(key) is not expected:
        fail(f"stage 82.1 {key} must be {expected}")

expected_blocks = ["rich_text", "video", "file_link", "quiz", "assignment", "callout"]
if stage.get("mvp_block_types") != expected_blocks:
    fail("stage 82.1 mvp_block_types mismatch")

def normalize_check(value: str) -> str:
    return value.replace("\\\\", "\\").replace("/", "\\")

required_checks = {
    "python .\\scripts\\check_release_manifest.py",
    "python .\\scripts\\check_stage82_lesson_editor_foundation.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "python .\\scripts\\frontend_guard.py",
    "git diff --check",
}
actual_checks = {normalize_check(value) for value in stage.get("required_checks", [])}
expected_checks = {normalize_check(value) for value in required_checks}
missing = expected_checks - actual_checks
if missing:
    fail(f"stage 82.1 missing required checks: {sorted(missing)}")

print("stage 82.1 lesson editor foundation guard passed")
