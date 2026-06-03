# Stage 66 - Documents and public verification UX improvement baseline

Status: planned
Base branch: develop
Base checkpoint: 5d32a61
Previous stage: v0.1.0-stage65-product-development-continuation
Scope: improve documents and public verification UX locally

## Goal

Stage 66 improves the documents and public verification user experience while keeping production deployment separate.

## Background

Stage 65 selected Documents and public verification flow improvements as the next product development direction.

The documents and verification area is important for document authenticity, public trust, admin workflows and QR-based verification.

## Target areas

```text
frontend/src/pages/DocumentsPage.jsx
frontend/src/pages/VerifyDocumentPage.jsx
frontend/src/components/documents/DocumentVerificationQrBlock.jsx
frontend/src/utils/documentVerification.js
frontend/src/utils/organizationCabinetProps.js
backend document/admin tests and smoke scripts if needed
```

## Target behavior

```text
1. Public verification result should be clearer for valid, missing and invalid documents.
2. Document status, publication and verification metadata should be easier to understand.
3. QR verification block should clearly explain what the QR code does.
4. Empty/loading/error states should be clear and user-friendly.
5. Admin document list/card UX should remain stable.
6. Existing document generation and verification behavior must not regress.
```

## Safety rule

Stage 66 is local development only. It must not deploy to production, modify production data, restart production services, run production migrations or change server configuration.

## Investigation plan

```text
1. Inspect current document-related frontend files.
2. Inspect current smoke/test coverage around documents and verification.
3. Identify minimal UX improvements with low regression risk.
4. Implement targeted frontend improvements.
5. Add or update smoke checks if visible text/routes change.
6. Run frontend build and backend tests.
```

## Acceptance checks

Required checks before acceptance:

```text
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

- Current documents and public verification UX is inspected.
- A minimal safe improvement scope is documented.
- UX improvements are implemented or a precise implementation plan is documented.
- Existing document/verification routes remain functional.
- No production changes are executed.
- No production secrets are printed or committed.
- Required guards pass.
- Frontend build passes.
- Backend tests pass.
- Working tree is clean before final acceptance.
