from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-16-release-readiness-regression.md"
STAGE14_DOC_PATH = ROOT / "docs" / "stage-14-documents-certificates-verification.md"
STAGE15_DOC_PATH = ROOT / "docs" / "stage-15-admin-ux-operator-workflow.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE14_DOC_PATH,
    STAGE15_DOC_PATH,
    ROOT / "scripts" / "check_stage14_documents_certificates_verification.py",
    ROOT / "scripts" / "check_stage15_admin_ux_operator_workflow.py",
]

DOC_MARKERS = [
    "Stage 16 release readiness regression baseline - 2026-05-29",
    "stage16_release_readiness_baseline=yes",
    "stage16_runtime_changed=no",
    "stage16_depends_on_stage14_complete=yes",
    "stage16_depends_on_stage15_complete=yes",
]

STAGE14_MARKERS = [
    "Stage 14",
    "documents",
    "verification",
]

STAGE15_MARKERS = [
    "Stage 15.24 admin UX/operator workflow final acceptance",
    "stage15_admin_ux_operator_workflow_complete=yes",
    "friendly_errors_hardening_accepted=yes",
]

FORBIDDEN_SECRET_MARKERS = [
    "BOT_TOKEN=",
    "SECRET_KEY=",
    "SERVICE_SECRET=",
    "DATABASE_URL=postgres",
    "postgresql://",
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


def require_no_forbidden_secrets(text: str, label: str) -> None:
    found = [marker for marker in FORBIDDEN_SECRET_MARKERS if marker in text]
    if found:
        raise AssertionError(f"{label} contains forbidden secret-like markers: {found}")


def main() -> None:
    for path in REQUIRED_FILES:
        require_file(path)

    doc_text = read_text(DOC_PATH)
    stage14_text = read_text(STAGE14_DOC_PATH)
    stage15_text = read_text(STAGE15_DOC_PATH)

    require_markers(doc_text, DOC_MARKERS, "stage 16 doc")
    require_markers(stage14_text, STAGE14_MARKERS, "stage 14 doc")
    require_markers(stage15_text, STAGE15_MARKERS, "stage 15 doc")

    require_no_forbidden_secrets(doc_text, "stage 16 doc")

    print(
        "stage 16 release readiness/regression diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "runtime_changed=no, "
        "secrets_printed=no"
    )


if __name__ == "__main__":
    main()
