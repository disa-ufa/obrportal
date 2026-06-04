from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-preparation-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.11 - Production preflight fact collection execution preparation audit",
    "Status: audit",
    "Base develop checkpoint: 0d1f647",
    "Accepted fact collection plan tag: v0.1.0-stage72-production-preflight-fact-collection-plan",
    "Stage 72.11 is audit and planning only.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Target release commit:",
    "be97a41",
    "Current execution preparation checkpoint:",
    "0d1f647",
    "Audited execution preparation result",
    "Secret-safety audit",
    "Read-only command audit",
    "Forbidden execution audit",
    "ssh execution during Stage 72.11",
    "docker compose restart",
    "cat .env",
    "amnezia-awg presence check only",
    "Stop condition audit",
    "Stage 72.11 does not authorize SSH execution.",
    "Stage 72.11 does not authorize production fact collection execution.",
    "Stage 72.11 does not authorize production deployment.",
    "Stage 72.12 - Production preflight fact collection execution preparation acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.11 fact collection execution preparation audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.11 production preflight fact collection execution preparation audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
