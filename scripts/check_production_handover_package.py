from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-handover-package.md"

REQUIRED_MARKERS = [
    "# Production handover package",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.8`",
    "Production domain: `portal.rcdo02.ru`",
    "https://portal.rcdo02.ru",
    "89.127.203.70",
    "306733.fornex.cloud",
    "127.0.0.1:8000",
    "127.0.0.1:5173",
    "127.0.0.1:5432",
    "127.0.0.1:6379",
    "127.0.0.1:9000",
    "127.0.0.1:9001",
    "amnezia-awg",
    "5cb2a6e",
    "88990b2",
    "Production access summary",
    "Runtime topology",
    "Core operational documents",
    "Core diagnostics scripts",
    "Standard public health checks",
    "Backup handover summary",
    "Restore handover summary",
    "Server-only files handover",
    "Maintenance handover",
    "Incident handover",
    "Update handover",
    "Handover safety boundaries",
    "Responsibility matrix",
    "Acceptance criteria",
    "docs/production-operations-baseline.md",
    "docs/production-monitoring-smoke.md",
    "docs/production-backup-verification.md",
    "docs/production-operational-runbook.md",
    "docs/production-maintenance-update-checklist.md",
    "scripts/smoke_production_monitoring.py",
    "scripts/check_production_maintenance_update_checklist.py",
    "ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad",
    "current production PostgreSQL public table count is `0`",
    "do not run `docker compose down -v`",
    "do not delete Docker volumes",
    "do not print `.env`",
    "do not touch `amnezia-awg` unless the incident is VPN-specific",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Production access summary",
    "## 3. Runtime topology",
    "## 4. Current repository state",
    "## 5. Core operational documents",
    "## 6. Core diagnostics scripts",
    "## 7. Standard public health checks",
    "## 8. Backup handover summary",
    "## 9. Restore handover summary",
    "## 10. Server-only files handover",
    "## 11. Maintenance handover",
    "## 12. Incident handover",
    "## 13. Update handover",
    "## 14. Handover safety boundaries",
    "## 15. Responsibility matrix",
    "## 16. Acceptance criteria",
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
        print("production handover package diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    table_items = text.count("|")
    commands = text.count("python ") + text.count("git ") + text.count("docker ") + text.count("curl ")
    safety_markers = text.count("do not") + text.count("forbidden") + text.count("never ")

    if sections < 16:
        raise SystemExit(f"expected at least 16 sections, got {sections}")

    if table_items < 120:
        raise SystemExit(f"expected at least 120 table separators, got {table_items}")

    if commands < 15:
        raise SystemExit(f"expected at least 15 command markers, got {commands}")

    if safety_markers < 14:
        raise SystemExit(f"expected at least 14 safety markers, got {safety_markers}")

    print(
        "production handover package diagnostics passed: "
        f"sections={sections}, table_items={table_items}, commands={commands}, "
        f"safety_markers={safety_markers}, markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
