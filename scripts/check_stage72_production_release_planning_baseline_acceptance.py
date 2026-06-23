from pathlib import Path

DOC = Path("docs/stage72-production-release-planning-baseline-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.1 - Production release planning baseline acceptance",
    "Status: accepted",
    "Baseline PR: #1",
    "Baseline merge commit: 2ffb949",
    "Stage 72 production release planning baseline document was added.",
    "PR #1 was merged into `develop`.",
    "Planning-only safety boundary is documented.",
    "Backup-before-deploy requirement is documented.",
    "Rollback boundary is documented.",
    "No-go criteria are documented.",
    "No production deployment was executed.",
    "No production secrets were printed.",
    "Stage 72.1 production release planning baseline is accepted.",
    "Stage 72.2 - Production release planning audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.1 acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.1 production release planning baseline acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
