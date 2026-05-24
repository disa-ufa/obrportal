from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-backup-verification.md"

REQUIRED_MARKERS = [
    "# Production backup verification",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.3`",
    "Production domain: `portal.rcdo02.ru`",
    "Secret marker scan result",
    "`passed`",
    "Backup inventory precheck",
    "Restore performed",
    "Volume delete performed",
    "Service restart performed",
    "`https://portal.rcdo02.ru`",
    "`https://portal.rcdo02.ru/health`",
    "`https://portal.rcdo02.ru/api/v1/ready`",
    "`/opt/obrportal/.env`",
    "`/opt/obrportal/docker-compose.override.yml`",
    "`/etc/caddy/Caddyfile`",
    "`/opt/obrportal-backups`",
    "`/opt/obrportal-backups/postgres`",
    "`/opt/obrportal-backups/storage`",
    "`obrportal_postgres_data`",
    "`obrportal_minio_data`",
    "`obrportal-postgres`",
    "`obrportal-minio`",
    "`amnezia-awg`",
    "`127.0.0.1:8000`",
    "`127.0.0.1:5173`",
    "`127.0.0.1:5432`",
    "`127.0.0.1:6379`",
    "`127.0.0.1:9000`",
    "`127.0.0.1:9001`",
    "backup_target",
    "required without printing",
    "Do not:",
    "Allowed next step",
    "Acceptance criteria",
    "Protected backup artifact creation result",
    "protected_backup_artifact_creation_retry_done",
    "postgres_dump_exit_code=0",
    "postgres_dump_nonempty",
    "postgres_dump_header_valid",
    "postgres_gzip_exit_code=0",
    "postgres_backup_created",
    "minio_copy_exit_code=0",
    "minio_tar_exit_code=0",
    "minio_gzip_exit_code=0",
    "minio_backup_created",
    "backup_artifact_tar_exit_code=0",
    "backup_artifact_created",
    "backup_artifact_gzip_test_exit_code=0",
    "backup_artifact_tar_list_exit_code=0",
    "backup_artifact_metadata_verified",
    "/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807",
    "obrportal_protected_backup_stage_9_4_1b_20260524103807.tar.gz",
    "ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad",
    "Safe restore metadata verification result",
    "PostgreSQL empty production database clarification",
    "restore_dry_run_extract_exit_code=0",
    "restore_postgres_dump_archive_exists",
    "restore_postgres_dump_gzip_test_exit_code=0",
    "restore_minio_archive_exists",
    "restore_minio_archive_gzip_test_exit_code=0",
    "restore_minio_archive_tar_list_exit_code=0",
    "restore_env_file_exists_without_printing",
    "restore_compose_override_exists_without_printing",
    "restore_caddyfile_exists_without_printing",
    "dump_line_count=26",
    "dump_create_table_count=0",
    "dump_create_schema_count=0",
    "dump_copy_count=0",
    "dump_insert_count=0",
    "dump_alembic_marker_count=0",
    "live_public_table_count=0",
    "live_schema_count=4",
    "live_database_connection_ok",
    "absence of `CREATE TABLE`, `COPY`, `INSERT INTO` and `CREATE SCHEMA` markers is not treated as a failure while `live_public_table_count=0`",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Source",
    "## 3. Precheck decision",
    "## 4. Public health before backup verification",
    "## 5. Local upstream health before backup verification",
    "## 6. Server-only file status",
    "## 7. Backup root inventory",
    "## 8. Runtime data inventory",
    "## 9. Running container inventory",
    "## 10. Port privacy result",
    "## 11. Backup coverage targets",
    "## 12. Safety rules for next backup steps",
    "## 13. Acceptance criteria for inventory precheck",
    "## 14. Protected backup artifact creation result",
    "## 15. Safe restore metadata verification result",
    "## 16. PostgreSQL empty production database clarification",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")

    missing = [
        marker
        for marker in [*REQUIRED_MARKERS, *REQUIRED_SECTIONS]
        if marker not in text
    ]

    if missing:
        print("production backup verification diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    table_items = text.count("|")
    sections = text.count("\n## ")
    ports = text.count("127.0.0.1:")
    safety_rules = text.count("do not") + text.count("Do not")

    if table_items < 80:
        raise SystemExit(f"expected at least 80 table separators, got {table_items}")

    if sections < 16:
        raise SystemExit(f"expected at least 16 sections, got {sections}")

    if ports < 6:
        raise SystemExit(f"expected at least 6 localhost port markers, got {ports}")

    if safety_rules < 6:
        raise SystemExit(f"expected at least 6 safety rule markers, got {safety_rules}")

    print(
        "production backup verification diagnostics passed: "
        f"sections={sections}, table_items={table_items}, ports={ports}, "
        f"safety_rules={safety_rules}, markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
