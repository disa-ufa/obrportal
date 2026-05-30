from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-19-production-security-secrets-hardening.md"
STAGE14_DOC_PATH = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
STAGE15_DOC_PATH = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"
STAGE16_DOC_PATH = ROOT / "docs" / "stage-16-release-readiness-regression.md"
STAGE17_DOC_PATH = ROOT / "docs" / "stage-17-production-deployment-readiness.md"
STAGE18_DOC_PATH = ROOT / "docs" / "stage-18-production-runbook-operator-handoff.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE14_DOC_PATH,
    STAGE15_DOC_PATH,
    STAGE16_DOC_PATH,
    STAGE17_DOC_PATH,
    STAGE18_DOC_PATH,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage15_admin_ux_operator_workflow.py",
    ROOT / "scripts" / "check_stage16_release_readiness_regression.py",
    ROOT / "scripts" / "check_stage17_production_deployment_readiness.py",
    ROOT / "scripts" / "check_stage18_production_runbook_operator_handoff.py",
    ROOT / "docker-compose.yml",
    ROOT / ".env.example",
    ROOT / ".gitignore",
]

DOC_MARKERS = [
    "Stage 19 production security secrets hardening baseline - 2026-05-30",
    "stage19_production_security_secrets_hardening_baseline=yes",
    "stage19_runtime_changed=no",
    "stage19_depends_on_stage14_complete=yes",
    "stage19_depends_on_stage15_complete=yes",
    "stage19_depends_on_stage16_complete=yes",
    "stage19_depends_on_stage17_complete=yes",
    "stage19_depends_on_stage18_complete=yes",
    "Stage 19.1 secrets inventory git hygiene - 2026-05-30",
    "stage19_secrets_inventory_recorded=yes",
    "stage19_env_local_allowed_if_ignored=yes",
    "stage19_env_not_tracked_required=yes",
    "stage19_env_example_placeholders_only=yes",
    "stage19_no_secret_values_printed=yes",
    "stage19_git_hygiene_rules_defined=yes",
    "Stage 19.2 application security checklist - 2026-05-30",
    "stage19_application_security_checklist_recorded=yes",
    "stage19_secret_key_policy_defined=yes",
    "stage19_jwt_token_policy_defined=yes",
    "stage19_cors_url_policy_defined=yes",
    "stage19_admin_credentials_policy_defined=yes",
    "stage19_error_logging_policy_defined=yes",
    "stage19_public_access_policy_defined=yes",
    "Stage 19.3 infrastructure security checklist - 2026-05-30",
    "stage19_infrastructure_security_checklist_recorded=yes",
    "stage19_postgres_credentials_policy_defined=yes",
    "stage19_minio_credentials_policy_defined=yes",
    "stage19_public_ports_policy_defined=yes",
    "stage19_docker_env_policy_defined=yes",
    "stage19_backup_artifact_security_defined=yes",
    "stage19_operational_access_policy_defined=yes",
    "Stage 19.4 final production security acceptance - 2026-05-30",
    "stage19_production_security_accepted=yes",
    "stage19_secrets_inventory_accepted=yes",
    "stage19_application_security_accepted=yes",
    "stage19_infrastructure_security_accepted=yes",
    "stage19_ready_for_final_tag=yes",
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
    "stage18_ready_for_final_tag=yes",
]

GITIGNORE_MARKERS = [
    ".env",
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


def main() -> None:
    for path in REQUIRED_FILES:
        require_file(path)

    doc_text = read_text(DOC_PATH)
    stage14_text = read_text(STAGE14_DOC_PATH)
    stage15_text = read_text(STAGE15_DOC_PATH)
    stage16_text = read_text(STAGE16_DOC_PATH)
    stage17_text = read_text(STAGE17_DOC_PATH)
    stage18_text = read_text(STAGE18_DOC_PATH)
    gitignore_text = read_text(ROOT / ".gitignore")

    require_markers(doc_text, DOC_MARKERS, "stage 19 doc")
    require_markers(stage14_text, STAGE14_MARKERS, "stage 14 doc")
    require_markers(stage15_text, STAGE15_MARKERS, "stage 15 doc")
    require_markers(stage16_text, STAGE16_MARKERS, "stage 16 doc")
    require_markers(stage17_text, STAGE17_MARKERS, "stage 17 doc")
    require_markers(stage18_text, STAGE18_MARKERS, "stage 18 doc")
    require_markers(gitignore_text, GITIGNORE_MARKERS, ".gitignore")

    require_no_forbidden_secret_values(doc_text, "stage 19 doc")
    require_no_forbidden_secret_values(read_text(ROOT / ".env.example"), ".env.example")

    env_path = ROOT / ".env"
    if env_path.exists():
        import subprocess

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


    print(
        "stage 19 production security/secrets hardening diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "runtime_changed=no, "
        "secrets_printed=no"
    )


if __name__ == "__main__":
    main()
