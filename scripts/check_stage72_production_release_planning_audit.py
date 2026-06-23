from pathlib import Path

DOC = Path("docs/stage72-production-release-planning-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.2 - Production release planning audit",
    "Status: audit",
    "Base develop checkpoint: 5b5b848",
    "Stage 72.2 is audit and planning only.",
    "develop at 5b5b848",
    "v0.1.0-stage72-production-release-planning",
    "Backup-before-deploy plan",
    "Rollback boundary",
    "No-go criteria",
    "current production git HEAD",
    "production `.env` exists without printing contents",
    "server-only `docker-compose.override.yml` exists without printing contents",
    "amnezia-awg",
    "no production action was executed",
    "no production secrets were printed",
    "Stage 72.3 - Production release planning acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.2 audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.2 production release planning audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
