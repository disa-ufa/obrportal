from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-18-production-runbook-operator-handoff.md"
STAGE14_DOC_PATH = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
STAGE15_DOC_PATH = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"
STAGE16_DOC_PATH = ROOT / "docs" / "stage-16-release-readiness-regression.md"
STAGE17_DOC_PATH = ROOT / "docs" / "stage-17-production-deployment-readiness.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE14_DOC_PATH,
    STAGE15_DOC_PATH,
    STAGE16_DOC_PATH,
    STAGE17_DOC_PATH,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage15_admin_ux_operator_workflow.py",
    ROOT / "scripts" / "check_stage16_release_readiness_regression.py",
    ROOT / "scripts" / "check_stage17_production_deployment_readiness.py",
    ROOT / "docker-compose.yml",
    ROOT / ".env.example",
]

DOC_MARKERS = [
    "Stage 18 production runbook operator handoff baseline - 2026-05-30",
    "stage18_production_runbook_operator_handoff_baseline=yes",
    "stage18_runtime_changed=no",
    "stage18_depends_on_stage14_complete=yes",
    "stage18_depends_on_stage15_complete=yes",
    "stage18_depends_on_stage16_complete=yes",
    "stage18_depends_on_stage17_complete=yes",
    "Stage 18.1 production runbook inventory - 2026-05-30",
    "stage18_production_runbook_inventory_recorded=yes",
    "stage18_pre_deploy_checks_defined=yes",
    "stage18_backup_before_deploy_defined=yes",
    "stage18_update_procedure_defined=yes",
    "stage18_post_deploy_smoke_defined=yes",
    "stage18_rollback_procedure_defined=yes",
    "Stage 18.2 operator admin handoff notes - 2026-05-30",
    "stage18_operator_admin_handoff_recorded=yes",
    "stage18_admin_access_path_defined=yes",
    "stage18_dashboard_handoff_defined=yes",
    "stage18_users_organizations_handoff_defined=yes",
    "stage18_documents_verification_handoff_defined=yes",
    "stage18_support_escalation_path_defined=yes",
    "Stage 18.3 release artifact summary - 2026-05-30",
    "stage18_release_artifact_summary_recorded=yes",
    "stage18_accepted_stage_tags_recorded=yes",
    "stage18_documentation_artifacts_recorded=yes",
    "stage18_diagnostic_guards_recorded=yes",
    "stage18_release_handoff_rule_defined=yes",
    "stage18_ready_for_final_acceptance=yes",
    "Stage 18.4 final runbook operator handoff acceptance - 2026-05-30",
    "stage18_production_runbook_operator_handoff_accepted=yes",
    "stage18_runbook_inventory_accepted=yes",
    "stage18_operator_handoff_accepted=yes",
    "stage18_release_artifact_summary_accepted=yes",
    "stage18_ready_for_final_tag=yes",
]

STAGE14_MARKERS = [
    "Stage 14",
    "documents",
    "verification",
]

STAGE15_MARKERS = [
    "Stage 15.24 admin UX/operator workflow final acceptance",
    "stage15_admin_ux_operator_workflow_complete=yes",
]

STAGE16_MARKERS = [
    "Stage 16.5 release readiness acceptance",
    "stage16_release_readiness_accepted=yes",
]

STAGE17_MARKERS = [
    "Stage 17.5 production deployment readiness acceptance",
    "stage17_production_deployment_readiness_accepted=yes",
    "stage17_ready_for_final_tag=yes",
]

FORBIDDEN_SECRET_VALUES = [
    "BOT_TOKEN=",
    "SERVICE_SECRET=",
    "postgresql://postgres:",
    "AKIA",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require_file(path: Path) -> None:
    if not path.exists():
        raise AssertionError(f"required file is missing: {path.relative_to(ROOT)}")


def require_markers(text: str, markers: list[str], label: str) -> None:
    missing = [marker for marker in markers if marker not in text]
    if missing:
        raise AssertionError(f"{label} is missing markers: {missing}")


def require_no_forbidden_secret_values(text: str, label: str) -> None:
    found = [marker for marker in FORBIDDEN_SECRET_VALUES if marker in text]
    if found:
        raise AssertionError(f"{label} contains forbidden secret-like values: {found}")


def main() -> None:
    for path in REQUIRED_FILES:
        require_file(path)

    doc_text = read_text(DOC_PATH)
    stage14_text = read_text(STAGE14_DOC_PATH)
    stage15_text = read_text(STAGE15_DOC_PATH)
    stage16_text = read_text(STAGE16_DOC_PATH)
    stage17_text = read_text(STAGE17_DOC_PATH)

    require_markers(doc_text, DOC_MARKERS, "stage 18 doc")
    require_markers(stage14_text, STAGE14_MARKERS, "stage 14 doc")
    require_markers(stage15_text, STAGE15_MARKERS, "stage 15 doc")
    require_markers(stage16_text, STAGE16_MARKERS, "stage 16 doc")
    require_markers(stage17_text, STAGE17_MARKERS, "stage 17 doc")

    require_no_forbidden_secret_values(doc_text, "stage 18 doc")

    print(
        "stage 18 production runbook/operator handoff diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "runtime_changed=no, "
        "secrets_printed=no"
    )


if __name__ == "__main__":
    main()
