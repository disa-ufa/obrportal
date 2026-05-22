from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_VERSION = "0.1.0-stage6"
REQUIRED_RC_TAG = "v0.1.0-stage6"

RC_CHECKLIST_PATH = ROOT / "docs" / "release-candidate-checklist.md"
HANDOFF_PATH = ROOT / "docs" / "release-handoff.md"
CHANGELOG_PATH = ROOT / "CHANGELOG.md"
CI_WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"

REQUIRED_RC_CHECKLIST_SECTIONS = [
    "# Release candidate checklist",
    "## Release candidate version",
    "## Tag readiness",
    "## CI status readiness",
    "## Post-release verification",
    "## Rollback readiness",
    "## Required commands",
]

REQUIRED_RC_COMMANDS = [
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_release_versioning.py",
    "python .\\scripts\\check_release_candidate.py",
    "docker compose exec backend pytest app/tests -q",
    "python .\\scripts\\smoke_auth_rbac.py",
    "docker compose exec frontend npm run build",
    "python .\\scripts\\check_frontend_bundle_encoding.py",
    "git tag -a v0.1.0-stage6",
    "git push origin v0.1.0-stage6",
]

REQUIRED_CI_COMMANDS = [
    "python scripts/check_ci_local_gate.py",
    "python scripts/check_release_readiness.py",
    "python scripts/check_release_versioning.py",
    "python scripts/check_release_candidate.py",
    "docker compose exec -T backend pytest app/tests -q",
    "python scripts/smoke_auth_rbac.py",
    "docker compose exec -T frontend npm run build",
    "python scripts/check_frontend_bundle_encoding.py",
]

REQUIRED_HANDOFF_MARKERS = [
    "Current release line",
    "0.1.0-stage6",
    "git tag -a v0.1.0-stage6",
    "git push origin v0.1.0-stage6",
    "Post-release verification",
    "Rollback order",
]

REQUIRED_CHANGELOG_MARKERS = [
    "# Changelog",
    "## 0.1.0-stage6",
    "### Quality gate",
    "### Deployment handoff",
    "### Rollback",
]


def read_required_file(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Required release candidate file is missing: {path.relative_to(ROOT).as_posix()}")

    return path.read_text(encoding="utf-8")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def contains_command(text: str, command: str) -> bool:
    return normalize_text(command) in normalize_text(text)


def get_release_candidate_diagnostics(
    *,
    checklist_text: str,
    handoff_text: str,
    changelog_text: str,
    ci_text: str,
) -> dict[str, object]:
    missing_candidate_sections = [
        section for section in REQUIRED_RC_CHECKLIST_SECTIONS if section not in checklist_text
    ]
    missing_candidate_commands = [
        command for command in REQUIRED_RC_COMMANDS if command not in checklist_text
    ]
    missing_ci_commands = [
        command for command in REQUIRED_CI_COMMANDS if not contains_command(ci_text, command)
    ]
    missing_handoff_markers = [
        marker for marker in REQUIRED_HANDOFF_MARKERS if marker not in handoff_text
    ]
    missing_changelog_markers = [
        marker for marker in REQUIRED_CHANGELOG_MARKERS if marker not in changelog_text
    ]

    return {
        "requiredVersion": REQUIRED_VERSION,
        "requiredRcTag": REQUIRED_RC_TAG,
        "missingCandidateSections": missing_candidate_sections,
        "missingCandidateCommands": missing_candidate_commands,
        "missingCiCommands": missing_ci_commands,
        "missingHandoffMarkers": missing_handoff_markers,
        "missingChangelogMarkers": missing_changelog_markers,
        "ok": (
            not missing_candidate_sections
            and not missing_candidate_commands
            and not missing_ci_commands
            and not missing_handoff_markers
            and not missing_changelog_markers
        ),
    }


def main() -> None:
    diagnostics = get_release_candidate_diagnostics(
        checklist_text=read_required_file(RC_CHECKLIST_PATH),
        handoff_text=read_required_file(HANDOFF_PATH),
        changelog_text=read_required_file(CHANGELOG_PATH),
        ci_text=read_required_file(CI_WORKFLOW_PATH),
    )

    for key in [
        "missingCandidateSections",
        "missingCandidateCommands",
        "missingCiCommands",
        "missingHandoffMarkers",
        "missingChangelogMarkers",
    ]:
        if diagnostics[key]:
            print(f"Release candidate diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "release candidate diagnostics passed: "
        f"version={diagnostics['requiredVersion']}, "
        f"tag={diagnostics['requiredRcTag']}, "
        f"sections={len(REQUIRED_RC_CHECKLIST_SECTIONS)}, "
        f"commands={len(REQUIRED_RC_COMMANDS)}, "
        f"ci_commands={len(REQUIRED_CI_COMMANDS)}"
    )


if __name__ == "__main__":
    main()
