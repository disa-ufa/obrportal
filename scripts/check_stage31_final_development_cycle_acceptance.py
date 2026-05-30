from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"
STAGE30_DOC_PATH = ROOT / "docs" / "stage-30-final-pre-launch-freeze-release-archive-closure.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE30_DOC_PATH,
    ROOT / "scripts" / "check_stage31_local_runtime_metadata_smoke.py",
    ROOT / "scripts" / "check_stage31_release_metadata_cleanup.py",
    ROOT / "scripts" / "check_stage31_post_freeze_development_cycle_baseline.py",
    ROOT / "scripts" / "check_stage30_final_pre_launch_freeze_release_archive_closure.py",
]

DOC_MARKERS = [
    "Stage 31.3 final development cycle acceptance - 2026-05-30",
    "stage31_final_development_cycle_accepted=yes",
    "stage31_release_metadata_cleanup_accepted=yes",
    "stage31_local_runtime_smoke_accepted=yes",
    "stage31_develop_contains_stage31=yes",
    "stage31_main_remains_stage30=yes",
    "stage31_no_production_redeploy=yes",
    "stage31_ready_for_next_development_stage=yes",
]

REQUIRED_REFERENCES = [
    "backend application version is configurable through `APP_VERSION`",
    "local runtime smoke confirmed `/health` version `0.1.0-stage31-dev`",
    "production server remains on `v0.1.0-stage30-pre-launch-freeze-complete`",
    "Stage 31 is not promoted to `main`",
    "Stage 31 is not deployed to production",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    for path in REQUIRED_FILES:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    doc = read_text(DOC_PATH)

    for marker in DOC_MARKERS:
        require(marker in doc, f"stage31 doc missing marker: {marker}")

    for reference in REQUIRED_REFERENCES:
        require(reference in doc, f"stage31 final acceptance missing reference: {reference}")

    print(
        "stage 31 final development cycle acceptance diagnostics passed: "
        "stage31_accepted=yes, "
        "develop_contains_stage31=yes, "
        "main_remains_stage30=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
