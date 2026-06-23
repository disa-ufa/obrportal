from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-plan-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.9 - Production preflight fact collection plan acceptance",
    "Status: accepted",
    "Base develop checkpoint: 798cf20",
    "Accepted planning tag: v0.1.0-stage72-production-release-planning",
    "Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight",
    "Fact collection plan merge commit: eda18d5",
    "Fact collection plan audit merge commit: 798cf20",
    "Stage 72.9 accepts the read-only production preflight fact collection plan.",
    "Exact read-only command list is documented.",
    "Forbidden command list is documented.",
    "Forbidden output list is documented.",
    "No SSH command was executed.",
    "No production connection was made.",
    "No production secrets were printed.",
    "v0.1.0-stage72-production-release-planning",
    "Target release commit:",
    "be97a41",
    "Current accepted fact collection planning checkpoint:",
    "798cf20",
    "Stage 72.9 does not authorize SSH execution.",
    "Stage 72.9 does not authorize production fact collection execution.",
    "Stage 72.9 does not authorize production deployment.",
    "amnezia-awg",
    "Stage 72 production preflight fact collection plan is accepted.",
    "Stage 72.10 - Production preflight fact collection execution preparation",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.9 fact collection plan acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.9 production preflight fact collection plan acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
