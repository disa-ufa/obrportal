from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-32-performance-stability-baseline.md"
ARCHIVE_PATH = ROOT / "docs" / "stage-32-post-optimization-stability-measurement-archive.md"
OPTIMIZATION_CHECK_PATH = ROOT / "scripts" / "check_stage32_admin_users_endpoint_optimization.py"
MEASURE_PATH = ROOT / "scripts" / "measure_stage32_admin_endpoint_stability.py"

MARKERS = [
    "Stage 32.4 post-optimization stability measurement archive - 2026-05-31",
    "stage32_post_optimization_stability_archive=yes",
    "stage32_admin_users_optimization_ci_success=yes",
    "stage32_admin_users_fast_path_confirmed=yes",
    "stage32_plain_users_backward_compatible=yes",
    "stage32_no_production_redeploy=yes",
]

ARCHIVE_MARKERS = [
    "GitHub Actions run `2104` completed successfully",
    "optimized commit: `975d583`",
    "filtered/paginated admin users access is now the preferred fast path",
    "plain unbounded `/api/v1/admin/users` remains backward-compatible",
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
    for path in [DOC_PATH, ARCHIVE_PATH, OPTIMIZATION_CHECK_PATH, MEASURE_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), MARKERS, "stage32 doc")
    require_markers(read_text(ARCHIVE_PATH), MARKERS, "stage32 archive")
    require_markers(read_text(ARCHIVE_PATH), ARCHIVE_MARKERS, "stage32 archive details")

    print(
        "stage 32 post-optimization stability archive diagnostics passed: "
        "optimization_ci_success=yes, "
        "fast_path_confirmed=yes, "
        "plain_users_backward_compatible=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
