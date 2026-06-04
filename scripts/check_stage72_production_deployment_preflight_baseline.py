from pathlib import Path

DOC = Path("docs/stage72-production-deployment-preflight-baseline.md")

REQUIRED_MARKERS = [
    "# Stage 72.4 - Production deployment preflight baseline",
    "Status: planned",
    "Base develop checkpoint: be97a41",
    "Accepted planning tag: v0.1.0-stage72-production-release-planning",
    "Stage 72.4 is preflight only.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "Target release commit:",
    "be97a41",
    "production `.env` existence check only",
    "server-only `docker-compose.override.yml` existence check only",
    "Caddy configuration existence check only",
    "PostgreSQL volume existence check",
    "Redis volume existence check",
    "MinIO volume existence check",
    "Forbidden preflight output",
    "No-go criteria",
    "amnezia-awg",
    "no production deployment was executed",
    "no production secrets were printed",
    "Stage 72.5 - Production deployment preflight audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.4 preflight baseline guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.4 production deployment preflight baseline guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
