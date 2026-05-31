from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"
STAGE31_DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"

REQUIRED_FILES = [
    DOC_PATH,
    STAGE31_DOC_PATH,
    ROOT / "scripts" / "check_stage31_final_development_cycle_acceptance.py",
    ROOT / "scripts" / "check_stage31_ci_release_versioning_compat.py",
    ROOT / "scripts" / "check_stage31_release_metadata_cleanup.py",
    ROOT / "scripts" / "check_stage30_final_pre_launch_freeze_release_archive_closure.py",
]

DOC_MARKERS = [
    "Stage 32 performance and stability baseline - 2026-05-30",
    "stage32_performance_stability_baseline=yes",
    "stage32_focus_admin_endpoint_stability=yes",
    "stage32_prior_timeout_recorded=yes",
    "stage32_measure_before_optimize=yes",
    "stage32_no_production_redeploy=yes",
    "stage32_main_remains_stage30=yes",
]

STAGE31_MARKERS = [
    "Stage 31.3 final development cycle acceptance - 2026-05-30",
    "stage31_final_development_cycle_accepted=yes",
    "stage31_no_production_redeploy=yes",
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
    stage31_doc = read_text(STAGE31_DOC_PATH)

    for marker in DOC_MARKERS:
        require(marker in doc, f"stage32 doc missing marker: {marker}")

    for marker in STAGE31_MARKERS:
        require(marker in stage31_doc, f"stage31 doc missing marker: {marker}")

    print(
        "stage 32 performance/stability baseline diagnostics passed: "
        "admin_endpoint_stability_focus=yes, "
        "measure_before_optimize=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
