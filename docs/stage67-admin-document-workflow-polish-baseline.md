# Stage 67 - Admin document workflow polish baseline

Status: planned
Base branch: develop
Base checkpoint: a1843b1
Previous stage: v0.1.0-stage66-documents-public-verification-ux
Scope: improve admin document workflow UX locally

## Goal

Stage 67 improves the admin document workflow after the public verification UX was improved in Stage 66.

## Background

Stage 66 improved public document verification and QR explanations.
The next safe product step is to inspect and polish the admin document workflow without touching production.

## Target areas

```text
frontend/src/pages/DocumentsPage.jsx
frontend/src/components/documents/DocumentVerificationQrBlock.jsx
scripts/smoke_documents_page.py
scripts/smoke_frontend_admin_pages.py
backend document/admin tests only if needed
```

## Target behavior

```text
1. Admin document statuses should be easier to understand.
2. Action-required hints should be clear and actionable.
3. Document publication/revocation/download/QR areas should remain stable.
4. Empty/loading/error states should stay user-friendly.
5. Admin document workflow should not regress after Stage 66 public verification changes.
```

## Safety rule

Stage 67 is local development only. It must not deploy to production, modify production data, restart production services, run production migrations or change server configuration.

## Investigation plan

```text
1. Inspect current DocumentsPage.jsx sections around statuses, action_required, QR, public links and audit links.
2. Inspect current smoke coverage for admin documents.
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

- Current admin document workflow UX is inspected.
- A minimal safe improvement scope is documented.
- UX improvements are implemented or a precise implementation plan is documented.
- Existing document/verification routes remain functional.
- No production changes are executed.
- No production secrets are printed or committed.
- Required guards pass.
- Frontend build passes.
- Backend tests pass.
- Working tree is clean before final acceptance.
