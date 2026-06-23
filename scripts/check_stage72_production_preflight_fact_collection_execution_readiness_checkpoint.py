from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-readiness-checkpoint.md")

REQUIRED_MARKERS = [
    "# Stage 72.16 - Production preflight fact collection execution readiness checkpoint",
    "Status: checkpoint",
    "Base develop checkpoint: 1153638",
    "Accepted execution authorization tag: v0.1.0-stage72-production-preflight-fact-collection-execution-authorization",
    "Stage 72.16 is readiness checkpoint only.",
    "This stage does not execute SSH commands and does not connect to production.",
    "Current readiness checkpoint",
    "1153638",
    "Accepted Stage 72 tags",
    "v0.1.0-stage72-production-release-planning",
    "v0.1.0-stage72-production-deployment-preflight",
    "v0.1.0-stage72-production-preflight-fact-collection-plan",
    "v0.1.0-stage72-production-preflight-fact-collection-execution-preparation",
    "v0.1.0-stage72-production-preflight-fact-collection-execution-authorization",
    "Target release commit:",
    "be97a41",
    "Readiness summary",
    "Execution lock status",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Approved future command source",
    "Future execution prerequisites",
    "No-go criteria",
    "amnezia-awg",
    "Stage 72.16 does not authorize SSH execution.",
    "Stage 72.16 does not authorize production fact collection execution.",
    "Stage 72.16 does not authorize production deployment.",
    "Stage 72.17 - Production preflight fact collection execution readiness checkpoint audit",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.16 fact collection execution readiness checkpoint guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.16 production preflight fact collection execution readiness checkpoint guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
