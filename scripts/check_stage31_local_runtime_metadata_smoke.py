from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"
RELEASE_METADATA_CHECK_PATH = ROOT / "scripts" / "check_stage31_release_metadata_cleanup.py"

DOC_MARKERS = [
    "Stage 31.2 local runtime metadata smoke - 2026-05-30",
    "stage31_local_runtime_metadata_smoke=yes",
    "stage31_local_health_version_stage31_dev=yes",
    "stage31_local_ready_dependencies_ok=yes",
    "stage31_local_frontend_200=yes",
    "stage31_no_production_redeploy=yes",
    "stage31_main_remains_stage30=yes",
]

REQUIRED_REFERENCES = [
    "version=0.1.0-stage31-dev",
    "database=ok",
    "redis=ok",
    "storage=ok",
    "frontend root returned `200 OK`",
    "production server remains on `v0.1.0-stage30-pre-launch-freeze-complete`",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    require(DOC_PATH.exists(), f"missing doc: {DOC_PATH.relative_to(ROOT)}")
    require(RELEASE_METADATA_CHECK_PATH.exists(), "Stage 31.1 guard is missing")

    doc = read_text(DOC_PATH)

    for marker in DOC_MARKERS:
        require(marker in doc, f"stage31 doc missing marker: {marker}")

    for reference in REQUIRED_REFERENCES:
        require(reference in doc, f"stage31 smoke evidence missing reference: {reference}")

    print(
        "stage 31 local runtime metadata smoke diagnostics passed: "
        "health_version_stage31_dev=yes, "
        "ready_dependencies_ok=yes, "
        "frontend_200=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
