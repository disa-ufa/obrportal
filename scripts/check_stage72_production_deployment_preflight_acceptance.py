from pathlib import Path

DOC = Path("docs/stage72-production-deployment-preflight-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.6 - Production deployment preflight acceptance",
    "Status: accepted",
    "Base develop checkpoint: 83bc9e4",
    "Accepted planning tag: v0.1.0-stage72-production-release-planning",
    "Preflight baseline merge commit: 7f09f92",
    "Preflight audit merge commit: 83bc9e4",
    "Stage 72.6 accepts the production deployment preflight documentation package.",
    "v0.1.0-stage72-production-release-planning",
    "Target release commit:",
    "be97a41",
    "Current accepted preflight planning checkpoint:",
    "83bc9e4",
    "No production deployment was executed.",
    "No production secrets were printed.",
    "Stage 72.6 does not authorize production deployment.",
    "Stage 72.6 does not authorize production backup execution.",
    "amnezia-awg",
    "Stage 72 production deployment preflight planning is accepted.",
    "Stage 72.7 - Production preflight fact collection plan",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.6 preflight acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.6 production deployment preflight acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
