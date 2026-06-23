from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-preparation-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.12 - Production preflight fact collection execution preparation acceptance",
    "Status: accepted",
    "Base develop checkpoint: 015cc13",
    "Accepted fact collection plan tag: v0.1.0-stage72-production-preflight-fact-collection-plan",
    "Execution preparation merge commit: 0d1f647",
    "Execution preparation audit merge commit: 015cc13",
    "Stage 72.12 accepts the production preflight fact collection execution preparation package.",
    "Production deployment lock is documented.",
    "Production fact collection confirmation phrase is documented.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Target release commit:",
    "be97a41",
    "Current accepted execution preparation checkpoint:",
    "015cc13",
    "No SSH command was executed.",
    "No production connection was made.",
    "No production secrets were printed.",
    "Stage 72.12 does not authorize SSH execution.",
    "Stage 72.12 does not authorize production fact collection execution.",
    "Stage 72.12 does not authorize production deployment.",
    "amnezia-awg",
    "Stage 72 production preflight fact collection execution preparation is accepted.",
    "Stage 72.13 - Production preflight fact collection execution authorization",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.12 fact collection execution preparation acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.12 production preflight fact collection execution preparation acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
