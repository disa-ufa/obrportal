from pathlib import Path

DOC = Path("docs/stage72-production-release-planning-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.3 - Production release planning acceptance",
    "Status: accepted",
    "Base develop checkpoint: c84ce4c",
    "Audit merge commit: c84ce4c",
    "Stage 72 production release planning is accepted.",
    "develop at c84ce4c",
    "v0.1.0-stage72-production-release-planning",
    "Backup-before-deploy plan is documented.",
    "Rollback boundary is documented.",
    "No-go criteria are documented.",
    "No production deployment was executed.",
    "No production secrets were printed.",
    "amnezia-awg",
    "Stage 72.4 - Production deployment preflight",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.3 acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.3 production release planning acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
