# Stage 67 - Admin document workflow polish audit

Status: draft
Branch: stage67-admin-document-workflow-polish-audit
Baseline commit: 4543543
Implementation commit: b42c95c
Base develop checkpoint: a1843b1
Previous stage: v0.1.0-stage66-documents-public-verification-ux

## Summary

Stage 67 improves the admin document workflow UX with a minimal frontend-only polish around QR and public verification explanations.

## Implementation result

```text
Result: success
Scope: admin document workflow UX text and smoke coverage
Production deployment: not executed
Backend/API changes: none
Database changes: none
```

## Files changed

```text
frontend/src/pages/DocumentsPage.jsx
scripts/smoke_documents_page.py
```

## UX improvements

- Admin document QR block title now says that it is a public verification QR code.
- Admin document QR description now explains that the QR code opens the public verification page by document number or code.
- Admin document QR description clarifies that the document file and personal cabinet are not exposed.
- Public verification action label was clarified.
- Hidden public verification note now distinguishes revoked documents from unpublished documents more clearly.
- Revoked document note now explains why QR/public links are hidden.
- Draft/unpublished document note now explains that QR, public link and verification button appear after publication.

## Smoke coverage updates

```text
scripts/smoke_documents_page.py now checks Stage 67 admin document QR/public verification UX fragments.
Unicode-escaped existing smoke expectations were updated to the new text.
```

## Verified checks

```text
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_stage64_release_metadata_alignment.py
python .\scripts\check_release_versioning.py
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
```

## Test result

```text
Documents page smoke: passed
Frontend admin pages smoke: passed
Frontend core smoke: passed
Stage 64 metadata guard: passed
Release versioning guard: passed
Secret scan: passed
Text encoding guard: passed
Source BOM guard: passed
Frontend build: passed
Backend pytest: 215 passed, 4 warnings
```

## Safety result

- No production deployment was executed.
- No production data was changed.
- No production services were restarted.
- No production secrets were printed or committed.
- No backend API behavior was changed.
- No database schema or migration was changed.

## Notes

- Initial smoke update missed unicode-escaped expectations in scripts/smoke_documents_page.py.
- The smoke file was inspected and patched using unicode_escape-aware replacement.
- The implementation commit was amended after smoke and frontend build passed.

## Decision

Stage 67 audit confirms admin document workflow polish is implemented and locally verified.
