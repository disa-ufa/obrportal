from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "production-monitoring-smoke.md"
SMOKE = ROOT / "scripts" / "smoke_production_monitoring.py"

REQUIRED_DOC_MARKERS = [
    "# Production monitoring smoke",
    "Version: `v0.1.0-stage6`",
    "Stage: `9.2`",
    "Production domain: `portal.rcdo02.ru`",
    "scripts/smoke_production_monitoring.py",
    "https://portal.rcdo02.ru",
    "https://portal.rcdo02.ru/health",
    "https://portal.rcdo02.ru/api/v1/ready",
    "does not read production `.env`",
    "does not print secrets",
    "does not connect over SSH",
    "does not restart services",
    "does not modify Caddy",
    "does not modify Docker Compose",
    "does not touch volumes",
    "does not touch `amnezia-awg`",
    "Expected success output",
    "Failure handling",
    "Acceptance criteria",
]

REQUIRED_SMOKE_MARKERS = [
    'BASE_URL = "https://portal.rcdo02.ru"',
    "TIMEOUT_SECONDS = 10",
    "check_frontend_route",
    "check_health",
    "check_ready",
    "production monitoring smoke started",
    "production monitoring smoke passed",
    "production monitoring smoke failed",
    "/health",
    "/api/v1/ready",
    "/login",
    "/admin",
    "/catalog",
    "ObrPortal",
    "0.1.0-stage6",
    "database",
    "redis",
    "storage",
]


def require_file(path: Path) -> str:
    if not path.exists():
        raise SystemExit(f"missing required file: {path.relative_to(ROOT)}")
    return path.read_text(encoding="utf-8")


def main() -> None:
    doc_text = require_file(DOC)
    smoke_text = require_file(SMOKE)

    missing_doc = [marker for marker in REQUIRED_DOC_MARKERS if marker not in doc_text]
    missing_smoke = [marker for marker in REQUIRED_SMOKE_MARKERS if marker not in smoke_text]

    if missing_doc or missing_smoke:
        print("production monitoring smoke diagnostics failed")
        if missing_doc:
            print("missing doc markers:")
            for marker in missing_doc:
                print(f" - {marker}")
        if missing_smoke:
            print("missing smoke markers:")
            for marker in missing_smoke:
                print(f" - {marker}")
        raise SystemExit(1)

    route_count = doc_text.count("https://portal.rcdo02.ru")
    table_items = doc_text.count("|")
    smoke_functions = smoke_text.count("def ")

    if route_count < 6:
        raise SystemExit(f"expected at least 6 production route markers, got {route_count}")

    if table_items < 30:
        raise SystemExit(f"expected at least 30 table separators, got {table_items}")

    if smoke_functions < 7:
        raise SystemExit(f"expected at least 7 smoke functions, got {smoke_functions}")

    print(
        "production monitoring smoke diagnostics passed: "
        f"routes={route_count}, table_items={table_items}, smoke_functions={smoke_functions}, "
        f"markers={len(REQUIRED_DOC_MARKERS) + len(REQUIRED_SMOKE_MARKERS)}"
    )


if __name__ == "__main__":
    main()
