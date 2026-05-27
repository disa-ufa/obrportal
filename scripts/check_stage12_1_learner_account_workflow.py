from __future__ import annotations

from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DOC = ROOT / "docs" / "stage-12-1-learner-account-workflow.md"

REQUIRED_MARKERS = [
    "# Stage 12.1 learner account workflow",
    "Status: accepted",
    "Stage: 12.1",
    "Parent roadmap: docs/stage-12-product-roadmap.md",
    "Production baseline tag: v0.1.0-stage11-operations-baseline",
    "learner-facing account and profile workflow",
    "without weakening authentication, RBAC or production operations baseline",
    "authenticated learner account page",
    "pending enrollment state",
    "generated document list when available",
    "unauthenticated visitor must be redirected to login",
    "learner must see only own profile",
    "admin-only data must not be exposed",
    "object-level access control must be preserved",
    "raw backend objects",
    "tokens",
    "permissions list",
    "no enrollment yet",
    "enrollment pending",
    "enrollment approved or active",
    "enrollment rejected",
    "enrollment completed",
    "document type",
    "verification/QR link if available",
    "Document display must not leak other users' documents",
    "no raw backend error objects are rendered",
    "current user endpoint",
    "enrollment endpoints",
    "document endpoints",
    "read-only learner account summary endpoint",
    "tests for access control",
    "destructive migrations",
    "bypassing object-level access control",
    "frontend build passes",
    "backend tests pass",
    "production operations baseline remains preserved",
    "python scripts/check_stage12_1_learner_account_workflow.py",
    "docker compose exec frontend npm run build",
    "docker compose exec backend pytest app/tests -q",
    "/opt/obrportal/tmp/stage_12_1_1_learner_workflow_server_check_20260527153049.txt",
    "production_runtime_changed=no",
    "stage12_1_learner_workflow_server_check=passed",
    "public /admin returned HTTP 200",
    "public /login returned HTTP 200",
    "public / returned HTTP 200",
    "local /healthz returned ok",
    "frontend image: obrportal-frontend-static:prod",
    "Stage 12 product roadmap guard passed",
    "Stage 12.1 learner account workflow guard passed",
    "production git head after sync: 60f7f91",
    "Stage 12.1 learner workflow server check result - 2026-05-27",
]

REQUIRED_SECTIONS = [
    "## 1. Purpose",
    "## 2. Current scope",
    "## 3. User roles",
    "## 4. Learner account page requirements",
    "## 5. Enrollment state requirements",
    "## 6. Document state requirements",
    "## 7. Error handling requirements",
    "## 8. Backend/API review requirements",
    "## 9. Frontend implementation boundaries",
    "## 10. Backend implementation boundaries",
    "## 11. Acceptance criteria",
    "## 12. Local quality gate",
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
        print("stage 12.1 learner account workflow diagnostics failed")
        print("missing markers:")
        for marker in missing:
            print(f" - {marker}")
        raise SystemExit(1)

    sections = text.count("\n## ")
    safety_markers = (
        text.count("must not")
        + text.count("not exposed")
        + text.count("must be preserved")
        + text.count("Forbidden")
    )
    state_markers = text.count("enrollment") + text.count("document") + text.count("empty state")

    if sections < 12:
        raise SystemExit(f"expected at least 12 sections, got {sections}")

    if safety_markers < 7:
        raise SystemExit(f"expected at least 7 safety markers, got {safety_markers}")

    if state_markers < 12:
        raise SystemExit(f"expected at least 12 state markers, got {state_markers}")

    print(
        "stage 12.1 learner account workflow diagnostics passed: "
        f"sections={sections}, safety_markers={safety_markers}, "
        f"state_markers={state_markers}, "
        f"markers={len(REQUIRED_MARKERS) + len(REQUIRED_SECTIONS)}"
    )


if __name__ == "__main__":
    main()
