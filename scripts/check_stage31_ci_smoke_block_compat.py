from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"
SMOKE_AUTH_PATH = ROOT / "scripts" / "smoke_auth_rbac.py"
SMOKE_FRONTEND_CORE_PATH = ROOT / "scripts" / "smoke_frontend_core.py"
RELEASE_VERSIONING_PATH = ROOT / "scripts" / "check_release_versioning.py"

DOC_MARKERS = [
    "Stage 31.5 CI smoke block compatibility fix - 2026-05-31",
    "stage31_ci_smoke_block_compat=yes",
    "stage31_smoke_auth_rbac_timeout_configurable=yes",
    "stage31_smoke_frontend_core_release_versioning_stage31_compatible=yes",
    "stage31_no_production_redeploy=yes",
]

SMOKE_AUTH_MARKERS = [
    'REQUEST_TIMEOUT = int(os.getenv("SMOKE_REQUEST_TIMEOUT", "60"))',
    "timeout=REQUEST_TIMEOUT",
]

SMOKE_FRONTEND_CORE_MARKERS = [
    '"LEGACY_RELEASE_VERSION"',
    '"DEVELOPMENT_VERSION"',
    '"REQUIRED_LEGACY_HANDOFF_COMMANDS"',
    '"backend_version_source=settings.app_version"',
    '"health_version_source=settings.app_version"',
    '"legacy_release_line="',
]

RELEASE_VERSIONING_MARKERS = [
    'LEGACY_RELEASE_VERSION = "0.1.0-stage6"',
    'DEVELOPMENT_VERSION = "0.1.0-stage31-dev"',
    "backend_version_source=settings.app_version",
    "health_version_source=settings.app_version",
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
    for path in [DOC_PATH, SMOKE_AUTH_PATH, SMOKE_FRONTEND_CORE_PATH, RELEASE_VERSIONING_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    require_markers(read_text(DOC_PATH), DOC_MARKERS, "stage31 doc")
    require_markers(read_text(SMOKE_AUTH_PATH), SMOKE_AUTH_MARKERS, "smoke_auth_rbac")
    require_markers(read_text(SMOKE_FRONTEND_CORE_PATH), SMOKE_FRONTEND_CORE_MARKERS, "smoke_frontend_core")
    require_markers(read_text(RELEASE_VERSIONING_PATH), RELEASE_VERSIONING_MARKERS, "check_release_versioning")

    print(
        "stage 31 CI smoke block compatibility diagnostics passed: "
        "smoke_auth_timeout_configurable=yes, "
        "smoke_frontend_core_stage31_release_versioning_compatible=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
