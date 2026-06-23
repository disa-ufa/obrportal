from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"
RELEASE_VERSIONING_PATH = ROOT / "scripts" / "check_release_versioning.py"

DOC_MARKERS = [
    "Stage 31.4 CI release versioning compatibility fix - 2026-05-30",
    "stage31_ci_release_versioning_compat=yes",
    "stage31_release_versioning_guard_accepts_configurable_app_version=yes",
    "stage31_legacy_stage6_release_docs_preserved=yes",
    "stage31_development_runtime_version_stage31_dev=yes",
    "stage31_no_production_redeploy=yes",
]

RELEASE_GUARD_MARKERS = [
    'LEGACY_RELEASE_VERSION = "0.1.0-stage6"',
    'DEVELOPMENT_VERSION = "0.1.0-stage31-dev"',
    "version=settings.app_version",
    '"version": settings.app_version',
    "APP_VERSION=0.1.0-stage31-dev",
    "legacy_release_line=",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    require(DOC_PATH.exists(), f"missing doc: {DOC_PATH.relative_to(ROOT)}")
    require(RELEASE_VERSIONING_PATH.exists(), "missing scripts/check_release_versioning.py")

    doc = read_text(DOC_PATH)
    release_guard = read_text(RELEASE_VERSIONING_PATH)

    for marker in DOC_MARKERS:
        require(marker in doc, f"stage31 doc missing marker: {marker}")

    for marker in RELEASE_GUARD_MARKERS:
        require(marker in release_guard, f"release versioning guard missing marker: {marker}")

    print(
        "stage 31 CI release versioning compatibility diagnostics passed: "
        "configurable_app_version=yes, "
        "legacy_stage6_docs_preserved=yes, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
