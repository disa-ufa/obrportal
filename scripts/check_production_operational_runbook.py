from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-operational-runbook.md"

REQUIRED_MARKERS = [
    "# Production operational runbook",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.6`",
    "Production domain: `portal.rcdo02.ru`",
    "https://portal.rcdo02.ru",
    "Caddy",
    "127.0.0.1:8000",
    "127.0.0.1:5173",
    "127.0.0.1:5432",
    "127.0.0.1:6379",
    "127.0.0.1:9000",
    "127.0.0.1:9001",
    "amnezia-awg",
    "python .\\scripts\\smoke_production_monitoring.py",
    "Daily operator checklist",
    "Incident triage checklist",
    "Restart rules",
    "Backup and restore rules",
    "Update procedure",
    "Rollback basics",
    "Secret handling",
    "Server-only files",
    "Escalation checklist",
    "Acceptance criteria",
    "do not print production `.env`",
    "do not run `docker compose down -v`",
    "never commit `.env`",
    "never commit server-only override",
    "never commit server-only Caddyfile",
    "ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current production baseline",
    "## 3. Public checks",
    "## 4. Daily operator checklist",
    "## 5. Safe server status commands",
    "## 6. Incident triage checklist",
    "## 7. Restart rules",
    "## 8. Backup and restore rules",
    "## 9. Update procedure",
    "## 10. Rollback basics",
    "## 11. Secret handling",
    "## 12. Server-only files",
    "## 13. Escalation checklist",
    "## 14. Acceptance criteria",
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
        print("production operational runbook diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    table_items = text.count("|")
    commands = (
        text.count("curl ")
        + text.count("docker ")
        + text.count("systemctl ")
        + text.count("ss ")
        + text.count("df ")
        + text.count("free ")
        + text.count("python ")
    )
    safety_markers = text.count("do not") + text.count("never ") + text.count("forbidden")

    if sections < 14:
        raise SystemExit(f"expected at least 14 sections, got {sections}")

    if table_items < 80:
        raise SystemExit(f"expected at least 80 table separators, got {table_items}")

    if commands < 15:
        raise SystemExit(f"expected at least 15 command markers, got {commands}")

    if safety_markers < 12:
        raise SystemExit(f"expected at least 12 safety markers, got {safety_markers}")

    print(
        "production operational runbook diagnostics passed: "
        f"sections={sections}, table_items={table_items}, commands={commands}, "
        f"safety_markers={safety_markers}, markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
