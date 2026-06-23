# Stage 68 - Organization cabinet document profile polish baseline

Status: planned
Base branch: develop
Base checkpoint: e31b15e
Previous stage: v0.1.0-stage67-admin-document-workflow-polish
Scope: improve organization cabinet document profile UX locally

## Goal

Stage 68 improves the organization cabinet document profile workflow after public and admin document verification UX were improved.

## Background

Stage 66 improved public document verification UX.
Stage 67 improved admin document workflow QR/public verification explanations.
The next safe product step is to inspect and polish organization cabinet fields that affect document generation and public trust.

## Target areas

```text
frontend/src/pages/OrganizationCabinetPage.jsx
frontend/src/utils/organizationCabinetProps.js
frontend/src/pages/AccountPage.jsx
scripts/smoke_frontend_admin_pages.py
scripts/smoke_frontend_core.py
scripts/smoke_documents_page.py
backend organization/admin tests only if needed
```

## Target behavior

```text
1. Organization document profile fields should be easier to understand.
2. Missing requisites should have actionable hints.
3. PDF/document generation readiness should be clearer.
4. Existing organization cabinet routes should remain stable.
5. No production data or server configuration should be touched.
```

## Safety rule

Stage 68 is local development only. It must not deploy to production, modify production data, restart production services, run production migrations or change server configuration.

## Investigation plan

```text
1. Inspect current organization cabinet document profile sections.
2. Inspect current helper utilities and smoke coverage.
3. Identify a minimal safe UX improvement.
4. Implement targeted frontend changes if appropriate.
5. Update smoke checks if visible text changes.
6. Run frontend build and backend tests.
```

## Acceptance checks

Required checks before acceptance:

```text
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

- Current organization cabinet document profile UX is inspected.
- A minimal safe improvement scope is documented.
- UX improvements are implemented or a precise implementation plan is documented.
- Existing document and organization routes remain functional.
- No production changes are executed.
- No production secrets are printed or committed.
- Required guards pass.
- Frontend build passes.
- Backend tests pass.
- Working tree is clean before final acceptance.
