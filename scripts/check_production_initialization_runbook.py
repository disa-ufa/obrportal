from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-initialization-runbook.md"

REQUIRED_MARKERS = [
    "# Production initialization runbook",
    "Version: `v0.1.0-stage6-ops9`",
    "Stage: `10.6`",
    "Base commit: `a821595`",
    "Production domain: `portal.rcdo02.ru`",
    "https://portal.rcdo02.ru",
    "backup-before-init",
    "backup-after-init",
    "docker compose exec backend alembic upgrade head",
    "docker compose exec backend alembic current",
    "docker compose exec backend alembic heads",
    "public table count is greater than `0`",
    "docker compose exec backend python -m app.db.seed",
    "Create real production admin",
    "Production admin must not use demo credentials.",
    "admin@obrportal.local",
    "Admin123Local2026!",
    "learner@obrportal.local",
    "Learner123Local2026!",
    "Create real organization profile",
    "Post-initialization public smoke",
    "Post-initialization auth smoke",
    "Post-initialization backup",
    "restore metadata dry-run",
    "do not print production `.env`",
    "do not print secret values",
    "do not run `docker compose down -v`",
    "do not delete Docker volumes",
    "do not restore production database",
    "do not restore production MinIO data",
    "do not touch `amnezia-awg`",
    "Pre-init server check result - 2026-05-24",
    "Server git HEAD",
    "`4686cf5`",
    "`f0f98f9`",
    "production workspace is behind the required pre-init checkpoint",
    "do not run `alembic upgrade head` yet",
    "first create backup-before-init of the current live state",
    "controlled production workspace sync to `v0.1.0-stage10-pre-init`",
    "Backup-before-init result - 2026-05-24",
    "failed / superseded",
    "Accepted backup directory",
    "stage_10_11_5a_pre_init_retry_20260524190539",
    "5dcfaaf495bd3200ecf9af8fe00618ebec40563cce3b7c7e38188ae6e2f479be",
    "Backup tar SHA256 check",
    "PostgreSQL restore list SHA256 check",
    "MinIO archive SHA256 check",
    "Production `.env` SHA256 check",
    "`postgres_table_marker_count=0` is expected",
    "backup-before-init is accepted",
    "Controlled production workspace sync result - 2026-05-24",
    "Production git HEAD after sync",
    "production code is now at `v0.1.0-stage10-pre-init`",
    "controlled production workspace sync is accepted",
    "Docker Compose rebuild",
    "Public readiness smoke",
    "migrations can be planned as the next controlled step",
    "seed commands are still blocked until migrations are completed",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current baseline",
    "## 3. Non-negotiable safety rules",
    "## 4. Pre-initialization local checks",
    "## 5. Pre-initialization diagnostics",
    "## 6. Production connection safety",
    "## 7. Backup before initialization",
    "## 8. Migration procedure",
    "## 9. Database structure verification",
    "## 10. Seed roles and permissions",
    "## 11. Create real production admin",
    "## 12. Create real organization profile",
    "## 13. Post-initialization public smoke",
    "## 14. Post-initialization auth smoke",
    "## 15. Post-initialization backup",
    "## 16. Rollback boundaries",
    "## 17. Acceptance criteria",
    "## 18. Pre-init server check result - 2026-05-24",
    "## 19. Backup-before-init result - 2026-05-24",
    "## 20. Controlled production workspace sync result - 2026-05-24",
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
        print("production initialization runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    table_items = text.count("|")
    commands = text.count("python ") + text.count("docker ") + text.count("git ") + text.count("curl ")
    safety_markers = text.count("do not") + text.count("Forbidden") + text.count("forbidden")
    backup_mentions = text.lower().count("backup")
    admin_mentions = text.lower().count("admin")

    if sections < 20:
        raise SystemExit(f"expected at least 20 sections, got {sections}")

    if table_items < 25:
        raise SystemExit(f"expected at least 25 table separators, got {table_items}")

    if commands < 25:
        raise SystemExit(f"expected at least 25 command markers, got {commands}")

    if safety_markers < 18:
        raise SystemExit(f"expected at least 18 safety markers, got {safety_markers}")

    if backup_mentions < 10:
        raise SystemExit(f"expected at least 10 backup mentions, got {backup_mentions}")

    if admin_mentions < 6:
        raise SystemExit(f"expected at least 6 admin mentions, got {admin_mentions}")

    print(
        "production initialization runbook diagnostics passed: "
        f"sections={sections}, table_items={table_items}, commands={commands}, "
        f"safety_markers={safety_markers}, backup_mentions={backup_mentions}, "
        f"admin_mentions={admin_mentions}, markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
