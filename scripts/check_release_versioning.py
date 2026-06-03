from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

LEGACY_RELEASE_VERSION = "0.1.0-stage6"
DEVELOPMENT_VERSION = "0.1.0-stage64-dev"

BACKEND_MAIN_PATH = ROOT / "backend" / "app" / "main.py"
BACKEND_CONFIG_PATH = ROOT / "backend" / "app" / "core" / "config.py"
ENV_EXAMPLE_PATH = ROOT / ".env.example"
FRONTEND_PACKAGE_PATH = ROOT / "frontend" / "package.json"
FRONTEND_PACKAGE_LOCK_PATH = ROOT / "frontend" / "package-lock.json"
CHANGELOG_PATH = ROOT / "CHANGELOG.md"
HANDOFF_PATH = ROOT / "docs" / "release-handoff.md"

REQUIRED_CHANGELOG_SECTIONS = [
    "# Changelog",
    "## 0.1.0-stage6",
    "### Added",
    "### Quality gate",
    "### Deployment handoff",
    "### Rollback",
]

REQUIRED_HANDOFF_SECTIONS = [
    "# Release handoff",
    "## Release version",
    "## Pre-release checklist",
    "## Deployment order",
    "## Release tag order",
    "## Post-release verification",
    "## Rollback order",
]

REQUIRED_LEGACY_HANDOFF_COMMANDS = [
    "python .\\scripts\\check_release_versioning.py",
    "docker compose exec backend pytest app/tests -q",
    "docker compose exec frontend npm run build",
    "git tag -a v0.1.0-stage6",
    "git push origin v0.1.0-stage6",
]


def read_required_file(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Required release versioning file is missing: {path.relative_to(ROOT).as_posix()}")

    return path.read_text(encoding="utf-8")


def parse_json(path: Path) -> dict:
    return json.loads(read_required_file(path))


def main() -> None:
    backend_main = read_required_file(BACKEND_MAIN_PATH)
    backend_config = read_required_file(BACKEND_CONFIG_PATH)
    env_example = read_required_file(ENV_EXAMPLE_PATH)
    changelog = read_required_file(CHANGELOG_PATH)
    handoff = read_required_file(HANDOFF_PATH)

    package = parse_json(FRONTEND_PACKAGE_PATH)
    package_lock = parse_json(FRONTEND_PACKAGE_LOCK_PATH)

    errors: list[str] = []

    # Stage 31 runtime metadata is now configurable.
    if "app_version: str = Field(" not in backend_config:
        errors.append("backend settings.app_version field is missing")

    if 'default="0.1.0-stage64-dev"' not in backend_config:
        errors.append("backend settings.app_version default must be 0.1.0-stage64-dev")

    if 'AliasChoices("APP_VERSION", "OBRPORTAL_APP_VERSION")' not in backend_config:
        errors.append("backend settings.app_version must accept APP_VERSION/OBRPORTAL_APP_VERSION")

    if "version=settings.app_version" not in backend_main:
        errors.append("FastAPI(version=...) must use settings.app_version")

    if '"version": settings.app_version' not in backend_main:
        errors.append("/health version must use settings.app_version")

    if "APP_VERSION=0.1.0-stage64-dev" not in env_example:
        errors.append(".env.example must document APP_VERSION=0.1.0-stage64-dev")

    if package.get("version") != DEVELOPMENT_VERSION:
        errors.append(
            "frontend/package.json version mismatch: "
            f"expected={DEVELOPMENT_VERSION} actual={package.get('version')}"
        )

    if package_lock.get("version") != DEVELOPMENT_VERSION:
        errors.append(
            "frontend/package-lock.json top-level version mismatch: "
            f"expected={DEVELOPMENT_VERSION} actual={package_lock.get('version')}"
        )

    root_package = package_lock.get("packages", {}).get("", {})
    if root_package.get("version") != DEVELOPMENT_VERSION:
        errors.append(
            "frontend/package-lock.json root package version mismatch: "
            f"expected={DEVELOPMENT_VERSION} actual={root_package.get('version')}"
        )

    # Historical release artifacts remain Stage 6 by design.
    for section in REQUIRED_CHANGELOG_SECTIONS:
        if section not in changelog:
            errors.append(f"missingChangelogSections: {section}")

    for section in REQUIRED_HANDOFF_SECTIONS:
        if section not in handoff:
            errors.append(f"missingHandoffSections: {section}")

    for command in REQUIRED_LEGACY_HANDOFF_COMMANDS:
        if command not in handoff:
            errors.append(f"missingHandoffCommands: {command}")

    if LEGACY_RELEASE_VERSION not in changelog:
        errors.append(f"legacy changelog release line missing: {LEGACY_RELEASE_VERSION}")

    if LEGACY_RELEASE_VERSION not in handoff:
        errors.append(f"legacy handoff release line missing: {LEGACY_RELEASE_VERSION}")

    if errors:
        print("Release versioning diagnostics failed:")
        for item in errors:
            print(f" - {item}")
        raise SystemExit(1)

    print(
        "release versioning diagnostics passed: "
        f"runtime_version={DEVELOPMENT_VERSION}, "
        f"legacy_release_line={LEGACY_RELEASE_VERSION}, "
        "backend_version_source=settings.app_version, "
        "health_version_source=settings.app_version"
    )


if __name__ == "__main__":
    main()
