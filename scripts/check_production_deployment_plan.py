from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PLAN_PATH = ROOT / "docs" / "production-deployment-plan.md"

REQUIRED_RELEASE_TAG = "v0.1.0-stage6"
REQUIRED_RELEASE_COMMIT = "ac6f339d40567a107dd19f02ec778fbeb5e19971"

REQUIRED_SECTIONS = [
    "# Production deployment plan",
    "## Release baseline",
    "## Deployment goals",
    "## Required production services",
    "## Required environment checks",
    "## Pre-deployment local gate",
    "## Server preparation order",
    "## Backup order before deployment",
    "## Deployment order",
    "## Post-deployment smoke",
    "## Rollback order",
    "## Production acceptance criteria",
]

REQUIRED_COMMANDS = [
    "python .\\scripts\\secret_scan.py",
    "python .\\scripts\\check_text_encoding.py",
    "python .\\scripts\\check_source_bom.py",
    "python .\\scripts\\check_frontend_api_errors.py",
    "python .\\scripts\\check_frontend_mojibake.py",
    "python .\\scripts\\frontend_guard.py",
    "python .\\scripts\\check_ci_local_gate.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_release_versioning.py",
    "python .\\scripts\\check_release_candidate.py",
    "python .\\scripts\\check_release_tag.py",
    "python .\\scripts\\check_production_deployment_plan.py",
    "docker compose exec backend pytest app/tests -q",
    "python .\\scripts\\smoke_auth_rbac.py",
    "python .\\scripts\\smoke_document_generation_flow.py",
    "python .\\scripts\\smoke_documents_page.py",
    "python .\\scripts\\smoke_admin_components.py",
    "python .\\scripts\\smoke_frontend_admin_pages.py",
    "python .\\scripts\\smoke_public_pages.py",
    "python .\\scripts\\smoke_account_page.py",
    "python .\\scripts\\smoke_frontend_hooks_layout.py",
    "python .\\scripts\\smoke_frontend_utils_routes.py",
    "python .\\scripts\\smoke_frontend_core.py",
    "python .\\scripts\\check_frontend_smoke_coverage.py",
    "python .\\scripts\\check_backend_smoke_coverage.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "docker compose exec frontend npm run build",
    "python .\\scripts\\check_frontend_bundle_encoding.py",
]

REQUIRED_MARKERS = [
    "Release tag: `v0.1.0-stage6`.",
    "`ac6f339d40567a107dd19f02ec778fbeb5e19971`",
    "Keep secrets outside Git.",
    "Run migrations safely.",
    "Configure domain, HTTPS and reverse proxy.",
    "Export PostgreSQL database dump.",
    "Checkout `v0.1.0-stage6`.",
    "`/health` returns status `ok` and version `0.1.0-stage6`.",
    "`/api/v1/ready` returns ready status for database, Redis and storage.",
    "Restore previous application revision or previous tag.",
]


def read_plan() -> str:
    if not PLAN_PATH.exists():
        raise SystemExit("Required production deployment plan is missing: docs/production-deployment-plan.md")

    return PLAN_PATH.read_text(encoding="utf-8")


def get_production_deployment_plan_diagnostics(plan_text: str) -> dict[str, object]:
    missing_sections = [section for section in REQUIRED_SECTIONS if section not in plan_text]
    missing_commands = [command for command in REQUIRED_COMMANDS if command not in plan_text]
    missing_markers = [marker for marker in REQUIRED_MARKERS if marker not in plan_text]

    return {
        "requiredReleaseTag": REQUIRED_RELEASE_TAG,
        "requiredReleaseCommit": REQUIRED_RELEASE_COMMIT,
        "missingSections": missing_sections,
        "missingCommands": missing_commands,
        "missingMarkers": missing_markers,
        "ok": not missing_sections and not missing_commands and not missing_markers,
    }


def main() -> None:
    diagnostics = get_production_deployment_plan_diagnostics(read_plan())

    for key in ["missingSections", "missingCommands", "missingMarkers"]:
        if diagnostics[key]:
            print(f"Production deployment plan diagnostics: {key}:")
            for item in diagnostics[key]:
                print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "production deployment plan diagnostics passed: "
        f"tag={diagnostics['requiredReleaseTag']}, "
        f"sections={len(REQUIRED_SECTIONS)}, "
        f"commands={len(REQUIRED_COMMANDS)}, "
        f"markers={len(REQUIRED_MARKERS)}"
    )


if __name__ == "__main__":
    main()
