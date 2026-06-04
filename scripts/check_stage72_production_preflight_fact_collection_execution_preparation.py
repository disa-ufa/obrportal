from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-preparation.md")

REQUIRED_MARKERS = [
    "# Stage 72.10 - Production preflight fact collection execution preparation",
    "Status: planned",
    "Base develop checkpoint: 940c23d",
    "Accepted fact collection plan tag: v0.1.0-stage72-production-preflight-fact-collection-plan",
    "Stage 72.10 is execution preparation only.",
    "This stage does not execute SSH commands and does not connect to production.",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Target release commit:",
    "be97a41",
    "Current accepted fact collection planning checkpoint:",
    "940c23d",
    "Operator prerequisites for future execution",
    "Future execution wrapper",
    "Accepted read-only command block for future execution",
    "hostname",
    "git rev-parse --short HEAD",
    "docker compose ps",
    "docker volume ls",
    "systemctl is-active caddy",
    "amnezia-awg presence check only",
    "Future output handling rules",
    "Forbidden output categories",
    "Stop conditions",
    "no SSH command was executed",
    "no production connection was made",
    "no production secrets were printed",
    "Stage 72.11 - Production preflight fact collection execution preparation audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.10 fact collection execution preparation guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.10 production preflight fact collection execution preparation guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
