from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-operations-baseline.md"

REQUIRED_MARKERS = [
    "# Production operations baseline",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.1`",
    "Production domain: `portal.rcdo02.ru`",
    "https://portal.rcdo02.ru",
    "Caddy is the only public HTTP/HTTPS entrypoint",
    "Backend, frontend, PostgreSQL, Redis and MinIO are bound to `127.0.0.1`",
    "Production `.env` is not committed",
    "Production `.env` is not printed to logs or chat",
    "Production `.env` permissions remain `600`",
    "Server-only `docker-compose.override.yml` remains untracked",
    "`amnezia-awg` and UDP `34503` are not touched",
    "Backup verification must cover",
    "Restore verification must include",
    "Operational handover baseline",
    "Update procedure baseline",
    "Incident response baseline",
    "Stage 9 planned sequence",
    "Acceptance criteria",
]

REQUIRED_ROUTES = [
    "https://portal.rcdo02.ru",
    "https://portal.rcdo02.ru/health",
    "https://portal.rcdo02.ru/api/v1/ready",
    "https://portal.rcdo02.ru/login",
    "https://portal.rcdo02.ru/admin",
    "https://portal.rcdo02.ru/catalog",
]

REQUIRED_PORTS = [
    "127.0.0.1:8000",
    "127.0.0.1:5173",
    "127.0.0.1:5432",
    "127.0.0.1:6379",
    "127.0.0.1:9000",
    "127.0.0.1:9001",
    "34503/udp",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current production state",
    "## 3. Public health baseline",
    "## 4. Security baseline",
    "## 5. Server-only files",
    "## 6. Monitoring baseline",
    "## 7. Backup baseline",
    "## 8. Restore baseline",
    "## 9. Operational handover baseline",
    "## 10. Update procedure baseline",
    "## 11. Incident response baseline",
    "## 12. Stage 9 planned sequence",
    "## 13. Acceptance criteria",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")

    missing = [
        marker
        for marker in [*REQUIRED_MARKERS, *REQUIRED_ROUTES, *REQUIRED_PORTS, *REQUIRED_SECTIONS]
        if marker not in text
    ]

    if missing:
        print("production operations baseline diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    table_items = text.count("|")
    commands = text.count("curl ") + text.count("docker ") + text.count("systemctl ") + text.count("ss ")
    sections = text.count("\n## ")

    if table_items < 70:
        raise SystemExit(f"expected at least 70 table separators, got {table_items}")

    if commands < 8:
        raise SystemExit(f"expected at least 8 command markers, got {commands}")

    if sections < 13:
        raise SystemExit(f"expected at least 13 sections, got {sections}")

    print(
        "production operations baseline diagnostics passed: "
        f"sections={sections}, table_items={table_items}, commands={commands}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_ROUTES) + len(REQUIRED_PORTS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
