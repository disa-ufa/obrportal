from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-real-batch-001-filled.md"

FORBIDDEN_RAW_VALUES = [
    "denisyxxx@mail.ru",
    "denisyxxx@gmail.com",
    "89871410776",
    "password=",
    "пароль=",
    "PASSWORD=",
    "Password=",
]

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.13 real batch filled guard failed: {message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

for forbidden in FORBIDDEN_RAW_VALUES:
    if forbidden in stage_doc:
        fail(f"committed stage doc contains forbidden raw value: {forbidden}")
    if forbidden in read(MANIFEST):
        fail(f"manifest contains forbidden raw value: {forbidden}")

for marker in [
    "Stage 81.13 - real-batch-001 filled card",
    "stage81_13_status=real_batch_001_filled_sanitized_completed",
    "stage81_13_server_touched=no",
    "stage81_13_data_changed=no",
    "stage81_13_runtime_rebuild=no",
    "stage81_13_runtime_restart=no",
    "stage81_13_database_migration_run=no",
    "stage81_13_cleanup_performed=no",
    "stage81_13_batch_id=real-batch-001",
    "stage81_13_decision=commit_sanitized_batch_card_only",
    "stage81_13_next_stage=81.14",
    "curator_email_masked:",
    "learner_email_masked:",
    "curator_phone_masked:",
    "learner_phone_masked:",
    "password_recorded: `no`",
    "Знакомство с образовательным порталом",
    "znakomstvo-s-obrazovatelnym-portalom",
    "Основной модуль",
    "Введение в работу с образовательным порталом",
    "REAL-BATCH-001",
    "Нуриев Фаниль Жамилевич",
    "Stage 81.14 should be a production preflight",
]:
    require(stage_doc, marker, "stage81.13 doc")

if manifest.get("current_stage") != "81.13":
    fail("current_stage must be 81.13")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.13":
    fail("production checkpoint must be Stage 81.13")
if checkpoint.get("last_confirmed_head") != "e17668a":
    fail("production checkpoint head must be e17668a")
if checkpoint.get("status") != "real_batch_001_filled_sanitized_completed":
    fail("production checkpoint status mismatch")
if checkpoint.get("backend_runtime_changed") is not False:
    fail("backend_runtime_changed must be false")
if checkpoint.get("frontend_runtime_changed") is not False:
    fail("frontend_runtime_changed must be false")
if checkpoint.get("database_migration_run") is not False:
    fail("database_migration_run must be false")
if checkpoint.get("production_data_changed") is not False:
    fail("production_data_changed must be false")
if checkpoint.get("cleanup_performed") is not False:
    fail("cleanup_performed must be false")
if checkpoint.get("decision") != "commit_sanitized_batch_card_only":
    fail("decision mismatch")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9", "81.10", "81.11", "81.12", "81.13"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage8113 = stages["81.13"]
if stage8113.get("status") != "real_batch_001_filled_sanitized_completed":
    fail("stage 81.13 status mismatch")
if stage8113.get("branch") != "stage81-13-fill-first-real-content-batch":
    fail("stage 81.13 branch mismatch")
if stage8113.get("deployment_type") != "docs-sanitized-batch-card-only":
    fail("stage 81.13 deployment_type mismatch")
if stage8113.get("decision") != "commit_sanitized_batch_card_only":
    fail("stage 81.13 decision mismatch")
if stage8113.get("first_batch_id") != "real-batch-001":
    fail("stage 81.13 first_batch_id mismatch")
if stage8113.get("server_touched") is not False:
    fail("stage 81.13 server_touched must be false")
if stage8113.get("production_data_changed") is not False:
    fail("stage 81.13 production_data_changed must be false")
if stage8113.get("raw_contacts_committed") is not False:
    fail("raw_contacts_committed must be false")
if stage8113.get("password_committed") is not False:
    fail("password_committed must be false")

required_checks = {
    r"python .\scripts\check_release_manifest.py",
    r"python .\scripts\check_stage81_real_batch_001_filled.py",
    r"python .\scripts\check_source_bom.py",
    r"python .\scripts\check_text_encoding.py",
    r"python .\scripts\check_no_todo_markers.py",
    r"python .\scripts\frontend_guard.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage8113.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.13 missing required checks: {sorted(missing_checks)}")

tmp_fill = ROOT / "tmp_stage81_13_real_batch_001_fill.md"
if tmp_fill.exists():
    fail("temporary fill card must be removed before final guard/commit")

print("stage 81.13 real batch filled guard passed")
