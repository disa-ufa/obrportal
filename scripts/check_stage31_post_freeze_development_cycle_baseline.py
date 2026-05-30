from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"
STAGE30_DOC_PATH = ROOT / "docs" / "stage-30-final-pre-launch-freeze-release-archive-closure.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE30_DOC_PATH,
    ROOT / "scripts" / "check_stage30_final_pre_launch_freeze_release_archive_closure.py",
    ROOT / "docker-compose.yml",
    ROOT / ".env.example",
    ROOT / ".gitignore",
]

DOC_MARKERS = [
    "Stage 31 post freeze development cycle baseline - 2026-05-30",
    "stage31_post_freeze_development_cycle_baseline=yes",
    "stage31_production_remains_stage30=yes",
    "stage31_main_remains_production_branch=yes",
    "stage31_develop_is_active_development_branch=yes",
    "stage31_no_production_redeploy=yes",
    "stage31_no_runtime_changes=yes",
    "stage31_no_database_migrations=yes",
    "stage31_no_destructive_commands=yes",
]

STAGE30_MARKERS = [
    "Stage 30.2 final pre launch freeze acceptance archive closure",
    "stage30_final_pre_launch_freeze_accepted=yes",
    "stage30_release_archive_closed=yes",
    "stage30_project_pre_launch_ready=yes",
    "stage30_runtime_frozen=yes",
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
    stage30_text = read_text(STAGE30_DOC_PATH)

    require_markers(doc_text, DOC_MARKERS, "stage 31 doc")
    require_markers(stage30_text, STAGE30_MARKERS, "stage 30 doc")

    require_no_forbidden_secret_values(doc_text, "stage 31 doc")
    require_no_forbidden_secret_values(read_text(ROOT / ".env.example"), ".env.example")

    print(
        "stage 31 post-freeze development cycle baseline diagnostics passed: "
        f"doc_markers={len(DOC_MARKERS)}, "
        f"required_files={len(REQUIRED_FILES)}, "
        "production_remains_stage30=yes, "
        "runtime_changed=no"
    )


if __name__ == "__main__":
    main()
