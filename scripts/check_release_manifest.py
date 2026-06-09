from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "docs" / "release-manifest.json"

def fail(message: str) -> None:
    raise SystemExit(f"release manifest guard failed: {message}")

def main() -> None:
    if not MANIFEST.exists():
        fail("docs/release-manifest.json is missing")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))

    if manifest.get("schema_version") != 1:
        fail("schema_version must be 1")
    if manifest.get("project") != "ObrPortal":
        fail("project must be ObrPortal")
    if manifest.get("process") != "development-process-v2":
        fail("process must be development-process-v2")
    if manifest.get("current_stage") != "81.9":
        fail("current_stage must be 81.9")

    checkpoint = manifest.get("production_checkpoint") or {}
    if checkpoint.get("last_confirmed_stage") != "81.9":
        fail("last_confirmed_stage must be 81.9")
    if checkpoint.get("last_confirmed_head") != "8146de2":
        fail("last_confirmed_head must be 8146de2")
    if checkpoint.get("status") != "document_publication_verification_completed":
        fail("checkpoint status mismatch")
    if checkpoint.get("backend_runtime_changed") is not True:
        fail("checkpoint backend_runtime_changed must be true")
    if checkpoint.get("frontend_runtime_changed") is not False:
        fail("checkpoint frontend_runtime_changed must be false")
    if checkpoint.get("database_migration_run") is not False:
        fail("checkpoint database_migration_run must be false")
    if checkpoint.get("production_data_changed") is not True:
        fail("checkpoint production_data_changed must be true")

    routes = checkpoint.get("public_routes_http") or {}
    for route in [
        "/account",
        "/admin/documents",
        "/verify/DOCV-36F38F4FABBB45A38EE0E918",
        "/verify/AUTO-4AAA9C328B7C476D",
    ]:
        if routes.get(route) != 200:
            fail(f"checkpoint route {route} must be 200")

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
        fail("stage 81.9 pdf_qr_public_base_url_hotfix_verified must be true")

    final_counts = stage819.get("final_counts") or {}
    if final_counts.get("document_records") != 1:
        fail("stage 81.9 final_counts.document_records must be 1")
    if final_counts.get("document_generation_events") != 2:
        fail("stage 81.9 final_counts.document_generation_events must be 2")

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

    print("release manifest guard passed")

if __name__ == "__main__":
    main()
