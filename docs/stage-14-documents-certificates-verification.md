# Stage 14 Documents / certificates / verification

Status: accepted
Stage: 14
Project: ObrPortal
Baseline tag: v0.1.0-stage13-learning-flow-complete
Parent roadmap: docs/project-roadmap-after-stage9.md

## 1. Purpose

Stage 14 stabilizes generated educational documents after the accepted learner course flow.

The goal is to make document generation, document metadata, PDF rendering, QR verification and public verification reliable enough for limited real users.

## 2. Roadmap scope

Stage 14 follows the post-Stage 9 roadmap section:

- document templates;
- PDF generation;
- QR code;
- document number;
- public verification;
- account document download;
- admin document visibility;
- safety checks around generated artifacts.

## 3. Accepted baseline before Stage 14

Stage 14 starts only after:

- Stage 12 is accepted;
- Stage 13 is accepted;
- tag `v0.1.0-stage13-learning-flow-complete` exists;
- learner course completion flow exists;
- course completion can trigger document generation;
- public verification route already exists as a product surface.

## 4. Current known implementation anchors

The current codebase already contains document-related implementation areas:

- backend document PDF service;
- backend document templates service;
- document model / record storage;
- account documents API;
- public document verification API;
- frontend documents page;
- frontend public verification page;
- QR verification UI component;
- document verification utility.

Stage 14 must inventory and stabilize these existing pieces before adding new behavior.

## 5. Safety boundaries

Stage 14 must not:

- expose private documents publicly without verification token/code;
- weaken authentication or RBAC;
- print secrets or production credentials;
- commit generated PDFs, QR images, backup archives or server-local files;
- perform destructive database operations;
- change production runtime without an explicit deploy step;
- introduce a second parallel document verification namespace without need.

## 6. Expected Stage 14 checkpoints

Planned checkpoints:

1. baseline document and guard;
2. document implementation inventory;
3. backend document contract tests review;
4. PDF/template/QR verification hardening;
5. account document download verification;
6. public verification UX/contract verification;
7. admin document visibility verification;
8. final Stage 14 quality gate and tag.

## 7. Local quality gate

Before merging Stage 14 baseline, run:

- `python scripts/check_stage14_documents_certificates_verification.py`;
- `python scripts/check_stage13_learning_flow.py`;
- `python scripts/check_stage12_8_final_stabilization.py`;
- `python scripts/check_project_roadmap_after_stage9.py`;
- `python scripts/check_ci_local_gate.py`;
- `python scripts/check_text_encoding.py`;
- `python scripts/check_source_bom.py`.

Before merging Stage 14 runtime work, additionally run:

- `docker compose exec frontend npm run build`;
- `docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q`.

## 8. Baseline acceptance criteria

Stage 14 baseline is accepted when:

- this document exists;
- the Stage 14 guard exists;
- the guard checks the post-Stage 9 roadmap;
- the guard checks Stage 13 final acceptance;
- the guard checks current document implementation anchors;
- encoding and BOM guards pass;
- no runtime files are changed by the baseline step.

## 9. Verification markers

- `Stage 14 Documents / certificates / verification`
- `Stage 14 baseline`
- `v0.1.0-stage13-learning-flow-complete`
- `document templates`
- `PDF generation`
- `QR code`
- `document number`
- `public verification`
- `account document download`
- `admin document visibility`
- `document_runtime_changed=no`
- `secrets_printed=no`

## 10. Stage 14 document implementation inventory - 2026-05-29

Goal: record the current document/certificate/verification implementation inventory before runtime stabilization.

Inventory result:
- current local git head before checkpoint: `cd42dc1`;
- compact inventory report was generated at `tmp/stage14_documents_inventory.txt`;
- compact inventory summary was generated at `tmp/stage14_documents_inventory_summary.txt`;
- backend PDF service exists: `backend/app/services/document_pdf.py`;
- backend template service exists: `backend/app/services/document_templates.py`;
- completion document service exists: `backend/app/services/completion_documents.py`;
- private document storage service exists: `backend/app/services/document_storage.py`;
- document model exists: `backend/app/models/document_record.py`;
- account document API exists in `backend/app/api/v1/account.py`;
- public document verification API exists in `backend/app/api/v1/public.py`;
- admin document API exists in `backend/app/api/v1/admin.py`;
- frontend documents page exists: `frontend/src/pages/DocumentsPage.jsx`;
- frontend verification page exists: `frontend/src/pages/VerifyDocumentPage.jsx`;
- frontend QR component exists: `frontend/src/components/documents/DocumentVerificationQrBlock.jsx`;
- frontend verification utility exists: `frontend/src/utils/documentVerification.js`;
- account/public/admin schemas contain document-related response models.

