from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

ENV_EXAMPLE_PATH = ROOT / ".env.example"
COMPOSE_PATH = ROOT / "docker-compose.yml"
CI_WORKFLOW_PATH = ROOT / ".github" / "workflows" / "ci.yml"

REQUIRED_ENV_KEYS = [
    "APP_NAME",
    "ENVIRONMENT",
    "API_PORT",
    "FRONTEND_PORT",
    "SECRET_KEY",
    "ACCESS_TOKEN_EXPIRE_MINUTES",
    "POSTGRES_DB",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "DATABASE_URL",
    "REDIS_URL",
    "S3_ENDPOINT_URL",
    "S3_PUBLIC_ENDPOINT_URL",
    "S3_ACCESS_KEY",
    "S3_SECRET_KEY",
    "S3_BUCKET_PRIVATE",
    "S3_BUCKET_PUBLIC",
    "VITE_API_URL",
    "SEED_ORG_INN",
    "SEED_ORG_KPP",
    "SEED_ORG_OGRN",
    "SEED_ORG_NAME",
    "SEED_DEMO_COURSE_SLUG",
    "SEED_DEMO_GROUP_CODE",
    "DOCUMENT_ORG_NAME",
    "DOCUMENT_ORG_SHORT_NAME",
    "DOCUMENT_SIGNER_POSITION",
    "DOCUMENT_SIGNER_FULL_NAME",
]

REQUIRED_COMPOSE_SECTIONS = [
    "postgres:",
    "redis:",
    "minio:",
    "backend:",
    "frontend:",
    "postgres_data:",
    "minio_data:",
    "healthcheck:",
    "pg_isready",
    "redis-cli",
    "\"mc\", \"ready\"",
    "depends_on:",
    "env_file:",
    "uvicorn app.main:app",
    "npm run dev",
]

REQUIRED_RELEASE_COMMANDS = [
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
    "python scripts/check_production_environment_template.py",
    "python scripts/check_production_server_checklist.py",
    "python scripts/check_production_reverse_proxy_checklist.py",
    "python scripts/check_production_backup_monitoring_checklist.py",
    "python scripts/check_production_deployment_runbook.py",
    "docker compose up -d --build",
    "docker compose exec -T backend alembic upgrade head",
    "docker compose exec -T backend pytest app/tests -q",
    "python scripts/smoke_auth_rbac.py",
    "python scripts/smoke_document_generation_flow.py",
    "python scripts/smoke_documents_page.py",
    "python scripts/smoke_frontend_admin_pages.py",
    "python scripts/smoke_public_pages.py",
    "python scripts/smoke_account_page.py",
    "python scripts/smoke_frontend_core.py",
    "python scripts/check_frontend_smoke_coverage.py",
    "python scripts/check_backend_smoke_coverage.py",
    "python scripts/check_no_todo_markers.py",
    "docker compose exec -T frontend npm run build",
    "python scripts/check_frontend_bundle_encoding.py",
    "docker compose down -v",
]

REQUIRED_SUPPORT_FILES = [
    "scripts/check_ci_local_gate.py",
    "scripts/check_release_readiness.py",
    "scripts/check_release_versioning.py",
    "scripts/check_release_candidate.py",
    "scripts/check_release_tag.py",
    "scripts/check_production_deployment_plan.py",
    "scripts/check_production_environment_template.py",
    "scripts/check_production_server_checklist.py",
    "scripts/check_production_reverse_proxy_checklist.py",
    "scripts/check_production_backup_monitoring_checklist.py",
    "scripts/check_production_deployment_runbook.py",
    "scripts/secret_scan.py",
    "scripts/check_text_encoding.py",
    "scripts/check_source_bom.py",
    "scripts/check_frontend_api_errors.py",
    "scripts/check_frontend_mojibake.py",
    "scripts/frontend_guard.py",
    "scripts/smoke_auth_rbac.py",
    "scripts/smoke_document_generation_flow.py",
    "scripts/smoke_documents_page.py",
    "scripts/smoke_frontend_admin_pages.py",
    "scripts/smoke_public_pages.py",
    "scripts/smoke_account_page.py",
    "scripts/smoke_frontend_core.py",
    "scripts/check_frontend_smoke_coverage.py",
    "scripts/check_backend_smoke_coverage.py",
    "scripts/check_no_todo_markers.py",
    "scripts/check_frontend_bundle_encoding.py",
]


