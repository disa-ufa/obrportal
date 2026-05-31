from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"
MEASURE_PATH = ROOT / "scripts" / "measure_stage32_admin_endpoint_stability.py"

DOC_MARKERS = [
    "Stage 32.1 admin endpoint stability measurements - 2026-05-31",
    "stage32_admin_endpoint_stability_measurements=yes",
    "stage32_admin_users_measured=yes",
    "stage32_admin_audit_events_measured=yes",
    "stage32_measurement_read_only=yes",
    "stage32_no_production_redeploy=yes",
]

MEASURE_MARKERS = [
    '"/api/v1/admin/users"',
    '"/api/v1/admin/audit-events"',
    "STAGE32_MEASURE_ROUNDS",
    "STAGE32_REQUEST_TIMEOUT",
    "timeouts=0",
    "failures=0",
    "stage32 admin endpoint stability measurements passed",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def require_markers(text: str, markers: list[str], label: str) -> None:
    missing = [marker for marker in markers if marker not in text]
    require(not missing, f"{label} missing markers: {missing}")


def main() -> None:
    for path in [DOC_PATH, MEASURE_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage32 doc")
    require_markers(read_text(MEASURE_PATH), MEASURE_MARKERS, "stage32 measurement script")

    print(
        "stage 32 admin endpoint stability measurement diagnostics passed: "
        "admin_users_measured=yes, "
        "admin_audit_events_measured=yes, "
        "read_only=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
