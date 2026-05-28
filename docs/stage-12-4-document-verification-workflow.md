# Stage 12.4. Document verification workflow

Status: in progress

Stage 12.4 focuses on public document verification, QR/code based verification, learner document visibility, and safe document authenticity checks.

This stage must stay safe and incremental:

- no database migrations;
- no API contract changes unless a separate backend test is added first;
- no authentication or RBAC weakening;
- no production rebuild without successful local guards;
- no secrets in docs, logs, screenshots or reports;
- public verification must not expose private learner data beyond intended fields;
- invalid verification codes must be handled safely;
- revoked documents must remain visibly invalid;
- draft documents must not be treated as valid public documents;
- all Stage 12.1 learner-account behavior must remain green;
- all Stage 12.2 catalog behavior must remain green;
- all Stage 12.3 course-detail behavior must remain green;
- every deploy must state whether frontend_runtime_changed or backend_runtime_changed.

## 1. Baseline state

Accepted baseline:

- current git head before Stage 12.4 implementation: 006e160;
- Stage 12.1 account UX polish was completed;
- tag v0.1.0-stage12-1-account-ux-polish exists;
- Stage 12.2 catalog UX polish was completed;
- tag v0.1.0-stage12-2-catalog-ux-polish exists;
- Stage 12.3 course detail UX polish was completed;
- tag v0.1.0-stage12-3-course-detail-ux-polish exists;
- public /verify-document route exists;
- public /verify/:code route exists;
- VerifyDocumentPage exists;
- VerifyDocumentCodeRoute exists;
- frontend API client exposes verifyPublicDocument;
- frontend API client calls GET /api/v1/public/documents/verify;
- account page displays learner documents;
- account page has DocumentVerificationQrBlock integration;
- account page has public verification readiness logic;
- account page has completion document diagnostics;
- admin documents page manages document status, file availability, revocation and publication.

## 2. Product goal

Goal:

- make public document verification clear for external users;
- explain what can be checked by document number, verification code or QR link;
- show successful verification in a structured way;
- show invalid or missing documents safely;
- explain revoked and draft states without exposing extra data;
- connect public verification with learner account documents;
- keep verification public, safe and narrow.

## 3. User states

The document verification workflow must explicitly handle these states:

- visitor opens /verify-document manually;
- visitor opens /verify/:code from QR link;
- visitor enters empty verification value;
- visitor enters invalid verification value;
- visitor enters valid document number;
- visitor enters valid verification code;
- verification request is loading;
- verification request fails;
- verified document is available;
- verified document is revoked;
- verified document is draft or not publicly valid;
- learner sees available documents in account;
- learner sees draft documents in account;
- learner sees revoked documents in account;
- learner has no documents yet.

## 4. Public verification page contract

VerifyDocumentPage must keep these behavior markers:

- import verifyPublicDocument from frontend API client;
- keep VerifyDocumentPage export;
- keep form-based manual verification;
- keep route based verification through VerifyDocumentCodeRoute;
- keep safe error handling;
- keep loading state;
- keep result state;
- keep input value state;
- keep navigation to account;
- keep navigation to catalog;
- keep public /verify-document route;
- keep public /verify/:code route.

## 5. Account documents contract

Account document workflow must keep these behavior markers:

- getAccountDocuments;
- downloadAccountDocument;
- DocumentVerificationQrBlock;
- hasDocumentVerificationTarget;
- canShowPublicDocumentVerification;
- getAccountDocumentNotice;
- getAccountDocumentDownloadLabel;
- canDownloadDocument;
- CompletionDocumentsDiagnostics;
- account-completion-documents-diagnostics;
- account-completion-documents-summary;
- account-completion-documents-quality;
- account-completion-documents-attention;
- account-completion-documents-links;
- account-documents;
- public verification for available documents;
- revoked documents are not treated as valid active documents.

## 6. Admin documents contract

Admin document workflow must keep these behavior markers:

- DocumentsPage;
- document status editing;
- draft status;
- available status;
- revoked status;
- file upload or replacement;
- missing file warning;
- revocation reason;
- document number;
- verification code;
- public verification depends on publication and verification target.

## 7. API contract

Stage 12.4 starts without API changes.

Existing API calls that must remain stable:

- GET /api/v1/public/documents/verify?number=...;
- GET /api/v1/account/documents;
- GET /api/v1/account/documents/{document_id}/download;
- GET /api/v1/admin/documents;
- POST /api/v1/admin/documents;
- PATCH /api/v1/admin/documents/{document_id};
- DELETE /api/v1/admin/documents/{document_id};
- POST /api/v1/admin/documents/{document_id}/regenerate;
- GET /api/v1/admin/documents/{document_id}/download;
- GET /api/v1/admin/documents/{document_id}/generation-events.

## 8. First implementation target

The first safe implementation target is frontend-only public verification UX polish:

- improve the /verify-document hero and explanation;
- add a compact verification journey block;
- clarify what data is checked;
- clarify what invalid, revoked and unavailable states mean;
- improve loading and empty result states;
- keep API calls unchanged;
- keep Stage 12.1 smoke green;
- keep Stage 12.2 catalog guard green;
- keep Stage 12.3 course detail guard green;
- add source markers to guard before production deploy.