def read_required_file(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"Required release file is missing: {path.relative_to(ROOT).as_posix()}")

    return path.read_text(encoding="utf-8")


def normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def contains_command(workflow_text: str, command: str) -> bool:
    return normalize_text(command) in normalize_text(workflow_text)


def parse_env_keys(env_text: str) -> set[str]:
    keys: set[str] = set()

    for line in env_text.splitlines():
        stripped = line.strip()

        if not stripped or stripped.startswith("#") or "=" not in stripped:
            continue

        key = stripped.split("=", 1)[0].strip()
        if key:
            keys.add(key)

    return keys


def get_release_readiness_diagnostics(
    *,
    env_text: str,
    compose_text: str,
    ci_text: str,
) -> dict[str, object]:
    env_keys = parse_env_keys(env_text)
    missing_env_keys = [
        key for key in REQUIRED_ENV_KEYS if key not in env_keys
    ]
    missing_compose_sections = [
        section for section in REQUIRED_COMPOSE_SECTIONS if section not in compose_text
    ]
    missing_release_commands = [
        command
        for command in REQUIRED_RELEASE_COMMANDS
        if not contains_command(ci_text, command)
    ]
    missing_support_files = [
        file_name
        for file_name in REQUIRED_SUPPORT_FILES
        if not (ROOT / file_name).exists()
    ]

    return {
        "requiredEnvKeysTotal": len(REQUIRED_ENV_KEYS),
        "requiredComposeSectionsTotal": len(REQUIRED_COMPOSE_SECTIONS),
        "requiredReleaseCommandsTotal": len(REQUIRED_RELEASE_COMMANDS),
        "requiredSupportFilesTotal": len(REQUIRED_SUPPORT_FILES),
        "missingEnvKeys": missing_env_keys,
        "missingComposeSections": missing_compose_sections,
        "missingReleaseCommands": missing_release_commands,
        "missingSupportFiles": missing_support_files,
        "ok": (
            not missing_env_keys
            and not missing_compose_sections
            and not missing_release_commands
            and not missing_support_files
        ),
    }


def main() -> None:
    env_text = read_required_file(ENV_EXAMPLE_PATH)
    compose_text = read_required_file(COMPOSE_PATH)
    ci_text = read_required_file(CI_WORKFLOW_PATH)

    diagnostics = get_release_readiness_diagnostics(
        env_text=env_text,
        compose_text=compose_text,
        ci_text=ci_text,
    )

    if diagnostics["missingEnvKeys"]:
        print("Release readiness is missing env keys:")
        for item in diagnostics["missingEnvKeys"]:
            print(f" - {item}")

    if diagnostics["missingComposeSections"]:
        print("Release readiness is missing Docker Compose sections:")
        for item in diagnostics["missingComposeSections"]:
            print(f" - {item}")

    if diagnostics["missingReleaseCommands"]:
        print("Release readiness is missing CI/local gate commands:")
        for item in diagnostics["missingReleaseCommands"]:
            print(f" - {item}")

    if diagnostics["missingSupportFiles"]:
        print("Release readiness is missing support files:")
        for item in diagnostics["missingSupportFiles"]:
            print(f" - {item}")

    if not diagnostics["ok"]:
        raise SystemExit(1)

    print(
        "release readiness diagnostics passed: "
        f"env_keys={diagnostics['requiredEnvKeysTotal']}, "
        f"compose_sections={diagnostics['requiredComposeSectionsTotal']}, "
        f"release_commands={diagnostics['requiredReleaseCommandsTotal']}, "
        f"support_files={diagnostics['requiredSupportFilesTotal']}"
    )


if __name__ == "__main__":
    main()
