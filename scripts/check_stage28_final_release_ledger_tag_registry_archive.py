from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-28-final-release-ledger-tag-registry-archive.md"
STAGE14_DOC_PATH = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
STAGE15_DOC_PATH = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"
STAGE16_DOC_PATH = ROOT / "docs" / "stage-16-release-readiness-regression.md"
STAGE17_DOC_PATH = ROOT / "docs" / "stage-17-production-deployment-readiness.md"
STAGE18_DOC_PATH = ROOT / "docs" / "stage-18-production-runbook-operator-handoff.md"
STAGE19_DOC_PATH = ROOT / "docs" / "stage-19-production-security-secrets-hardening.md"
STAGE20_DOC_PATH = ROOT / "docs" / "stage-20-final-release-candidate-launch-checklist.md"
STAGE21_DOC_PATH = ROOT / "docs" / "stage-21-production-launch-dry-run-deployment-preparation.md"
STAGE22_DOC_PATH = ROOT / "docs" / "stage-22-production-launch-go-no-go-controlled-execution.md"
STAGE23_DOC_PATH = ROOT / "docs" / "stage-23-controlled-production-launch-execution-preparation.md"
STAGE24_DOC_PATH = ROOT / "docs" / "stage-24-production-launch-final-evidence-package.md"
STAGE25_DOC_PATH = ROOT / "docs" / "stage-25-final-project-closure-handoff-package.md"
STAGE26_DOC_PATH = ROOT / "docs" / "stage-26-pre-production-operational-rehearsal.md"
STAGE27_DOC_PATH = ROOT / "docs" / "stage-27-final-production-launch-command-pack-dry-archive.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE14_DOC_PATH,
    STAGE15_DOC_PATH,
    STAGE16_DOC_PATH,
    STAGE17_DOC_PATH,
    STAGE18_DOC_PATH,
    STAGE19_DOC_PATH,
    STAGE20_DOC_PATH,
    STAGE21_DOC_PATH,
    STAGE22_DOC_PATH,
    STAGE23_DOC_PATH,
    STAGE24_DOC_PATH,
    STAGE25_DOC_PATH,
    STAGE26_DOC_PATH,
    STAGE27_DOC_PATH,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage15_admin_ux_operator_workflow.py",
    ROOT / "scripts" / "check_stage16_release_readiness_regression.py",
    ROOT / "scripts" / "check_stage17_production_deployment_readiness.py",
    ROOT / "scripts" / "check_stage18_production_runbook_operator_handoff.py",
    ROOT / "scripts" / "check_stage19_production_security_secrets_hardening.py",
    ROOT / "scripts" / "check_stage20_final_release_candidate_launch_checklist.py",
    ROOT / "scripts" / "check_stage21_production_launch_dry_run_deployment_preparation.py",
    ROOT / "scripts" / "check_stage22_production_launch_go_no_go_controlled_execution.py",
    ROOT / "scripts" / "check_stage23_controlled_production_launch_execution_preparation.py",
    ROOT / "scripts" / "check_stage24_production_launch_final_evidence_package.py",
    ROOT / "scripts" / "check_stage25_final_project_closure_handoff_package.py",
    ROOT / "scripts" / "check_stage26_pre_production_operational_rehearsal.py",
    ROOT / "scripts" / "check_stage27_final_production_launch_command_pack_dry_archive.py",
    ROOT / "docker-compose.yml",
    ROOT / ".env.example",
    ROOT / ".gitignore",
]

DOC_MARKERS = [
    "Stage 28 final release ledger tag registry archive baseline - 2026-05-30",
    "stage28_final_release_ledger_baseline=yes",
    "stage28_runtime_changed=no",
    "stage28_depends_on_stage14_complete=yes",
    "stage28_depends_on_stage15_complete=yes",
    "stage28_depends_on_stage16_complete=yes",
    "stage28_depends_on_stage17_complete=yes",
    "stage28_depends_on_stage18_complete=yes",
    "stage28_depends_on_stage19_complete=yes",
    "stage28_depends_on_stage20_complete=yes",
    "stage28_depends_on_stage21_complete=yes",
    "stage28_depends_on_stage22_complete=yes",
    "stage28_depends_on_stage23_complete=yes",
    "stage28_depends_on_stage24_complete=yes",
    "stage28_depends_on_stage25_complete=yes",
    "stage28_depends_on_stage26_complete=yes",
    "stage28_depends_on_stage27_complete=yes",
    "stage28_real_launch_executed_no=yes",
]