## 9. Acceptance checks

Local acceptance must include:

- python scripts/check_stage12_4_document_verification_workflow.py;
- python scripts/check_stage12_3_course_detail_learner_workflow.py;
- python scripts/check_stage12_2_catalog_learner_workflow.py;
- python scripts/smoke_stage12_1_account_workflow.py;
- python scripts/check_stage12_1_account_contract.py;
- python scripts/check_stage12_1_learner_account_workflow.py;
- python scripts/check_stage12_product_roadmap.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py;
- docker compose exec frontend npm run build.

## 10. Production acceptance

Production acceptance must include:

- git head check;
- Stage 12.4 guard passed;
- Stage 12.3 course detail guard passed;
- Stage 12.2 catalog guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner workflow guard passed;
- Stage 12 product roadmap guard passed;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend health healthy;
- public /verify-document returned HTTP 200;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed must be explicit;
- backend_runtime_changed must be explicit;
- RESULT=PASSED.

## 11. Safety boundaries

Do not do these inside Stage 12.4 without a separate explicit checkpoint:

- no database schema changes;
- no document authenticity algorithm changes;
- no QR generation backend changes;
- no document generation template changes;
- no permission model changes;
- no auth token storage changes;
- no admin document API refactor;
- no learner account API refactor;
- no public verification API refactor;
- no Caddy/Nginx production config changes;
- no production backend restart for frontend-only UX changes.

## 12. Current checkpoint

Current checkpoint:

- Stage 12.4 document verification workflow document created;
- Stage 12.4 document verification workflow guard created;
- initial Stage 12.4 scope is documentation and contract only;
- implementation has not changed runtime yet;
- frontend_runtime_changed=no;
- backend_runtime_changed=no.

## 13. Stage 12.4 document verification workflow docs sync - 2026-05-27

Status: accepted

Stage 12.4 document verification workflow documentation and guard were synced to production and accepted.

Accepted evidence:

- production git head: 8131e18;
- Stage 12.4 document verification workflow guard passed;
- Stage 12.3 course detail learner workflow guard passed;
- Stage 12.2 catalog learner workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- Stage 12.3 course detail UX polish tag head verified: 5f88a8c;
- Stage 12.4 document title marker was present;
- Stage 12.4 baseline head marker was present;
- Stage 12.4 guard created marker was present;
- source marker VerifyDocumentPage was present;
- source marker verifyPublicDocument was present;
- source marker setLoading was present;
- source marker setError was present;
- source marker setResult was present;
- API marker verifyPublicDocument was present;
- API marker /api/v1/public/documents/verify was present;
- API marker getAccountDocuments was present;
- API marker downloadAccountDocument was present;
- account marker DocumentVerificationQrBlock was present;
- account marker canShowPublicDocumentVerification was present;
- account marker CompletionDocumentsDiagnostics was present;
- route marker /verify/:code was present;
- route marker /verify-document was present;
- route marker VerifyDocumentCodeRoute was present;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- public /verify-document returned HTTP 200;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=no;
- backend_runtime_changed=no;
- stage12_4_document_verification_workflow_docs_sync=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_4_1_document_verification_workflow_docs_sync_20260527210622.txt

## 14. Stage 12.4 public verification journey hint - 2026-05-28

Status: implemented locally

Stage 12.4 adds a frontend-only public verification journey hint to make the /verify-document page clearer before the user submits a document number, verification code or QR-derived code.

Implementation boundaries:

- frontend-only change;
- no database migrations;
- no API changes;
- no backend runtime changes;
- no auth or RBAC changes;
- existing verifyPublicDocument API call remains unchanged;
- existing /verify-document route remains unchanged;
- existing /verify/:code route remains unchanged;
- existing loading, error, not found and result states remain unchanged;
- existing PublicVerificationDiagnostics remains rendered;
- existing PublicVerificationQrOperationsPanel remains rendered;
- existing ResultCard remains rendered.

Source markers:

- PublicVerificationJourneyHint;
- public-verification-journey;
- public-verification-journey-title;
- public-verification-journey-steps;
- public-verification-journey-current-state;
- public-verification-journey-safe-data;
- public-verification-journey-account-action;
- public-verification-journey-catalog-action;
- Проверка документа → код/номер → результат;
- Публичная проверка не открывает файл документа.

## 15. Stage 12.4 public verification journey frontend deploy - 2026-05-27

Status: accepted

Stage 12.4 public verification journey hint was deployed to the production static frontend and accepted.

Accepted evidence:

- production git head: b9c18bf;
- Stage 12.4 document verification workflow guard passed;
- Stage 12.3 course detail learner workflow guard passed;
- Stage 12.2 catalog learner workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- Stage 12.3 course detail UX polish tag head verified: 5f88a8c;
- source marker PublicVerificationJourneyHint was present;
- source marker PublicVerificationJourneyHint render was present;
- source marker public-verification-journey was present;
- source marker public-verification-journey-title was present;
- source marker public-verification-journey-steps was present;
- source marker public-verification-journey-current-state was present;
- source marker public-verification-journey-safe-data was present;
- source marker public-verification-journey-account-action was present;
- source marker public-verification-journey-catalog-action was present;
- source marker verifyPublicDocument(value) was unchanged;
- source marker PublicVerificationDiagnostics remained rendered;
- source marker PublicVerificationQrOperationsPanel remained rendered;
- source marker ResultCard remained rendered;
- source marker public verification heading was present;
- source marker public verification safe data text was present;
- doc marker public verification journey section was present;
- doc marker frontend-only boundary was present;
- doc marker no API changes was present;
- doc marker no backend runtime changes was present;
- frontend static image was rebuilt;
- frontend container was recreated;
- frontend health became healthy;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- public /verify-document returned HTTP 200;
- public /verify/DOCV-SMOKE returned HTTP 200;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- stage12_4_public_verification_journey_frontend_deploy=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_4_3_public_verification_journey_frontend_deploy_20260527212724.txt

## 16. Stage 12.4 public verification form and service states - 2026-05-28

Status: implemented locally

Stage 12.4 adds stable frontend markers for the public verification form, input, submit action, error state, not-found state and result state.

Implementation boundaries:

- frontend-only change;
- no database migrations;
- no API changes;
- no backend runtime changes;
- no auth or RBAC changes;
- existing verifyPublicDocument(value) API call remains unchanged;
- existing /verify-document route remains unchanged;
- existing /verify/:code route remains unchanged;
- existing PublicVerificationJourneyHint remains rendered;
- existing PublicVerificationDiagnostics remains rendered;
- existing PublicVerificationQrOperationsPanel remains rendered;
- existing ResultCard remains rendered.

Source markers:

- public-verification-form-section;
- public-verification-form;
- public-verification-query-input;
- public-verification-submit;
- public-verification-error-state;
- public-verification-not-found-state;
- public-verification-result-card;
- public-verification-result-reset-action;
- public-verification-result-catalog-action;
- public-verification-result-home-action;
- public-verification-not-found-reset-action;
- public-verification-not-found-contacts-action;
- role="alert";
- role="status";
- aria-live="assertive";
- aria-live="polite".

## 17. Stage 12.4 public verification service states frontend deploy - 2026-05-27

Status: accepted

Stage 12.4 public verification form and service states were deployed to the production static frontend and accepted.

Accepted evidence:

- production git head: 31a0eae;
- Stage 12.4 document verification workflow guard passed;
- Stage 12.3 course detail learner workflow guard passed;
- Stage 12.2 catalog learner workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- Stage 12.3 course detail UX polish tag head verified: 5f88a8c;
- source marker verifyPublicDocument value call was unchanged;
- source marker public-verification-form-section was present;
- source marker public-verification-form was present;
- source marker public-verification-query-input was present;
- source marker public-verification-submit was present;
- source marker submit disabled guard was present;
- source marker public-verification-error-state was present;
- source marker error alert role was present;
- source marker error aria live assertive was present;
- source marker public-verification-not-found-state was present;
- source marker not found status role was present;
- source marker not found aria live polite was present;
- source marker public-verification-not-found-reset-action was present;
- source marker public-verification-not-found-contacts-action was present;
- source marker public-verification-result-card was present;
- source marker public-verification-result-reset-action was present;
- source marker public-verification-result-catalog-action was present;
- source marker public-verification-result-home-action was present;
- source marker PublicVerificationJourneyHint remained rendered;
- source marker PublicVerificationDiagnostics remained rendered;
- source marker PublicVerificationQrOperationsPanel remained rendered;
- source marker ResultCard remained rendered;
- doc marker public verification service states section was present;
- doc marker frontend-only boundary was present;
- doc marker no API changes was present;
- doc marker no backend runtime changes was present;
- doc marker verifyPublicDocument API unchanged was present;
- frontend static image was rebuilt;
- frontend container was recreated;
- frontend health became healthy;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- public /verify-document returned HTTP 200;
- public /verify/DOCV-SMOKE returned HTTP 200;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- stage12_4_public_verification_service_states_frontend_deploy=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_4_5_public_verification_service_states_frontend_deploy_20260527215246.txt

## 18. Stage 12.4 document verification UX polish checkpoint tag - 2026-05-28

Status: accepted

Stage 12.4 document verification UX polish checkpoint tag was created and pushed to the remote repository.

Accepted evidence:

- checkpoint tag: v0.1.0-stage12-4-document-verification-ux-polish;
- tagged git head: 417e65a;
- tag message: Stage 12.4 document verification UX polish checkpoint: public verification journey, service states, guards, runtime smoke and production deploy;
- tag was pushed to origin;
- develop, origin/develop, main and origin/main were aligned at 417e65a;
- Stage 12.4 document verification workflow document was accepted;
- Stage 12.4 public verification journey hint was deployed and accepted;
- Stage 12.4 public verification service states were deployed and accepted;
- Stage 12.4 document verification workflow guard was accepted;
- Stage 12.3 course detail workflow guard remained green;
- Stage 12.2 catalog workflow guard remained green;
- Stage 12.1 account workflow smoke remained green;
- production docs sync passed before tag creation.
