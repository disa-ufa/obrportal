from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEVELOPMENT_VERSION = "0.1.0-stage64-dev"
LEGACY_RELEASE_VERSION = "0.1.0-stage6"


def read_text(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise SystemExit(message)


def main() -> None:
    config = read_text("backend/app/core/config.py")
    main_py = read_text("backend/app/main.py")
    env_example = read_text(".env.example")
    release_guard = read_text("scripts/check_release_versioning.py")
    test_health = read_text("backend/app/tests/test_health.py")

    package = json.loads(read_text("frontend/package.json"))
    package_lock = json.loads(read_text("frontend/package-lock.json"))
    root_package = package_lock.get("packages", {}).get("", {})

    require(f'default="{DEVELOPMENT_VERSION}"' in config, "backend settings.app_version default is not stage64 dev")
    require('AliasChoices("APP_VERSION", "OBRPORTAL_APP_VERSION")' in config, "APP_VERSION/OBRPORTAL_APP_VERSION aliases are missing")
    require("version=settings.app_version" in main_py, "FastAPI version must use settings.app_version")
    require('"version": settings.app_version' in main_py, "/health version must use settings.app_version")
    require(f"APP_VERSION={DEVELOPMENT_VERSION}" in env_example, ".env.example APP_VERSION is not stage64 dev")
    require(package.get("version") == DEVELOPMENT_VERSION, "frontend/package.json version is not stage64 dev")
    require(package_lock.get("version") == DEVELOPMENT_VERSION, "frontend/package-lock.json top-level version is not stage64 dev")
    require(root_package.get("version") == DEVELOPMENT_VERSION, "frontend/package-lock.json root package version is not stage64 dev")
    require(f'DEVELOPMENT_VERSION = "{DEVELOPMENT_VERSION}"' in release_guard, "release versioning guard development version is not stage64 dev")
    require("LEGACY_RELEASE_VERSION" in release_guard and LEGACY_RELEASE_VERSION in release_guard, "legacy release version marker is missing")
    require("from app.core.config import settings" in test_health, "health test must import settings")
    require('assert payload["version"] == settings.app_version' in test_health, "health test must assert settings.app_version")

    print(
        "stage64 release metadata alignment diagnostics passed: "
        f"development_version={DEVELOPMENT_VERSION}, "
        "backend_version_source=settings.app_version, "
        "health_version_source=settings.app_version, "
        "frontend_package_aligned=yes"
    )


if __name__ == "__main__":
    main()
