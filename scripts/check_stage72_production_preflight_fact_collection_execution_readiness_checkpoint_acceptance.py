from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-readiness-checkpoint-acceptance.md")

REQUIRED_MARKERS = [
    "# Stage 72.18 - Production preflight fact collection execution readiness checkpoint acceptance",
    "Status: accepted",
    "Base develop checkpoint: 8c7963b",
    "Readiness checkpoint merge commit: 5893a9f",
    "Readiness checkpoint audit merge commit: 8c7963b",
    "Stage 72.18 accepts the production preflight fact collection execution readiness checkpoint package.",
    "Accepted Stage 72 tags",
    "v0.1.0-stage72-production-release-planning",
    "v0.1.0-stage72-production-deployment-preflight",
    "v0.1.0-stage72-production-preflight-fact-collection-plan",
    "v0.1.0-stage72-production-preflight-fact-collection-execution-preparation",
    "v0.1.0-stage72-production-preflight-fact-collection-execution-authorization",
    "Target release commit:",
    "be97a41",
    "Current accepted readiness checkpoint:",
    "8c7963b",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "No SSH command was executed.",
    "No production connection was made.",
    "No production secrets were printed.",
    "Stage 72.18 does not authorize SSH execution.",
    "Stage 72.18 does not authorize production fact collection execution.",
    "Stage 72.18 does not authorize production deployment.",
    "amnezia-awg",
    "Stage 72 production preflight fact collection execution readiness checkpoint is accepted.",
    "Stage 72.19 - Production preflight fact collection execution readiness package tag",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.18 fact collection execution readiness checkpoint acceptance guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.18 production preflight fact collection execution readiness checkpoint acceptance guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
