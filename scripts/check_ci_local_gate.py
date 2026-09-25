from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CI_WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"
CI_COMPOSE_PATH = ROOT / ".github" / "compose.ci.yml"
CI_MINIO_DOCKERFILE_PATH = ROOT / ".github" / "docker" / "minio-ci.Dockerfile"

REQUIRED_CI_SECTIONS = [
    "name: CI",
    "branches:",
    "- main",
    "- develop",
    "uses: actions/checkout@v4",
    'COMPOSE_FILE: "docker-compose.yml:.github/compose.ci.yml"',
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
    "python scripts/check_frontend_api_base_config.py",
    "python scripts/check_frontend_no_demo_credentials.py",
    "python scripts/frontend_guard.py",
    "python scripts/check_ci_local_gate.py",
    "python scripts/check_release_readiness.py",
    "python scripts/check_release_versioning.py",
    "python scripts/check_release_candidate.py",
    "python scripts/check_release_tag.py",
    "python scripts/check_production_deployment_plan.py",
    "python scripts/check_production_environment_template.py",
    "python scripts/check_production_server_checklist.py",
    "python scripts/check_production_reverse_proxy_checklist.py",
    "python scripts/check_production_backup_monitoring_checklist.py",
    "python scripts/check_production_deployment_runbook.py",
    "python scripts/check_production_rollout_inventory.py",
    "python scripts/check_production_server_facts.py",
    "python scripts/check_production_server_preflight_execution.py",
    "python scripts/check_production_fact_collection_result.py",
    "python scripts/check_production_server_remediation_plan.py",
    "python scripts/check_production_domain_reverse_proxy_decision.py",
    "python scripts/check_production_domain_dns_verification.py",
    "python scripts/check_production_operations_baseline.py",
    "python scripts/check_production_monitoring_smoke.py",
    "python scripts/check_production_backup_verification.py",
    "python scripts/check_production_operational_runbook.py",
    "python scripts/check_production_maintenance_update_checklist.py",
    "python scripts/check_production_handover_package.py",
    "python scripts/check_production_stage9_final_gate.py",
    "python scripts/check_project_roadmap_after_stage9.py",
    "python scripts/check_readme_stage10_state.py",
    "python scripts/check_production_initialization_runbook.py",
    "docker compose exec -T backend pytest app/tests -q",
    "python scripts/smoke_auth_rbac.py",
    "python scripts/smoke_auth_entry_route_guards.py",
    "python scripts/smoke_auth_components.py",
    "python scripts/smoke_login_page_layout.py",
    "python scripts/smoke_register_page_layout.py",
    "python scripts/smoke_document_generation_flow.py",
    "python scripts/smoke_documents_page.py",
    "python scripts/smoke_admin_components.py",
    "python scripts/smoke_frontend_admin_pages.py",
    "python scripts/smoke_public_pages.py",
    "python scripts/smoke_account_page.py",
    "python scripts/smoke_stage12_1_account_workflow.py",
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



REQUIRED_CI_COMPOSE_MARKERS = [
    "services:",
    "minio:",
    "image: obrportal-minio-ci:release-2025-10-15",
    "pull_policy: build",
    "dockerfile: .github/docker/minio-ci.Dockerfile",
    "MINIO_REF: RELEASE.2025-10-15T17-29-55Z",
    "MINIO_COMMIT: 9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a",
    "/minio/health/live",
]

REQUIRED_CI_MINIO_DOCKERFILE_MARKERS = [
    "FROM golang:1.24-alpine AS build",
    "ARG TARGETARCH",
    "ARG MINIO_REF=RELEASE.2025-10-15T17-29-55Z",
    "ARG MINIO_COMMIT=9e49d5e7a648f00e26f2246f4dc28e6b07f8c84a",
    "git clone --depth 1 --branch",
    'test "$(git rev-parse HEAD)" = "${MINIO_COMMIT}"',
    "go run buildscripts/gen-ldflags.go",
    "CGO_ENABLED=0",
    'GOARCH="${TARGETARCH:-amd64}"',
    "FROM alpine:3.22",
    "apk add --no-cache ca-certificates curl",
    'ENTRYPOINT ["/usr/bin/minio"]',
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


def read_required_text(path: Path, label: str) -> str:
    if not path.exists():
        raise SystemExit(f"{label} file is missing: {path.relative_to(ROOT)}")

    return path.read_text(encoding="utf-8")


def get_ci_minio_diagnostics() -> dict[str, object]:
    compose_text = read_required_text(
        CI_COMPOSE_PATH,
        "CI compose override",
    )
    dockerfile_text = read_required_text(
        CI_MINIO_DOCKERFILE_PATH,
        "CI MinIO Dockerfile",
    )

    missing_compose_markers = [
        marker
        for marker in REQUIRED_CI_COMPOSE_MARKERS
        if marker not in compose_text
    ]

    missing_dockerfile_markers = [
        marker
        for marker in REQUIRED_CI_MINIO_DOCKERFILE_MARKERS
        if marker not in dockerfile_text
    ]

    return {
        "requiredComposeMarkersTotal": len(REQUIRED_CI_COMPOSE_MARKERS),
        "requiredDockerfileMarkersTotal": len(
            REQUIRED_CI_MINIO_DOCKERFILE_MARKERS
        ),
        "missingComposeMarkers": missing_compose_markers,
        "missingDockerfileMarkers": missing_dockerfile_markers,
        "ok": not missing_compose_markers and not missing_dockerfile_markers,
    }


def main() -> None:
    workflow_text = read_ci_workflow()
    diagnostics = get_ci_local_gate_diagnostics(workflow_text)
    minio_diagnostics = get_ci_minio_diagnostics()

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

    if minio_diagnostics["missingComposeMarkers"]:
        print("CI compose override is missing required markers:")
        for item in minio_diagnostics["missingComposeMarkers"]:
            print(f" - {item}")

    if minio_diagnostics["missingDockerfileMarkers"]:
        print("CI MinIO Dockerfile is missing required markers:")
        for item in minio_diagnostics["missingDockerfileMarkers"]:
            print(f" - {item}")

    if not diagnostics["ok"] or not minio_diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "ci/local gate diagnostics passed: "
        f"sections={diagnostics['requiredSectionsTotal']}, "
        f"commands={diagnostics['requiredCommandsTotal']}, "
        f"seed_commands={diagnostics['requiredSeedCommandsTotal']}, "
        f"minio_compose_markers="
        f"{minio_diagnostics['requiredComposeMarkersTotal']}, "
        f"minio_dockerfile_markers="
        f"{minio_diagnostics['requiredDockerfileMarkersTotal']}"
    )


if __name__ == "__main__":
    main()
