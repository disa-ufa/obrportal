from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC = ROOT / "docs/stage-12-8-final-stabilization.md"
ROADMAP = ROOT / "docs/stage-12-product-roadmap.md"
PREVIOUS_STAGE_7_DOC = ROOT / "docs/stage-12-7-import-export-reporting.md"

REQUIRED_DOCS = [
    ROOT / "docs/stage-12-1-learner-account-workflow.md",
    ROOT / "docs/stage-12-2-catalog-learner-workflow.md",
    ROOT / "docs/stage-12-3-course-detail-learner-workflow.md",
    ROOT / "docs/stage-12-4-document-verification-workflow.md",
    ROOT / "docs/stage-12-5-admin-moderation-audit-workflow.md",
    ROOT / "docs/stage-12-6-ux-ui-navigation-empty-states.md",
    ROOT / "docs/stage-12-7-import-export-reporting.md",
    DOC,
]

REQUIRED_GUARDS = [
    ROOT / "scripts/check_stage12_1_account_contract.py",
    ROOT / "scripts/check_stage12_1_learner_account_workflow.py",
    ROOT / "scripts/check_stage12_2_catalog_learner_workflow.py",
    ROOT / "scripts/check_stage12_3_course_detail_learner_workflow.py",
    ROOT / "scripts/check_stage12_4_document_verification_workflow.py",
    ROOT / "scripts/check_stage12_5_admin_moderation_audit_workflow.py",
    ROOT / "scripts/check_stage12_6_ux_ui_navigation_empty_states.py",
    ROOT / "scripts/check_stage12_7_import_export_reporting.py",
    ROOT / "scripts/check_stage12_product_roadmap.py",
    ROOT / "scripts/check_stage12_8_final_stabilization.py",
]

DOC_MARKERS = [
    "Stage 12.8 baseline server check - 2026-05-28",
    "production git head: 805f21a",
    "Stage 12.8 baseline server check passed",
    "backend_health=ok",
    "backend_ready=ok",
    "public_ready=ok",
    "Status: in progress",
    "Stage: 12.8",
    "Stage 12.8 final stabilization and Stage 12 tag",
    "Stage 12.8 baseline",
    "v0.1.0-stage12-7-import-export-reporting-complete",
    "v0.1.0-stage12-complete",
    "Stage 12.1 through Stage 12.7 are accepted",
    "full local quality gate",
    "production health verification",
    "final Stage 12 acceptance",
    "production_runtime_changed=no",
]

ROADMAP_MARKERS = [
    "Stage 12 product roadmap",
    "Status: accepted",
    "Stage 12.7 import/export and reporting",
    "Stage 12.8 final stabilization and Stage 12 tag",
    "Stage 12 local quality gate",
    "Before every Stage 12 merge",
    "Stage 12 acceptance criteria",
]

PREVIOUS_STAGE_7_MARKERS = [
    "Status: accepted",
    "Stage: 12.7",
    "Stage 12.7 final acceptance",
    "Stage 12.7 accepted",
    "214 passed",
    "frontend production build passed",
]

FORBIDDEN_SECRET_MARKERS = [
    "BOT_" + "TOKEN=",
    "SECRET_" + "KEY=",
    "POSTGRES_" + "PASSWORD=",
    "MINIO_ROOT_" + "PASSWORD=",
    "ACCESS_" + "TOKEN=",
    "SERVICE_" + "SECRET=",
]


def read_text(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"[fail] required file is missing: {path.relative_to(ROOT)}")

    return path.read_text(encoding="utf-8")


def require_markers(path: Path, markers: list[str]) -> int:
    text = read_text(path)
    missing = [marker for marker in markers if marker not in text]

    if missing:
        details = "\n".join(f"  missing marker: {marker}" for marker in missing)
        raise SystemExit(f"[fail] {path.relative_to(ROOT)}\n{details}")

    return len(markers)


def check_no_secret_markers(path: Path) -> None:
    text = read_text(path)

    for marker in FORBIDDEN_SECRET_MARKERS:
        if marker in text:
            raise SystemExit(
                f"[fail] forbidden secret-like marker {marker!r} found in {path.relative_to(ROOT)}"
            )


def main() -> None:
    for path in REQUIRED_DOCS + REQUIRED_GUARDS:
        read_text(path)

    for path in [DOC, Path(__file__).resolve()]:
        check_no_secret_markers(path)

    doc_count = require_markers(DOC, DOC_MARKERS)
    roadmap_count = require_markers(ROADMAP, ROADMAP_MARKERS)
    previous_stage_7_count = require_markers(PREVIOUS_STAGE_7_DOC, PREVIOUS_STAGE_7_MARKERS)

    print(
        "stage 12.8 final stabilization diagnostics passed: "
        f"doc_markers={doc_count}, roadmap_markers={roadmap_count}, "
        f"previous_stage_7_markers={previous_stage_7_count}, "
        f"required_docs={len(REQUIRED_DOCS)}, required_guards={len(REQUIRED_GUARDS)}, "
        "secrets_printed=no, production_runtime_changed=no"
    )


if __name__ == "__main__":
    main()
