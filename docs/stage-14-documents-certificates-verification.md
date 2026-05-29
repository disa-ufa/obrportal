# Stage 14 Documents / certificates / verification

Status: in progress
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
