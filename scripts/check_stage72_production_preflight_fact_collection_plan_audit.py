from pathlib import Path

DOC = Path("docs/stage72-production-preflight-fact-collection-plan-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.8 - Production preflight fact collection plan audit",
    "Status: audit",
    "Base develop checkpoint: eda18d5",
    "Accepted planning tag: v0.1.0-stage72-production-release-planning",
    "Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight",
    "Stage 72.8 is audit and planning only.",
    "v0.1.0-stage72-production-release-planning",
    "Target release commit:",
    "be97a41",
    "Current fact collection planning checkpoint:",
    "eda18d5",
    "Audited command list result",
    "Secret-safety audit",
    "Forbidden command audit",
    "cat .env",
    "docker compose restart",
    "alembic upgrade",
    "No-go audit",
    "amnezia-awg",
    "Stage 72.8 does not authorize SSH execution.",
    "Stage 72.8 does not authorize production fact collection execution.",
    "Stage 72.8 does not authorize production deployment.",
    "Stage 72.9 - Production preflight fact collection plan acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.8 fact collection plan audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.8 production preflight fact collection plan audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
