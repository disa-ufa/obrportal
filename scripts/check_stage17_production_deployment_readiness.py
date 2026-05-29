from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-17-production-deployment-readiness.md"
STAGE14_DOC_PATH = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
STAGE15_DOC_PATH = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"
STAGE16_DOC_PATH = ROOT / "docs" / "stage-16-release-readiness-regression.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE14_DOC_PATH,
    STAGE15_DOC_PATH,
    STAGE16_DOC_PATH,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage15_admin_ux_operator_workflow.py",
    ROOT / "scripts" / "check_stage16_release_readiness_regression.py",
    ROOT / "docker-compose.yml",
    ROOT / ".env.example",
]

DOC_MARKERS = [
    "Stage 17 production deployment readiness baseline - 2026-05-29",
    "stage17_production_deployment_readiness_baseline=yes",
    "stage17_runtime_changed=no",
    "stage17_depends_on_stage14_complete=yes",
    "stage17_depends_on_stage15_complete=yes",
    "stage17_depends_on_stage16_complete=yes",
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
    "stage16_ready_for_final_tag=yes",
]

COMPOSE_MARKERS = [
    "backend",
    "frontend",
    "postgres",
    "redis",
    "minio",
]

ENV_EXAMPLE_MARKERS = [
    "DATABASE_URL",
    "SECRET_KEY",
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
    compose_text = read_text(ROOT / "docker-compose.yml")
    env_example_text = read_text(ROOT / ".env.example")

    require_markers(doc_text, DOC_MARKERS, "stage 17 doc")
    require_markers(stage14_text, STAGE14_MARKERS, "stage 14 doc")
    require_markers(stage15_text, STAGE15_MARKERS, "stage 15 doc")
    require_markers(stage16_text, STAGE16_MARKERS, "stage 16 doc")
    require_markers(compose_text, COMPOSE_MARKERS, "docker-compose.yml")
    require_markers(env_example_text, ENV_EXAMPLE_MARKERS, ".env.example")

    require_no_forbidden_secret_values(doc_text, "stage 17 doc")
    require_no_forbidden_secret_values(env_example_text, ".env.example")

    print(
        "stage 17 production deployment readiness diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "runtime_changed=no, "
        "secrets_printed=no"
    )


if __name__ == "__main__":
    main()
