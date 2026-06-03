# Stage 69 - Admin organization document profile polish baseline

Status: planned
Base branch: develop
Base checkpoint: fdb30de
Previous stage: v0.1.0-stage68-organization-cabinet-document-profile-polish
Scope: improve admin organization document profile UX locally

## Goal

Stage 69 improves the admin organization profile workflow for document/PDF-related fields after Stage 68 added organization cabinet readiness hints.

## Background

Stage 66 improved public document verification UX.
Stage 67 improved admin document workflow QR/public verification explanations.
Stage 68 added a final PDF readiness hint to the organization cabinet requisites card.

The next safe product step is to inspect and polish admin organization fields that control signer data, issue basis, issue place and organization requisites used in final PDF documents.

## Target areas

```text
frontend/src/pages/OrganizationsPage.jsx
frontend/src/components/admin/OrganizationForm.jsx
frontend/src/components/admin/OrganizationDetailPanel.jsx
frontend/src/components/organization/OrganizationCabinetForms.jsx
scripts/smoke_frontend_admin_pages.py
scripts/smoke_org_cabinet_route.py
scripts/smoke_org_cabinet_page.py
backend organization/admin tests only if needed
```

## Target behavior

```text
1. Admin organization document profile fields should be easier to understand.
2. Signer, basis and issue place fields should have clear labels or hints if they exist.
3. Admin should understand which fields affect final PDF generation.
4. Existing organization, document and cabinet routes should remain stable.
5. No production data or server configuration should be touched.
```

## Safety rule

Stage 69 is local development only. It must not deploy to production, modify production data, restart production services, run production migrations or change server configuration.

## Investigation plan

```text
1. Inspect admin organization form/detail components.
2. Inspect backend organization schema only if frontend fields are unclear.
3. Identify a minimal safe UX improvement.
4. Implement targeted frontend changes if appropriate.
5. Update smoke checks if visible text changes.
6. Run frontend build and backend tests.
```

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\smoke_org_cabinet_page.py
python .\scripts\smoke_org_cabinet_route.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_core.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\check_stage64_release_metadata_alignment.py
python .\scripts\check_release_versioning.py
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
docker compose ps
git status --short
```

## Acceptance criteria

- Current admin organization document profile UX is inspected.
- A minimal safe improvement scope is documented.
- UX improvements are implemented or a precise implementation plan is documented.
- Existing organization, document and cabinet routes remain functional.
- No production changes are executed.
- No production secrets are printed or committed.
- Required guards pass.
- Frontend build passes.
- Backend tests pass.
- Working tree is clean before final acceptance.
