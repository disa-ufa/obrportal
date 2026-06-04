from pathlib import Path

DOC = Path("docs/stage72-production-deployment-preflight-audit.md")

REQUIRED_MARKERS = [
    "# Stage 72.5 - Production deployment preflight audit",
    "Status: audit",
    "Base develop checkpoint: 7f09f92",
    "Accepted planning tag: v0.1.0-stage72-production-release-planning",
    "Stage 72.5 is audit and planning only.",
    "v0.1.0-stage72-production-release-planning",
    "Target release commit:",
    "be97a41",
    "Current develop checkpoint for preflight planning:",
    "7f09f92",
    "Forbidden output audit",
    "Safe command audit",
    "No-go audit",
    "cat .env",
    "docker compose restart",
    "amnezia-awg",
    "Stage 72.5 does not authorize production deployment.",
    "Stage 72.5 does not authorize production backup execution.",
    "Stage 72.6 - Production deployment preflight acceptance",
]

def main() -> int:
    if not DOC.exists():
        print(f"Missing document: {DOC}")
        return 1

    text = DOC.read_text(encoding="utf-8-sig")
    missing = [marker for marker in REQUIRED_MARKERS if marker not in text]

    if missing:
        print("Stage 72.5 preflight audit guard failed. Missing markers:")
        for marker in missing:
            print(f" - {marker}")
        return 1

    print("Stage 72.5 production deployment preflight audit guard: passed")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
