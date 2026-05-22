from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

REQUIRED_VERSION = "0.1.0-stage6"
REQUIRED_RELEASE_TAG = "v0.1.0-stage6"

PUBLICATION_CHECKLIST_PATH = ROOT / "docs" / "release-publication-checklist.md"
RC_CHECKLIST_PATH = ROOT / "docs" / "release-candidate-checklist.md"
HANDOFF_PATH = ROOT / "docs" / "release-handoff.md"
CHANGELOG_PATH = ROOT / "CHANGELOG.md"
CI_WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"

REQUIRED_PUBLICATION_SECTIONS = [
    "# Release publication checklist",
    "## Release tag",
    "## Final publication order",
    "## Release notes",
    "## Post-release smoke",
    "## Rollback checkpoint",
    "## Required commands",
]

REQUIRED_PUBLICATION_COMMANDS = [
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_release_versioning.py",
    "python .\\scripts\\check_release_candidate.py",
    "python .\\scripts\\check_release_tag.py",
    "docker compose exec backend pytest app/tests -q",
    "python .\\scripts\\smoke_auth_rbac.py",
    "python .\\scripts\\smoke_document_generation_flow.py",
    "python .\\scripts\\smoke_documents_page.py",
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
    "python scripts/check_release_tag.py",
    "docker compose exec -T backend pytest app/tests -q",
    "python scripts/smoke_auth_rbac.py",
    "python scripts/smoke_document_generation_flow.py",
    "python scripts/smoke_documents_page.py",
    "docker compose exec -T frontend npm run build",
    "python scripts/check_frontend_bundle_encoding.py",
]

REQUIRED_RC_MARKERS = [
    "# Release candidate checklist",
    "Expected tag: v0.1.0-stage6",
    "## Post-release verification",
    "## Rollback readiness",
]

REQUIRED_HANDOFF_MARKERS = [
    "# Release handoff",
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
        raise SystemExit(f"Required release tag file is missing: {path.relative_to(ROOT).as_posix()}")

    return path.read_text(encoding="utf-8")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def contains_command(text: str, command: str) -> bool:
    return normalize_text(command) in normalize_text(text)


def get_release_tag_diagnostics(
    *,
    publication_text: str,
    rc_text: str,
    handoff_text: str,
    changelog_text: str,
    ci_text: str,
) -> dict[str, object]:
    missing_publication_sections = [
        section for section in REQUIRED_PUBLICATION_SECTIONS if section not in publication_text
    ]
    missing_publication_commands = [
        command for command in REQUIRED_PUBLICATION_COMMANDS if command not in publication_text
    ]
    missing_ci_commands = [
        command for command in REQUIRED_CI_COMMANDS if not contains_command(ci_text, command)
    ]
    missing_rc_markers = [
        marker for marker in REQUIRED_RC_MARKERS if marker not in rc_text
    ]
    missing_handoff_markers = [
        marker for marker in REQUIRED_HANDOFF_MARKERS if marker not in handoff_text
    ]
    missing_changelog_markers = [
        marker for marker in REQUIRED_CHANGELOG_MARKERS if marker not in changelog_text
    ]

    return {
        "requiredVersion": REQUIRED_VERSION,
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "missingPublicationSections": missing_publication_sections,
        "missingPublicationCommands": missing_publication_commands,
        "missingCiCommands": missing_ci_commands,
        "missingRcMarkers": missing_rc_markers,
        "missingHandoffMarkers": missing_handoff_markers,
        "missingChangelogMarkers": missing_changelog_markers,
        "ok": (
            not missing_publication_sections
            and not missing_publication_commands
            and not missing_ci_commands
            and not missing_rc_markers
            and not missing_handoff_markers
            and not missing_changelog_markers
        ),
    }


def main() -> None:
    diagnostics = get_release_tag_diagnostics(
        publication_text=read_required_file(PUBLICATION_CHECKLIST_PATH),
        rc_text=read_required_file(RC_CHECKLIST_PATH),
        handoff_text=read_required_file(HANDOFF_PATH),
        changelog_text=read_required_file(CHANGELOG_PATH),
        ci_text=read_required_file(CI_WORKFLOW_PATH),
    )

    for key in [
        "missingPublicationSections",
        "missingPublicationCommands",
        "missingCiCommands",
        "missingRcMarkers",
        "missingHandoffMarkers",
        "missingChangelogMarkers",
    ]:
        if diagnostics[key]:
            print(f"Release tag diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "release tag diagnostics passed: "
        f"version={diagnostics['requiredVersion']}, "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_PUBLICATION_SECTIONS)}, "
        f"commands={len(REQUIRED_PUBLICATION_COMMANDS)}, "
        f"ci_commands={len(REQUIRED_CI_COMMANDS)}"
    )


if __name__ == "__main__":
    main()
