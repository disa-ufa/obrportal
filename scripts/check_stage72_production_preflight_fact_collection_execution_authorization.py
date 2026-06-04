from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-authorization.md")

REQUIRED_MARKERS = [
    "# Stage 72.13 - Production preflight fact collection execution authorization",
    "Status: planned",
    "Base develop checkpoint: 72f22f9",
    "Accepted execution preparation tag: v0.1.0-stage72-production-preflight-fact-collection-execution-preparation",
    "Stage 72.13 is authorization planning only.",
    "This stage does not execute SSH commands and does not connect to production.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Authorized scope for future execution",
    "Forbidden future execution scope",
    "Authorized command source",
    "Target release commit:",
    "be97a41",
    "Current authorization planning checkpoint:",
    "72f22f9",
    "Operator checks before future execution",
    "Required stop conditions",
    "amnezia-awg",
    "no SSH command was executed",
    "no production connection was made",
    "no production secrets were printed",
    "Stage 72.14 - Production preflight fact collection execution authorization audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.13 fact collection execution authorization guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.13 production preflight fact collection execution authorization guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
