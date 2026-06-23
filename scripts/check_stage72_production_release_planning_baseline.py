from pathlib import Path

DOC = Path("docs/stage72-production-release-planning-baseline.md")

REQUIRED_MARKERS = [
    "# Stage 72 - Production release planning for Stage 70 checkpoint baseline",
    "Status: planned",
    "Stage 72 defines the production release plan",
    "Stage 72 is planning only",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "Target release commit or tag",
    "Backup-before-deploy requirement",
    "Rollback boundary",
    "No-go criteria",
    "production `.env`",
    "docker-compose.override.yml",
    "Caddy configuration",
    "amnezia-awg",
    "no production action was executed",
    "no production secrets were printed or committed",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72 baseline guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72 production release planning baseline guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
