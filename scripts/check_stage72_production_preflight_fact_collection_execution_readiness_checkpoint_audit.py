from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-execution-readiness-checkpoint-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.17 - Production preflight fact collection execution readiness checkpoint audit",
    "Status: audit",
    "Base develop checkpoint: 5893a9f",
    "Readiness checkpoint merge commit: 5893a9f",
    "Stage 72.17 is audit and planning only.",
    "Audited checkpoint",
    "5893a9f",
    "Audited accepted Stage 72 tags",
    "v0.1.0-stage72-production-release-planning",
    "v0.1.0-stage72-production-deployment-preflight",
    "v0.1.0-stage72-production-preflight-fact-collection-plan",
    "v0.1.0-stage72-production-preflight-fact-collection-execution-preparation",
    "v0.1.0-stage72-production-preflight-fact-collection-execution-authorization",
    "Target release commit:",
    "be97a41",
    "Readiness audit result",
    "Execution lock audit",
    "CONFIRM PRODUCTION DEPLOYMENT",
    "CONFIRM PRODUCTION FACT COLLECTION",
    "Approved command source audit",
    "Secret-safety audit",
    "No-go audit",
    "Forbidden execution audit",
    "ssh execution during Stage 72.17",
    "cat .env",
    "amnezia-awg",
    "Stage 72.17 does not authorize SSH execution.",
    "Stage 72.17 does not authorize production fact collection execution.",
    "Stage 72.17 does not authorize production deployment.",
    "Stage 72.18 - Production preflight fact collection execution readiness checkpoint acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.17 fact collection execution readiness checkpoint audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.17 production preflight fact collection execution readiness checkpoint audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
