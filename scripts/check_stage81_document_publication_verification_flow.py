from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"
STAGE_DOC = ROOT / "docs" / "stage81-document-publication-verification-flow.md"

def fail(message: str) -> None:
    raise SystemExit(f"stage 81.9 document publication verification guard failed: {message}")

def read(path: Path) -> str:
    if not path.exists():
        fail(f"missing file: {path.relative_to(ROOT).as_posix()}")
    return path.read_text(encoding="utf-8")

def require(text: str, marker: str, where: str) -> None:
    if marker not in text:
        fail(f"{where} misses marker: {marker}")

manifest = json.loads(read(MANIFEST))
stage_doc = read(STAGE_DOC)

for marker in [
    "Stage 81.9 - Document publication and verification flow completed",
    "stage81_9_status=production_completed",
    "stage81_9_document_publication_verified=yes",
    "stage81_9_document_download_verified=yes",
    "stage81_9_public_verification_verified=yes",
    "stage81_9_pdf_qr_public_base_url_hotfix_verified=yes",
    "stage81_9_backend_runtime_changed=yes",
    "stage81_9_frontend_runtime_changed=no",
    "stage81_9_database_migration_run=no",
    "stage81_9_next_stage=81.10",
    "PUBLIC_BASE_URL=https://portal.rcdo02.ru",
    "AUTO-4AAA9C328B7C476D",
    "DOCV-36F38F4FABBB45A38EE0E918",
    "85025ef8-2f44-40a9-8e9c-fb96899d6c72",
    "a2105fde-e1f9-40e5-adcd-51acbfd04dc3",
    "387543fa-81f0-4110-9047-f314b10a8204",
    "admin_regenerate",
    "auto_completion",
    "completion_pdf_v1",
    "https://portal.rcdo02.ru/verify/DOCV-36F38F4FABBB45A38EE0E918",
    "stage81_9_hotfix_localhost_link_present_after_regeneration=no",
]:
    require(stage_doc, marker, "stage81.9 doc")

if manifest.get("current_stage") != "81.9":
    fail("current_stage must be 81.9")

checkpoint = manifest.get("production_checkpoint") or {}
if checkpoint.get("last_confirmed_stage") != "81.9":
    fail("production checkpoint must be Stage 81.9")
if checkpoint.get("last_confirmed_head") != "8146de2":
    fail("production checkpoint head must be 8146de2")
if checkpoint.get("status") != "document_publication_verification_completed":
    fail("production checkpoint status mismatch")
if checkpoint.get("backend_runtime_changed") is not True:
    fail("backend_runtime_changed must be true")
if checkpoint.get("frontend_runtime_changed") is not False:
    fail("frontend_runtime_changed must be false")
if checkpoint.get("database_migration_run") is not False:
    fail("database_migration_run must be false")
if checkpoint.get("production_data_changed") is not True:
    fail("production_data_changed must be true")

routes = checkpoint.get("public_routes_http") or {}
for route in [
    "/account",
    "/admin/documents",
    "/verify/DOCV-36F38F4FABBB45A38EE0E918",
    "/verify/AUTO-4AAA9C328B7C476D",
]:
    if routes.get(route) != 200:
        fail(f"route {route} must be 200 in checkpoint")

stages = {stage.get("id"): stage for stage in manifest.get("stages", [])}
for stage_id in ["80.4", "80.5", "81.1", "81.2", "81.3", "81.4", "81.5", "81.6", "81.7", "81.8", "81.9"]:
    if stage_id not in stages:
        fail(f"stage {stage_id} record is missing")

stage819 = stages["81.9"]
if stage819.get("status") != "production_completed":
    fail("stage 81.9 status must be production_completed")
if stage819.get("branch") != "stage81-9-document-publication-verification-flow":
    fail("stage 81.9 branch mismatch")
if stage819.get("deployment_type") != "document-publication-verification-hotfix":
    fail("stage 81.9 deployment_type mismatch")
if stage819.get("backend_runtime_changed") is not True:
    fail("stage 81.9 backend_runtime_changed must be true")
if stage819.get("frontend_runtime_changed") is not False:
    fail("stage 81.9 frontend_runtime_changed must be false")
if stage819.get("database_migration_run") is not False:
    fail("stage 81.9 database_migration_run must be false")
if stage819.get("production_data_changed") is not True:
    fail("stage 81.9 production_data_changed must be true")
if stage819.get("pdf_qr_public_base_url_hotfix_verified") is not True:
    fail("stage 81.9 PDF QR URL hotfix must be verified")

final_counts = stage819.get("final_counts") or {}
if final_counts.get("document_records") != 1:
    fail("final_counts.document_records must be 1")
if final_counts.get("document_generation_events") != 2:
    fail("final_counts.document_generation_events must be 2")

target_document = stage819.get("target_document") or {}
if target_document.get("status") != "available":
    fail("target document status must be available")
if target_document.get("generation_source") != "admin_regenerate":
    fail("target document generation_source must be admin_regenerate")
if target_document.get("verification_url") != "https://portal.rcdo02.ru/verify/DOCV-36F38F4FABBB45A38EE0E918":
    fail("target document verification_url mismatch")

required_checks = {
    r"python .\scripts\check_release_manifest.py",
    r"python .\scripts\check_stage81_document_publication_verification_flow.py",
    r"python .\scripts\check_source_bom.py",
    r"python .\scripts\check_text_encoding.py",
    r"python .\scripts\check_no_todo_markers.py",
    r"python .\scripts\frontend_guard.py",
    r".\.venv\Scripts\python.exe -m pytest backend\app\tests\test_document_templates.py backend\app\tests\test_document_pdf.py",
    "git diff --check",
}
missing_checks = required_checks - set(stage819.get("required_checks", []))
if missing_checks:
    fail(f"stage 81.9 missing required checks: {sorted(missing_checks)}")

print("stage 81.9 document publication verification guard passed")
