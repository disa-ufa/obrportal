from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "stage-12-product-roadmap.md"

REQUIRED_MARKERS = [
    "# Stage 12 product roadmap",
    "Status: accepted",
    "Stage: 12",
    "Production baseline tag: v0.1.0-stage11-operations-baseline",
    "Stage 12 defines the next product-development phase",
    "without breaking the accepted production baseline",
    "Stage 10 production hardening is complete",
    "Stage 11 operations baseline is complete",
    "production frontend is static nginx",
    "production restore drill is accepted",
    "production monitoring smoke is accepted",
    "production release procedure is accepted",
    "production incident response runbook is accepted",
    "develop features incrementally",
    "keep each change small and verifiable",
    "preserve production operations baseline",
    "Stage 12.1 learner account and profile workflow",
    "Stage 12.2 organization cabinet workflow",
    "Stage 12.3 course structure and enrollment workflow",
    "Stage 12.4 document generation and QR verification workflow",
    "Stage 12.5 admin moderation and audit workflow",
    "Stage 12.6 UX/UI navigation and empty states",
    "Stage 12.7 import/export and reporting",
    "Stage 12.8 final stabilization and Stage 12 tag",
    "admin-only data is not exposed",
    "object-level access control is preserved",
    "QR verification endpoint/page works",
    "no raw backend error objects are rendered",
    "destructive production database changes",
    "docker compose down -v on production",
    "exposing internal ports publicly",
    "committing production secrets",
    "python scripts/check_stage12_product_roadmap.py",
    "docker compose exec frontend npm run build",
    "docker compose exec backend pytest app/tests -q",
    "no production runtime change is made by this roadmap step",
    "/opt/obrportal/tmp/stage_12_0_1_roadmap_server_check_20260527151954.txt",
    "production_runtime_changed=no",
    "stage12_roadmap_server_check=passed",
    "public /admin returned HTTP 200",
    "public /login returned HTTP 200",
    "public / returned HTTP 200",
    "local /healthz returned ok",
    "frontend image: obrportal-frontend-static:prod",
    "Stage 12 product roadmap guard passed",
    "production git head after sync: 33945ad",
    "Stage 12 roadmap server check result - 2026-05-27",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current accepted baseline",
    "## 3. Stage 12 development principles",
    "## 4. Priority map",
    "## 5. Stage 12.1 learner account and profile workflow",
    "## 6. Stage 12.2 organization cabinet workflow",
    "## 7. Stage 12.3 course and enrollment workflow",
    "## 8. Stage 12.4 document and QR verification workflow",
    "## 9. Stage 12.5 admin moderation and audit workflow",
    "## 10. Stage 12.6 UX/UI improvements",
    "## 11. Stage 12.7 import/export and reporting",
    "## 12. Stage 12 safety rules",
    "## 13. Stage 12 local quality gate",
    "## 14. Stage 12 acceptance criteria",
]


def main() -> None:
    if not DOC.exists():
        raise SystemExit(f"missing required document: {DOC.relative_to(ROOT)}")

    text = DOC.read_text(encoding="utf-8")

    missing = [
        marker
        for marker in [*REQUIRED_MARKERS, *REQUIRED_SECTIONS]
        if marker not in text
    ]

    if missing:
        print("stage 12 product roadmap diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = text.count("Forbidden") + text.count("without") + text.count("not exposed") + text.count("preserve")
    stage_items = text.count("Stage 12.")

    if sections < 14:
        raise SystemExit(f"expected at least 14 sections, got {sections}")

    if safety_markers < 8:
        raise SystemExit(f"expected at least 8 safety markers, got {safety_markers}")

    if stage_items < 8:
        raise SystemExit(f"expected at least 8 Stage 12 items, got {stage_items}")

    print(
        "stage 12 product roadmap diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"stage_items={stage_items}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
