from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-authorization-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.14 - Production preflight fact collection execution authorization audit",
    "Status: audit",
    "Base develop checkpoint: f965a4e",
    "Authorization merge commit: f965a4e",
    "Stage 72.14 is audit and planning only.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Target release commit:",
    "be97a41",
    "Current authorization audit checkpoint:",
    "f965a4e",
    "Audited authorization result",
    "Authorized command source audit",
    "Secret-safety audit",
    "Forbidden execution audit",
    "ssh execution during Stage 72.14",
    "docker compose restart",
    "cat .env",
    "Stop condition audit",
    "amnezia-awg",
    "Stage 72.14 does not authorize SSH execution.",
    "Stage 72.14 does not authorize production fact collection execution.",
    "Stage 72.14 does not authorize production deployment.",
    "Stage 72.15 - Production preflight fact collection execution authorization acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.14 fact collection execution authorization audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.14 production preflight fact collection execution authorization audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
