from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-maintenance-update-checklist.md"

REQUIRED_MARKERS = [
    "# Production maintenance update checklist",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.7`",
    "Production domain: `portal.rcdo02.ru`",
    "https://portal.rcdo02.ru",
    "Pre-update local checklist",
    "Production smoke before maintenance",
    "Server-only file protection",
    "Allowed update types",
    "Forbidden actions during routine maintenance",
    "Docker Compose update checklist",
    "Caddy update checklist",
    "Backup maintenance checklist",
    "Restore maintenance checklist",
    "Post-update verification checklist",
    "Rollback checklist",
    "Acceptance criteria",
    "do not print production `.env`",
    "do not run `docker compose down -v`",
    "do not delete Docker volumes",
    "do not touch `amnezia-awg`",
    "never commit `.env`",
    "127.0.0.1:8000",
    "127.0.0.1:5173",
    "127.0.0.1:5432",
    "127.0.0.1:6379",
    "127.0.0.1:9000",
    "127.0.0.1:9001",
    "python .\\scripts\\smoke_production_monitoring.py",
    "python .\\scripts\\check_release_readiness.py",
    "python .\\scripts\\check_no_todo_markers.py",
    "caddy validate --config /etc/caddy/Caddyfile",
    "systemctl reload caddy",
    "ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad",
    "current production PostgreSQL public table count is `0`",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current branch baseline",
    "## 3. Pre-update local checklist",
    "## 4. Production smoke before maintenance",
    "## 5. Server-only file protection",
    "## 6. Allowed update types",
    "## 7. Forbidden actions during routine maintenance",
    "## 8. Docker Compose update checklist",
    "## 9. Caddy update checklist",
    "## 10. Backup maintenance checklist",
    "## 11. Restore maintenance checklist",
    "## 12. Post-update verification checklist",
    "## 13. Rollback checklist",
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
        print("production maintenance update checklist diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    table_items = text.count("|")
    commands = (
        text.count("python ")
        + text.count("git ")
        + text.count("docker ")
        + text.count("curl ")
        + text.count("systemctl ")
        + text.count("caddy ")
    )
    safety_markers = text.count("do not") + text.count("never ") + text.count("forbidden")

    if sections < 14:
        raise SystemExit(f"expected at least 14 sections, got {sections}")

    if table_items < 100:
        raise SystemExit(f"expected at least 100 table separators, got {table_items}")

    if commands < 25:
        raise SystemExit(f"expected at least 25 command markers, got {commands}")

    if safety_markers < 16:
        raise SystemExit(f"expected at least 16 safety markers, got {safety_markers}")

    print(
        "production maintenance update checklist diagnostics passed: "
        f"sections={sections}, table_items={table_items}, commands={commands}, "
        f"safety_markers={safety_markers}, markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
