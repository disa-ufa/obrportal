from __future__ import annotations

import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REQUIRED_VERSION = "0.1.0-stage6"

BACKEND_MAIN_PATH = ROOT / "backend" / "app" / "main.py"
FRONTEND_PACKAGE_PATH = ROOT / "frontend" / "package.json"
CHANGELOG_PATH = ROOT / "CHANGELOG.md"
HANDOFF_PATH = ROOT / "docs" / "release-handoff.md"
CI_WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"

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

REQUIRED_HANDOFF_COMMANDS = [
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


def parse_frontend_version(package_text: str) -> str:
    payload = json.loads(package_text)
    version = payload.get("version")
    return version if isinstance(version, str) else ""


def parse_backend_versions(main_text: str) -> list[str]:
    versions = re.findall(r'version\s*=\s*"([^"]+)"', main_text)
    versions.extend(re.findall(r'"version"\s*:\s*"([^"]+)"', main_text))
    return versions


def get_release_versioning_diagnostics(
    *,
    backend_main_text: str,
    frontend_package_text: str,
    changelog_text: str,
    handoff_text: str,
) -> dict[str, object]:
    frontend_version = parse_frontend_version(frontend_package_text)
    backend_versions = parse_backend_versions(backend_main_text)

    missing_backend_versions = [
        REQUIRED_VERSION
        for version in [REQUIRED_VERSION]
        if version not in backend_versions
    ]
    mismatched_backend_versions = [
        version for version in backend_versions if version != REQUIRED_VERSION
    ]

    return {
        "requiredVersion": REQUIRED_VERSION,
        "frontendVersion": frontend_version,
        "backendVersions": backend_versions,
        "missingBackendVersions": missing_backend_versions,
        "mismatchedBackendVersions": mismatched_backend_versions,
        "missingChangelogSections": [
            section for section in REQUIRED_CHANGELOG_SECTIONS if section not in changelog_text
        ],
        "missingHandoffSections": [
            section for section in REQUIRED_HANDOFF_SECTIONS if section not in handoff_text
        ],
        "missingHandoffCommands": [
            command for command in REQUIRED_HANDOFF_COMMANDS if command not in handoff_text
        ],
    }


def main() -> None:
    diagnostics = get_release_versioning_diagnostics(
        backend_main_text=read_required_file(BACKEND_MAIN_PATH),
        frontend_package_text=read_required_file(FRONTEND_PACKAGE_PATH),
        changelog_text=read_required_file(CHANGELOG_PATH),
        handoff_text=read_required_file(HANDOFF_PATH),
    )

    errors = []

    if diagnostics["frontendVersion"] != diagnostics["requiredVersion"]:
        errors.append(
            "frontend/package.json version mismatch: "
            f"expected={diagnostics['requiredVersion']} actual={diagnostics['frontendVersion']}"
        )

    for key in [
        "missingBackendVersions",
        "mismatchedBackendVersions",
        "missingChangelogSections",
        "missingHandoffSections",
        "missingHandoffCommands",
    ]:
        for item in diagnostics[key]:
            errors.append(f"{key}: {item}")

    if errors:
        print("Release versioning diagnostics failed:")
        for item in errors:
            print(f" - {item}")
        raise SystemExit(1)

    print(
        "release versioning diagnostics passed: "
        f"version={diagnostics['requiredVersion']}, "
        f"backend_versions={len(diagnostics['backendVersions'])}, "
        f"changelog_sections={len(REQUIRED_CHANGELOG_SECTIONS)}, "
        f"handoff_sections={len(REQUIRED_HANDOFF_SECTIONS)}, "
        f"handoff_commands={len(REQUIRED_HANDOFF_COMMANDS)}"
    )


if __name__ == "__main__":
    main()
