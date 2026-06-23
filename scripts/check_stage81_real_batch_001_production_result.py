from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-real-batch-001-production-result.md"

EMAIL_RE = re.compile(r"(?<![\w*.-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}(?![\w*.-])")
PHONE_RE = re.compile(r"(?<!\d)(?:\+7|8)\d{10}(?!\d)")

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.15 production result guard failed: {message}")

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

for marker in [
    "Stage 81.15 - real-batch-001 production result",
    "stage81_15_status=real_batch_001_production_result_completed",
    "stage81_15_server_touched=yes",
    "stage81_15_data_changed=yes",
    "stage81_15_runtime_rebuild=no",
    "stage81_15_runtime_restart=no",
    "stage81_15_database_migration_run=no",
    "stage81_15_cleanup_performed=no",
    "stage81_15_batch_id=real-batch-001",
    "stage81_15_decision=real_batch_001_e2e_completed_publish_document_verified",
    "stage81_15_next_stage=81.16",
    "AUTO-F161AA1FB1C2400B",
    "DOCV-6DC5C651C5ED4B28957B1ECE",
    "document_status: `available`",
    "enrollment_status: `completed`",
    "completed_lessons: `1`",
    "known_issue_pdf_layout_verification_code_overlap=yes",
    "no raw contacts or passwords are committed",
]:
    require(stage_doc, marker, "stage81.15 doc")

if manifest.get("current_stage") != "81.15":
    fail("current_stage must be 81.15")

checkpoint = manifest.get("production_checkpoint") or {}
expected_checkpoint = {
    "last_confirmed_stage": "81.15",
    "last_confirmed_head": "ae00b75",
    "status": "real_batch_001_production_result_completed",
    "decision": "real_batch_001_e2e_completed_publish_document_verified",
}
for key, expected in expected_checkpoint.items():
    if checkpoint.get(key) != expected:
        fail(f"checkpoint {key} mismatch")

expected_checkpoint_booleans = {
    "production_data_changed": True,
    "backend_runtime_changed": False,
    "frontend_runtime_changed": False,
    "database_migration_run": False,
    "cleanup_performed": False,
    "raw_contacts_committed": False,
    "password_committed": False,
}
for key, expected in expected_checkpoint_booleans.items():
    if checkpoint.get(key) is not expected:
        fail(f"checkpoint {key} must be {expected}")

document_result = checkpoint.get("document_result") or {}
if document_result.get("document_number") != "AUTO-F161AA1FB1C2400B":
    fail("checkpoint document number mismatch")
if document_result.get("verification_code") != "DOCV-6DC5C651C5ED4B28957B1ECE":
    fail("checkpoint verification code mismatch")
if document_result.get("status") != "available":
    fail("checkpoint document status mismatch")
if document_result.get("has_pdf") is not True:
    fail("checkpoint document has_pdf must be true")

enrollment_result = checkpoint.get("enrollment_result") or {}
if enrollment_result.get("course_slug") != "znakomstvo-s-obrazovatelnym-portalom":
    fail("checkpoint enrollment course_slug mismatch")
if enrollment_result.get("status") != "completed":
    fail("checkpoint enrollment status mismatch")
if enrollment_result.get("progress_rows") != 1:
    fail("checkpoint progress_rows mismatch")
if enrollment_result.get("completed_lessons") != 1:
    fail("checkpoint completed_lessons mismatch")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
if "81.15" not in stages:
    fail("stage 81.15 record is missing")
stage = stages["81.15"]

if stage.get("status") != "production_completed":
    fail("stage 81.15 status mismatch")
if stage.get("branch") != "stage81-15-real-batch-001-production-result":
    fail("stage 81.15 branch mismatch")
if stage.get("deployment_type") != "manual-production-content-fill-e2e-result-docs":
    fail("stage 81.15 deployment_type mismatch")
if stage.get("server_touched") is not True:
    fail("stage 81.15 server_touched must be true")
if stage.get("production_data_changed") is not True:
    fail("stage 81.15 production_data_changed must be true")

for key in [
    "frontend_runtime_changed",
    "backend_runtime_changed",
    "database_migration_run",
    "runtime_rebuild",
    "runtime_restart",
    "cleanup_performed",
    "direct_sql_mutation_used",
    "raw_contacts_committed",
    "password_committed",
]:
    if stage.get(key) is not False:
        fail(f"stage 81.15 {key} must be false")

required_checks = {
    r"python .\scripts\check_release_manifest.py",
    r"python .\scripts\check_stage81_real_batch_001_production_result.py",
    r"python .\scripts\check_source_bom.py",
    r"python .\scripts\check_text_encoding.py",
    r"python .\scripts\check_no_todo_markers.py",
    r"python .\scripts\frontend_guard.py",
    "git diff --check",
}
missing = required_checks - set(stage.get("required_checks", []))
if missing:
    fail(f"stage 81.15 missing required checks: {sorted(missing)}")

known_issues = stage.get("known_issues") or []
if not known_issues:
    fail("stage 81.15 must record known PDF layout issue")
if known_issues[0].get("id") != "pdf_layout_verification_code_overlap":
    fail("known issue id mismatch")
if known_issues[0].get("blocks_stage_acceptance") is not False:
    fail("known issue must be non-blocking")

print("stage 81.15 production result guard passed")