Existing backend document test coverage:
- `backend/app/tests/test_document_pdf.py`;
- `backend/app/tests/test_document_storage.py`;
- `backend/app/tests/test_document_templates.py`;
- `backend/app/tests/test_config_document_metadata.py`;
- document/account/public/admin checks inside `backend/app/tests/test_auth_rbac_admin_api.py`;
- document action-required/worklist/dashboard checks in dedicated admin tests.

Focused verification:
- `docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests/test_document_pdf.py -q`;
- result: `9 passed`;
- ReportLab deprecation warning is non-blocking.

Decision:
- Stage 14 must stabilize the existing document implementation instead of creating a parallel document subsystem.
- The next runtime step should verify focused document template/storage/API tests before adding changes.
- The inventory reports in `tmp/` are local working artifacts and must not be committed.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- `document_inventory_runtime_changed=no`.

Verification markers:
- `Stage 14 document implementation inventory - 2026-05-29`
- `stage14_inventory_report=tmp/stage14_documents_inventory.txt`
- `stage14_inventory_summary=tmp/stage14_documents_inventory_summary.txt`
- `document_pdf_service_existing=yes`
- `document_templates_service_existing=yes`
- `completion_documents_service_existing=yes`
- `document_storage_service_existing=yes`
- `document_record_model_existing=yes`
- `account_documents_api_existing=yes`
- `public_document_verification_api_existing=yes`
- `admin_documents_api_existing=yes`
- `frontend_documents_pages_existing=yes`
- `focused_document_pdf_tests=9_passed`
- `document_inventory_runtime_changed=no`

## 11. Stage 14 focused backend document tests - 2026-05-29

Goal: record focused backend verification for the existing document/certificate/verification implementation.

Focused document service tests:
- `backend/app/tests/test_document_pdf.py`;
- `backend/app/tests/test_document_templates.py`;
- `backend/app/tests/test_document_storage.py`;
- `backend/app/tests/test_config_document_metadata.py`;
- result: `27 passed`;
- ReportLab deprecation warning is non-blocking.

Focused document API tests:
- `test_admin_can_get_account_documents`;
- `test_account_documents_without_token_returns_401`;
- `test_public_can_verify_document`;
- `test_public_verify_document_not_found_returns_404`;
- `test_admin_can_get_account_document_download`;
- `test_foreign_user_cannot_get_account_document_download`;
- `test_account_document_download_without_token_returns_401`;
- `test_admin_can_filter_documents_by_organization`;
- `test_admin_can_list_admin_documents`;
- `test_admin_can_create_document_with_file`;
- `test_admin_create_document_duplicate_number_returns_409`;
- `test_learner_cannot_create_admin_document`;
- `test_admin_can_update_document_status_and_replace_file`;
- `test_admin_update_document_duplicate_number_returns_409`;
- result: `14 passed`.

Verified behavior:
- PDF rendering works;
- QR drawing helpers work;
- template text normalization works;
- verification URL generation works;
- unsafe HTML values are escaped;
- private storage path traversal is rejected;
- document download filename generation works;
- document metadata defaults and env aliases are stable;
- account documents require authentication;
- public document verification returns valid document data;
- missing public verification code returns 404;
- account document download is ownership-scoped;
- foreign user document download is rejected;
- admin can list/filter documents;
- admin can create document with file;
- duplicate document number is rejected;
- learner cannot create admin document;
- admin can update document status and replace file;
- duplicate number on update is rejected.

Decision:
- Stage 14 accepts existing focused backend document tests as current backend contract baseline.
- The next step should inventory frontend/public verification UX before adding runtime changes.
- No new document subsystem is needed.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- `document_backend_tests_runtime_changed=no`.

Verification markers:
- `Stage 14 focused backend document tests - 2026-05-29`
- `focused_document_service_tests=27_passed`
- `focused_document_api_tests=14_passed`
- `document_pdf_tests_passed=yes`
- `document_templates_tests_passed=yes`
- `document_storage_tests_passed=yes`
- `document_metadata_tests_passed=yes`
- `public_document_verification_tests_passed=yes`
- `account_document_download_tests_passed=yes`
- `admin_document_management_tests_passed=yes`
- `document_backend_tests_runtime_changed=no`

## 12. Stage 14 frontend and public verification UX checkpoint - 2026-05-29

