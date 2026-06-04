from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-plan.md")

REQUIRED_MARKERS = [
    "# Stage 72.7 - Production preflight fact collection plan",
    "Status: planned",
    "Base develop checkpoint: 138efb2",
    "Accepted planning tag: v0.1.0-stage72-production-release-planning",
    "Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight",
    "Stage 72.7 is planning only.",
    "This stage does not execute SSH commands and does not connect to production.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "Target release commit:",
    "be97a41",
    "Current preflight planning checkpoint:",
    "138efb2",
    "Exact read-only command list for later execution",
    "hostname",
    "git rev-parse --short HEAD",
    "docker compose ps",
    "docker volume ls",
    "systemctl is-active caddy",
    "amnezia-awg presence check only",
    "Explicitly forbidden commands",
    "cat .env",
    "docker compose restart",
    "alembic upgrade",
    "Forbidden output",
    "No-go criteria",
    "no SSH command was executed",
    "no production connection was made",
    "no production secrets were printed",
    "Stage 72.8 - Production preflight fact collection plan audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.7 fact collection plan guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.7 production preflight fact collection plan guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
