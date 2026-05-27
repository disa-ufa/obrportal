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
    "/opt/obrportal/tmp/stage_12_1_3_account_contract_guard_server_check_20260527160847.txt",
    "/opt/obrportal/tmp/stage_12_1_5_account_workflow_smoke_server_check_seeded_retry_20260527170759.txt",
    "/opt/obrportal/tmp/stage_12_1_7_account_empty_states_frontend_deploy_ascii_retry_20260527172748.txt",
    "Stage 12.1 account empty states UX improvement was deployed and accepted",
    "Stage 12.1 runtime account workflow smoke was accepted",
    "Stage 12.1 account contract guard was accepted",
    "Stage 12.1 workflow documentation was accepted",
    "develop, origin/develop, main and origin/main were aligned at de466a2",
    "tag was pushed to origin",
    "tagged git head: de466a2",
    "checkpoint tag: v0.1.0-stage12-1-account-baseline",
    "/opt/obrportal/tmp/stage_12_1_10_account_empty_states_guard_fix_sync_20260527175921.txt",
    "stage12_1_account_empty_states_guard_fix_sync=passed",
    "source marker document filter reset was present",
    "source marker course filter reset was present",
    "source marker documents empty link was present",
    "source marker AccountEmptyState was present",
    "fix commit corrected quoted empty-state guard markers",
    "previous guard marker commit 9213cf0 had invalid quoted markers",
    "production git head: 098bc58",
    "Stage 12.1 account empty states guard fix sync - 2026-05-27",
    "Stage 12.1 account baseline checkpoint tag - 2026-05-27",
    "backend_runtime_changed=no",
    "frontend_runtime_changed=already_deployed",
    "stage12_1_account_empty_states_frontend_deploy=passed",
    "frontend health became healthy",
    "frontend container was recreated",
    "frontend static image was rebuilt",
    "frontend source marker document filter reset was present",
    "frontend source marker course filter reset was present",
    "frontend source marker AccountEmptyState was present",
    "production git head: 701e6a8",
    "Stage 12.1 account empty states frontend deploy result - 2026-05-27",
    "stage12_1_account_workflow_smoke_server_check=passed",
    "server_only_smoke_user_seeded=yes",
    "frontend /verify-document returned HTTP 200",
    "frontend /catalog returned HTTP 200",
    "frontend /login returned HTTP 200",
    "frontend /account returned HTTP 200",
    "account documents without token returned HTTP 401",
    "account courses without token returned HTTP 401",
    "account summary without token returned HTTP 401",
    "Stage 12.1 account workflow smoke passed",
    "smoke learner user was seeded on production",
    "server-only smoke learner environment was loaded without sourcing .env",
    "production git head: 3bda3a2",
    "Stage 12.1 account workflow smoke server check result - 2026-05-27",
    "stage12_1_account_contract_guard_server_check=passed",
    "frontend account markers: 325",
    "account routes: 9",
    "ownership markers: 9",
    "Stage 12.1 account contract guard passed",
    "production git head after sync: ebd8d5a",
    "Stage 12.1 account contract guard server check result - 2026-05-27",
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
