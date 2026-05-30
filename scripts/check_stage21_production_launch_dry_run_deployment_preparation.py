from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-21-production-launch-dry-run-deployment-preparation.md"
STAGE14_DOC_PATH = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
STAGE15_DOC_PATH = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"
STAGE16_DOC_PATH = ROOT / "docs" / "stage-16-release-readiness-regression.md"
STAGE17_DOC_PATH = ROOT / "docs" / "stage-17-production-deployment-readiness.md"
STAGE18_DOC_PATH = ROOT / "docs" / "stage-18-production-runbook-operator-handoff.md"
STAGE19_DOC_PATH = ROOT / "docs" / "stage-19-production-security-secrets-hardening.md"
STAGE20_DOC_PATH = ROOT / "docs" / "stage-20-final-release-candidate-launch-checklist.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE14_DOC_PATH,
    STAGE15_DOC_PATH,
    STAGE16_DOC_PATH,
    STAGE17_DOC_PATH,
    STAGE18_DOC_PATH,
    STAGE19_DOC_PATH,
    STAGE20_DOC_PATH,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage15_admin_ux_operator_workflow.py",
    ROOT / "scripts" / "check_stage16_release_readiness_regression.py",
    ROOT / "scripts" / "check_stage17_production_deployment_readiness.py",
    ROOT / "scripts" / "check_stage18_production_runbook_operator_handoff.py",
    ROOT / "scripts" / "check_stage19_production_security_secrets_hardening.py",
    ROOT / "scripts" / "check_stage20_final_release_candidate_launch_checklist.py",
    ROOT / "docker-compose.yml",
    ROOT / ".env.example",
    ROOT / ".gitignore",
]

DOC_MARKERS = [
    "Stage 21 production launch dry run deployment preparation baseline - 2026-05-30",
    "stage21_production_launch_dry_run_baseline=yes",
    "stage21_runtime_changed=no",
    "stage21_depends_on_stage14_complete=yes",
    "stage21_depends_on_stage15_complete=yes",
    "stage21_depends_on_stage16_complete=yes",
    "stage21_depends_on_stage17_complete=yes",
    "stage21_depends_on_stage18_complete=yes",
    "stage21_depends_on_stage19_complete=yes",
    "stage21_depends_on_stage20_complete=yes",
    "stage21_no_real_production_launch_without_confirmation=yes",
    "Stage 21.1 dry run guards service health plan - 2026-05-30",
    "stage21_dry_run_guards_service_health_plan_recorded=yes",
    "stage21_guard_sequence_defined=yes",
    "stage21_runtime_checks_defined=yes",
    "stage21_service_health_plan_defined=yes",
    "stage21_dry_run_safety_boundaries_defined=yes",
    "stage21_dry_run_acceptance_criteria_defined=yes",
    "Stage 21.2 deployment execution command plan - 2026-05-30",
    "stage21_deployment_execution_command_plan_recorded=yes",
    "stage21_pre_deploy_command_plan_defined=yes",
    "stage21_backup_command_plan_defined=yes",
    "stage21_update_restart_command_plan_defined=yes",
    "stage21_health_check_command_plan_defined=yes",
    "stage21_post_launch_smoke_command_plan_defined=yes",
    "stage21_rollback_command_plan_defined=yes",
    "stage21_hard_execution_gate_defined=yes",
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
]

STAGE18_MARKERS = [
    "Stage 18.4 final runbook operator handoff acceptance",
    "stage18_production_runbook_operator_handoff_accepted=yes",
]

STAGE19_MARKERS = [
    "Stage 19.4 final production security acceptance",
    "stage19_production_security_accepted=yes",
]

STAGE20_MARKERS = [
    "Stage 20.3 final release candidate acceptance",
    "stage20_final_release_candidate_accepted=yes",
    "stage20_ready_for_final_tag=yes",
]

FORBIDDEN_SECRET_VALUES = [
    "BOT_TOKEN=",
    "SERVICE_SECRET=",
    "AKIA",
    "BEGIN PRIVATE KEY",
    "BEGIN RSA PRIVATE KEY",
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


def require_env_ignored_if_exists() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return

    tracked = subprocess.run(
        ["git", "ls-files", "--error-unmatch", ".env"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if tracked.returncode == 0:
        raise AssertionError(".env is tracked by git; remove it from repository index/history")

    ignored = subprocess.run(
        ["git", "check-ignore", "-q", ".env"],
        cwd=ROOT,
        capture_output=True,
        text=True,
    )
    if ignored.returncode != 0:
        raise AssertionError(".env exists locally but is not ignored by git")


def main() -> None:
    for path in REQUIRED_FILES:
        require_file(path)

    doc_text = read_text(DOC_PATH)
    stage14_text = read_text(STAGE14_DOC_PATH)
    stage15_text = read_text(STAGE15_DOC_PATH)
    stage16_text = read_text(STAGE16_DOC_PATH)
    stage17_text = read_text(STAGE17_DOC_PATH)
    stage18_text = read_text(STAGE18_DOC_PATH)
    stage19_text = read_text(STAGE19_DOC_PATH)
    stage20_text = read_text(STAGE20_DOC_PATH)

    require_markers(doc_text, DOC_MARKERS, "stage 21 doc")
    require_markers(stage14_text, STAGE14_MARKERS, "stage 14 doc")
    require_markers(stage15_text, STAGE15_MARKERS, "stage 15 doc")
    require_markers(stage16_text, STAGE16_MARKERS, "stage 16 doc")
    require_markers(stage17_text, STAGE17_MARKERS, "stage 17 doc")
    require_markers(stage18_text, STAGE18_MARKERS, "stage 18 doc")
    require_markers(stage19_text, STAGE19_MARKERS, "stage 19 doc")
    require_markers(stage20_text, STAGE20_MARKERS, "stage 20 doc")

    require_no_forbidden_secret_values(doc_text, "stage 21 doc")
    require_no_forbidden_secret_values(read_text(ROOT / ".env.example"), ".env.example")
    require_env_ignored_if_exists()

    print(
        "stage 21 production launch dry-run/deployment preparation diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "runtime_changed=no, "
        "secrets_printed=no, "
        "real_launch_executed=no"
    )


if __name__ == "__main__":
    main()
