from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-authorization-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.15 - Production preflight fact collection execution authorization acceptance",
    "Status: accepted",
    "Base develop checkpoint: 391c03d",
    "Authorization merge commit: f965a4e",
    "Authorization audit merge commit: 391c03d",
    "Stage 72.15 accepts the production preflight fact collection execution authorization package.",
    "Production deployment lock is documented.",
    "Production fact collection confirmation phrase is documented.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Target release commit:",
    "be97a41",
    "Current accepted authorization checkpoint:",
    "391c03d",
    "No SSH command was executed.",
    "No production connection was made.",
    "No production secrets were printed.",
    "Stage 72.15 does not authorize SSH execution.",
    "Stage 72.15 does not authorize production fact collection execution.",
    "Stage 72.15 does not authorize production deployment.",
    "amnezia-awg",
    "Stage 72 production preflight fact collection execution authorization is accepted.",
    "Stage 72.16 - Production preflight fact collection execution readiness checkpoint",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.15 fact collection execution authorization acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.15 production preflight fact collection execution authorization acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
