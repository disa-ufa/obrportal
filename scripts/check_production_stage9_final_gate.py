from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-stage9-final-gate.md"

REQUIRED_MARKERS = [
    "# Production Stage 9 final gate",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.9`",
    "Production domain: `portal.rcdo02.ru`",
    "https://portal.rcdo02.ru",
    "9bd2cf2",
    "88990b2",
    "Stage 9 closure matrix",
    "`9.1`",
    "`9.2`",
    "`9.3`",
    "`9.4`",
    "`9.5`",
    "`9.6`",
    "`9.7`",
    "`9.8`",
    "`9.9`",
    "docs/production-operations-baseline.md",
    "docs/production-monitoring-smoke.md",
    "docs/production-backup-verification.md",
    "docs/production-operational-runbook.md",
    "docs/production-maintenance-update-checklist.md",
    "docs/production-handover-package.md",
    "scripts/check_production_stage9_final_gate.py",
    "scripts/check_production_handover_package.py",
    "scripts/check_production_maintenance_update_checklist.py",
    "scripts/check_production_operational_runbook.py",
    "scripts/check_production_backup_verification.py",
    "scripts/smoke_production_monitoring.py",
    "127.0.0.1:8000",
    "127.0.0.1:5173",
    "127.0.0.1:5432",
    "127.0.0.1:6379",
    "127.0.0.1:9000",
    "127.0.0.1:9001",
    "amnezia-awg",
    "ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad",
    "current production PostgreSQL public table count is `0`",
    "Final local gate command list",
    "Final safety boundaries",
    "Main branch readiness decision",
    "`main` is not updated in this step",
    "do not run `docker compose down -v`",
    "do not delete Docker volumes",
    "do not restore production database",
    "do not restore production MinIO data",
    "do not touch `amnezia-awg` unless the incident is VPN-specific",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current repository state",
    "## 3. Stage 9 closure matrix",
    "## 4. Stage 9 production documents",
    "## 5. Stage 9 diagnostics scripts",
    "## 6. Production health baseline",
    "## 7. Production runtime safety baseline",
    "## 8. Backup and restore final status",
    "## 9. Final local gate command list",
    "## 10. Final safety boundaries",
    "## 11. Main branch readiness decision",
    "## 12. Acceptance criteria",
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
        print("production Stage 9 final gate diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    table_items = text.count("|")
    commands = text.count("python ") + text.count("git ")
    safety_markers = text.count("do not") + text.count("Forbidden") + text.count("forbidden")

    if sections < 12:
        raise SystemExit(f"expected at least 12 sections, got {sections}")

    if table_items < 140:
        raise SystemExit(f"expected at least 140 table separators, got {table_items}")

    if commands < 25:
        raise SystemExit(f"expected at least 25 command markers, got {commands}")

    if safety_markers < 12:
        raise SystemExit(f"expected at least 12 safety markers, got {safety_markers}")

    print(
        "production Stage 9 final gate diagnostics passed: "
        f"sections={sections}, table_items={table_items}, commands={commands}, "
        f"safety_markers={safety_markers}, markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
