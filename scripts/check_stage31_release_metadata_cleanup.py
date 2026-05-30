from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]

CONFIG_PATH = ROOT / "backend" / "app" / "core" / "config.py"
MAIN_PATH = ROOT / "backend" / "app" / "main.py"
ENV_EXAMPLE_PATH = ROOT / ".env.example"
PACKAGE_PATH = ROOT / "frontend" / "package.json"
PACKAGE_LOCK_PATH = ROOT / "frontend" / "package-lock.json"
DOC_PATH = ROOT / "docs" / "stage-31-post-freeze-development-cycle-baseline.md"

REQUIRED_MARKERS = [
    "Stage 31.1 release metadata cleanup - 2026-05-30",
    "stage31_release_metadata_cleanup=yes",
    "stage31_app_version_configurable=yes",
    "stage31_health_uses_settings_app_version=yes",
    "stage31_no_stage6_runtime_metadata=yes",
    "stage31_no_production_redeploy=yes",
]

FORBIDDEN_IN_RUNTIME_METADATA = [
    "0.1.0-stage6",
]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> None:
    for path in [CONFIG_PATH, MAIN_PATH, ENV_EXAMPLE_PATH, PACKAGE_PATH, PACKAGE_LOCK_PATH, DOC_PATH]:
        require(path.exists(), f"required file missing: {path.relative_to(ROOT)}")

    config = read_text(CONFIG_PATH)
    main_py = read_text(MAIN_PATH)
    env_example = read_text(ENV_EXAMPLE_PATH)
    doc = read_text(DOC_PATH)

    require("app_version: str = Field(" in config, "settings.app_version is missing")
    require('AliasChoices("APP_VERSION", "OBRPORTAL_APP_VERSION")' in config, "APP_VERSION alias is missing")
    require("version=settings.app_version" in main_py, "FastAPI version must use settings.app_version")
    require('"version": settings.app_version' in main_py, "health version must use settings.app_version")
    require("APP_VERSION=0.1.0-stage31-dev" in env_example, ".env.example must document APP_VERSION")

    for marker in REQUIRED_MARKERS:
        require(marker in doc, f"stage31 doc missing marker: {marker}")

    runtime_text = "\n".join([
        main_py,
        read_text(PACKAGE_PATH),
        read_text(PACKAGE_LOCK_PATH),
    ])

    for forbidden in FORBIDDEN_IN_RUNTIME_METADATA:
        require(forbidden not in runtime_text, f"stale runtime metadata remains: {forbidden}")

    package = json.loads(read_text(PACKAGE_PATH))
    require(package.get("version") == "0.1.0-stage31-dev", "frontend package version is not stage31 dev")

    package_lock = json.loads(read_text(PACKAGE_LOCK_PATH))
    require(package_lock.get("version") == "0.1.0-stage31-dev", "frontend package-lock top-level version is not stage31 dev")
    require(
        package_lock.get("packages", {}).get("", {}).get("version") == "0.1.0-stage31-dev",
        "frontend package-lock root package version is not stage31 dev",
    )

    print(
        "stage 31 release metadata cleanup diagnostics passed: "
        "app_version_configurable=yes, "
        "health_uses_settings_app_version=yes, "
        "stale_stage6_runtime_metadata=no, "
        "production_redeploy=no"
    )


if __name__ == "__main__":
    main()
