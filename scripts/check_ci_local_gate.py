from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CI_WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"

REQUIRED_CI_SECTIONS = [
    "name: CI",
    "branches:",
    "- main",
    "- develop",
    "uses: actions/checkout@v4",
    "docker compose up -d --build",
    "docker compose down -v",
    "if: failure()",
    "if: always()",
]

REQUIRED_CI_COMMANDS = [
    "python scripts/secret_scan.py",
    "python scripts/check_text_encoding.py",
    "python scripts/check_source_bom.py",
    "python scripts/check_frontend_api_errors.py",
    "python scripts/check_frontend_mojibake.py",
    "python scripts/frontend_guard.py",
    "python scripts/check_ci_local_gate.py",
    "python scripts/check_release_readiness.py",
    "python scripts/check_release_versioning.py",
    "python scripts/check_release_candidate.py",
    "python scripts/check_release_tag.py",
    "python scripts/check_production_deployment_plan.py",
    "docker compose exec -T backend pytest app/tests -q",
    "python scripts/smoke_auth_rbac.py",
    "python scripts/smoke_document_generation_flow.py",
    "python scripts/smoke_documents_page.py",
    "python scripts/smoke_admin_components.py",
    "python scripts/smoke_frontend_admin_pages.py",
    "python scripts/smoke_public_pages.py",
    "python scripts/smoke_account_page.py",
    "python scripts/smoke_frontend_hooks_layout.py",
    "python scripts/smoke_frontend_utils_routes.py",
    "python scripts/smoke_frontend_core.py",
    "python scripts/check_frontend_smoke_coverage.py",
    "python scripts/check_backend_smoke_coverage.py",
    "python scripts/check_no_todo_markers.py",
    "docker compose exec -T frontend npm run build",
    "python scripts/check_frontend_bundle_encoding.py",
]

REQUIRED_SEED_COMMANDS = [
    "docker compose exec -T backend alembic upgrade head",
    "backend python -m app.db.seed",
    "backend python -m app.db.seed_admin",
    "backend python -m app.db.seed_demo_user",
    "backend python -m app.db.seed_demo_organization",
]


def read_ci_workflow() -> str:
    if not CI_WORKFLOW_PATH.exists():
        raise SystemExit("CI workflow file is missing: .github/workflows/ci.yml")

    return CI_WORKFLOW_PATH.read_text(encoding="utf-8")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def contains_command(workflow_text: str, command: str) -> bool:
    return normalize_text(command) in normalize_text(workflow_text)


def get_ci_local_gate_diagnostics(workflow_text: str) -> dict[str, object]:
    missing_sections = [
        section for section in REQUIRED_CI_SECTIONS if section not in workflow_text
    ]
    missing_commands = [
        command
        for command in REQUIRED_CI_COMMANDS
        if not contains_command(workflow_text, command)
    ]
    missing_seed_commands = [
        command
        for command in REQUIRED_SEED_COMMANDS
        if not contains_command(workflow_text, command)
    ]

    return {
        "requiredSectionsTotal": len(REQUIRED_CI_SECTIONS),
        "requiredCommandsTotal": len(REQUIRED_CI_COMMANDS),
        "requiredSeedCommandsTotal": len(REQUIRED_SEED_COMMANDS),
        "missingSections": missing_sections,
        "missingCommands": missing_commands,
        "missingSeedCommands": missing_seed_commands,
        "ok": not missing_sections and not missing_commands and not missing_seed_commands,
    }


def main() -> None:
    workflow_text = read_ci_workflow()
    diagnostics = get_ci_local_gate_diagnostics(workflow_text)

    if diagnostics["missingSections"]:
        print("CI workflow is missing required sections:")
        for item in diagnostics["missingSections"]:
            print(f" - {item}")

    if diagnostics["missingCommands"]:
        print("CI workflow is missing required local gate commands:")
        for item in diagnostics["missingCommands"]:
            print(f" - {item}")

    if diagnostics["missingSeedCommands"]:
        print("CI workflow is missing required database setup commands:")
        for item in diagnostics["missingSeedCommands"]:
            print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "ci/local gate diagnostics passed: "
        f"sections={diagnostics['requiredSectionsTotal']}, "
        f"commands={diagnostics['requiredCommandsTotal']}, "
        f"seed_commands={diagnostics['requiredSeedCommandsTotal']}"
    )


if __name__ == "__main__":
    main()