Goal: record frontend/account/admin/public verification UX inventory for the existing document implementation.

Frontend inventory result:
- current local git head before checkpoint: `a0682d9`;
- frontend/public verification UX inventory was generated at `tmp/stage14_frontend_verification_ux_inventory.txt`;
- required frontend verification markers passed;
- frontend production build passed earlier on the same head;
- Vite chunk-size warning is non-blocking.

Verified frontend/account/admin/public markers:
- `frontend/src/pages/AccountPage.jsx` contains `getAccountDocuments`;
- `frontend/src/pages/AccountPage.jsx` contains `downloadAccountDocument`;
- `frontend/src/pages/DocumentsPage.jsx` contains `DocumentVerificationQrBlock`;
- `frontend/src/pages/DocumentsPage.jsx` contains `document_number`;
- `frontend/src/pages/DocumentsPage.jsx` contains `download`;
- `frontend/src/pages/DocumentsPage.jsx` contains `data-testid`;
- `frontend/src/pages/VerifyDocumentPage.jsx` contains `verify`;
- `frontend/src/pages/VerifyDocumentPage.jsx` contains `verification`;
- `frontend/src/pages/VerifyDocumentPage.jsx` contains `DocumentVerificationQrBlock`;
- `frontend/src/pages/VerifyDocumentPage.jsx` contains `data-testid`;
- `frontend/src/components/documents/DocumentVerificationQrBlock.jsx` contains `qr`;
- `frontend/src/components/documents/DocumentVerificationQrBlock.jsx` contains `verification`;
- `frontend/src/utils/documentVerification.js` contains `verification`;
- `frontend/src/utils/documentVerification.js` contains `qr`;
- `frontend/src/api/client.js` contains `getAccountDocuments`;
- `frontend/src/api/client.js` contains `downloadAccountDocument`.

Decision:
- Stage 14 accepts the existing account/admin/public document UI as the current frontend baseline.
- The next step should be final quality gate unless a concrete runtime gap is found.
- No frontend runtime change is required by this checkpoint.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- The inventory report in `tmp/` is a local working artifact and must not be committed.
- `document_frontend_ux_runtime_changed=no`.

Verification markers:
- `Stage 14 frontend and public verification UX checkpoint - 2026-05-29`
- `stage14_frontend_ux_inventory=tmp/stage14_frontend_verification_ux_inventory.txt`
- `required_frontend_markers=ok`
- `account_document_download_ui_existing=yes`
- `admin_documents_ui_existing=yes`
- `public_document_verification_ui_existing=yes`
- `document_qr_component_existing=yes`
- `document_verification_utility_existing=yes`
- `document_client_functions_existing=yes`
- `frontend_build_passed=yes`
- `document_frontend_ux_runtime_changed=no`

## 13. Stage 14 final acceptance - 2026-05-29

Goal: record final acceptance of Stage 14 Documents / certificates / verification.

Accepted Stage 14 scope:
- document templates;
- PDF generation;
- QR code;
- document number;
- public verification;
- account document download;
- admin document visibility;
- safety checks around generated artifacts.

Final verification result:
- Stage 14 guard passed: `doc_markers=49`, `roadmap_markers=7`, `stage13_markers=5`, `required_files=6`;
- Stage 13 guard passed;
- Stage 12.8 guard passed;
- project roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- frontend production build passed;
- backend full test suite passed: `214 passed`;
- focused backend document service tests were accepted earlier: `27 passed`;
- focused document API tests were accepted earlier: `14 passed`;
- focused document PDF tests were accepted earlier: `9 passed`;
- Vite chunk-size warning is non-blocking;
- ReportLab/passlib/jose deprecation warnings are non-blocking.

Safety notes:
- This final acceptance record is documentation/guard-only.
- No runtime application code was changed for this acceptance record.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- Local generated `tmp/` artifacts must remain uncommitted and ignored.
- `document_runtime_changed=no`.

Final Stage 14 tag:
- `v0.1.0-stage14-documents-verification-complete`.

Verification markers:
- `Stage 14 final acceptance - 2026-05-29`
- `Stage 14 accepted`
- `documents_certificates_verification_accepted=yes`
- `document_templates_accepted=yes`
- `pdf_generation_accepted=yes`
- `qr_code_accepted=yes`
- `document_number_accepted=yes`
- `public_verification_accepted=yes`
- `account_document_download_accepted=yes`
- `admin_document_visibility_accepted=yes`
- `frontend production build passed`
- `214 passed`
- `v0.1.0-stage14-documents-verification-complete`
- `document_runtime_changed=no`