STAGE14_MARKERS = ["Stage 14", "documents", "verification"]

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
]

STAGE21_MARKERS = [
    "Stage 21.3 final dry run acceptance",
    "stage21_final_dry_run_accepted=yes",
    "stage21_real_launch_executed_no=yes",
]

STAGE22_MARKERS = [
    "Stage 22.3 final go no go acceptance",
    "stage22_final_go_no_go_accepted=yes",
    "stage22_real_launch_executed_no=yes",
]

STAGE23_MARKERS = [
    "Stage 23.3 final controlled launch preparation acceptance",
    "stage23_final_controlled_launch_preparation_accepted=yes",
    "stage23_real_launch_executed_no=yes",
]

STAGE24_MARKERS = [
    "Stage 24.3 final evidence package acceptance",
    "stage24_final_evidence_package_accepted=yes",
    "stage24_real_launch_executed_no=yes",
]

STAGE25_MARKERS = [
    "Stage 25.3 final project closure acceptance",
    "stage25_final_project_closure_accepted=yes",
    "stage25_real_launch_executed_no=yes",
]

STAGE26_MARKERS = [
    "Stage 26.3 final operational rehearsal acceptance",
    "stage26_final_operational_rehearsal_accepted=yes",
    "stage26_real_launch_executed_no=yes",
]

STAGE27_MARKERS = [
    "Stage 27.3 final command pack acceptance",
    "stage27_final_command_pack_accepted=yes",
    "stage27_real_launch_executed_no=yes",
    "stage27_ready_for_final_tag=yes",
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
    require_markers(doc_text, DOC_MARKERS, "stage 28 doc")
    require_markers(read_text(STAGE14_DOC_PATH), STAGE14_MARKERS, "stage 14 doc")
    require_markers(read_text(STAGE15_DOC_PATH), STAGE15_MARKERS, "stage 15 doc")
    require_markers(read_text(STAGE16_DOC_PATH), STAGE16_MARKERS, "stage 16 doc")
    require_markers(read_text(STAGE17_DOC_PATH), STAGE17_MARKERS, "stage 17 doc")
    require_markers(read_text(STAGE18_DOC_PATH), STAGE18_MARKERS, "stage 18 doc")
    require_markers(read_text(STAGE19_DOC_PATH), STAGE19_MARKERS, "stage 19 doc")
    require_markers(read_text(STAGE20_DOC_PATH), STAGE20_MARKERS, "stage 20 doc")
    require_markers(read_text(STAGE21_DOC_PATH), STAGE21_MARKERS, "stage 21 doc")
    require_markers(read_text(STAGE22_DOC_PATH), STAGE22_MARKERS, "stage 22 doc")
    require_markers(read_text(STAGE23_DOC_PATH), STAGE23_MARKERS, "stage 23 doc")
    require_markers(read_text(STAGE24_DOC_PATH), STAGE24_MARKERS, "stage 24 doc")
    require_markers(read_text(STAGE25_DOC_PATH), STAGE25_MARKERS, "stage 25 doc")
    require_markers(read_text(STAGE26_DOC_PATH), STAGE26_MARKERS, "stage 26 doc")
    require_markers(read_text(STAGE27_DOC_PATH), STAGE27_MARKERS, "stage 27 doc")

    require_no_forbidden_secret_values(doc_text, "stage 28 doc")
    require_no_forbidden_secret_values(read_text(ROOT / ".env.example"), ".env.example")
    require_env_ignored_if_exists()

    print(
        "stage 28 final release ledger tag registry archive diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "runtime_changed=no, "
        "secrets_printed=no, "
        "real_launch_executed=no"
    )


if __name__ == "__main__":
    main()
