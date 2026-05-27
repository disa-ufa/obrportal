# Stage 12.1 learner account workflow

Status: accepted
Stage: 12.1
Project: ObrPortal
Parent roadmap: docs/stage-12-product-roadmap.md
Production baseline tag: v0.1.0-stage11-operations-baseline

## 1. Purpose

Stage 12.1 defines the learner-facing account and profile workflow.

The goal is to improve the learner account experience without weakening authentication, RBAC or production operations baseline.

## 2. Current scope

The learner account workflow covers:

- authenticated learner account page;
- profile information display;
- pending enrollment state;
- active enrollment state;
- rejected or missing enrollment state;
- generated document list when available;
- safe empty states;
- safe API error rendering.

## 3. User roles

Primary role:

- learner or regular authenticated user.

Related roles:

- admin;
- organization user;
- unauthenticated visitor.

Access rules:

- unauthenticated visitor must be redirected to login;
- learner must see only own profile and own enrollment/document state;
- admin-only data must not be exposed on learner pages;
- organization-only data must not be exposed on learner pages;
- object-level access control must be preserved.

Additional learner data safety rules:

- learner pages must not expose admin-only data;
- learner pages must not expose organization-only data;
- learner document state must not expose documents of other users;
- learner enrollment state must not expose enrollments of other users.

## 4. Learner account page requirements

The account page should show:

- user full name or email fallback;
- email;
- role or account type label;
- organization or group relation only when allowed;
- enrollment status;
- course title if enrollment exists;
- document status if documents exist;
- clear next action.

The page should not show:

- raw backend objects;
- internal IDs unless intentionally needed for support;
- tokens;
- permissions list;
- unrelated users;
- admin-only audit data.

## 5. Enrollment state requirements

The UI should handle these states:

- no enrollment yet;
- enrollment pending;
- enrollment approved or active;
- enrollment rejected;
- enrollment completed;
- enrollment data unavailable due to error.

Each state must have a clear user-facing explanation.

## 6. Document state requirements

When documents are available, the learner account should show:

- document type;
- document status;
- generated date if available;
- verification/QR link if available;
- safe fallback if document generation is not available.

Document display must not leak other users' documents.

## 7. Error handling requirements

Frontend error handling must remain safe:

- no raw backend error objects are rendered;
- authorization errors are shown as clear messages;
- network errors are shown as clear messages;
- missing optional data uses empty state instead of crashing;
- frontend guard remains green.

## 8. Backend/API review requirements

Before implementation, review existing API capabilities:

- current user endpoint;
- account/profile endpoint if present;
- enrollment endpoints;
- document endpoints;
- access-control behavior for learner data.

If a new endpoint is needed, it must be covered by tests.

## 9. Frontend implementation boundaries

Allowed frontend changes:

- account page layout;
- account data mapping;
- empty states;
- loading states;
- safe error messages;
- learner-specific display components;
- smoke checks for account behavior.

Avoid broad unrelated changes.

## 10. Backend implementation boundaries

Allowed backend changes if required:

- read-only learner account summary endpoint;
- schema for learner account summary;
- tests for access control;
- tests for missing enrollment/document states.

Forbidden without separate plan:

- destructive migrations;
- broad auth refactor;
- broad RBAC refactor;
- exposing admin data to learner;
- bypassing object-level access control.

## 11. Acceptance criteria

Stage 12.1 is accepted when:

- learner account workflow is documented;
- CI guard exists;
- learner page shows safe user/profile state;
- enrollment states are understandable;
- document states are understandable when available;
- unauthenticated users are redirected;
- admin-only data is not exposed;
- frontend build passes;
- backend tests pass;
- production operations baseline remains preserved.

## 12. Local quality gate

Before merging Stage 12.1 implementation, run:

- python scripts/check_stage12_1_learner_account_workflow.py;
- python scripts/check_stage12_product_roadmap.py;
- python scripts/check_production_incident_runbook.py;
- python scripts/check_production_release_runbook.py;
- python scripts/check_production_monitoring_runbook.py;
- python scripts/check_production_restore_drill_runbook.py;
- python scripts/check_production_operations_runbook.py;
- python scripts/check_frontend_static_serving.py;
- python scripts/check_production_frontend_static_runbook.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py;
- docker compose exec frontend npm run build;
- docker compose exec backend pytest app/tests -q.

## 13. Stage 12.1 learner workflow server check result - 2026-05-27

Status: accepted

Stage 12.1 learner account workflow was checked on the production server and accepted.

Accepted evidence:

- production git head after sync: 60f7f91;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
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
- local /healthz returned ok;
- local /api/v1/ready returned database=ok, redis=ok, storage=ok;
- public / returned HTTP 200;
- public /login returned HTTP 200;
- public /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- Docker service was enabled and active;
- Caddy service was enabled and active;
- secrets_printed=no;
- stage12_1_learner_workflow_server_check=passed;
- production_runtime_changed=no.

Accepted production report:

- /opt/obrportal/tmp/stage_12_1_1_learner_workflow_server_check_20260527153049.txt

## 14. Stage 12.1 account contract guard server check result - 2026-05-27

Status: accepted

Stage 12.1 account contract guard was checked on the production server and accepted.

Accepted evidence:

- production git head after sync: ebd8d5a;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- ownership markers: 9;
- account routes: 9;
- frontend account markers: 325;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- local /healthz returned ok;
- local /api/v1/ready returned database=ok, redis=ok, storage=ok;
- public / returned HTTP 200;
- public /login returned HTTP 200;
- public /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- Docker service was enabled and active;
- Caddy service was enabled and active;
- secrets_printed=no;
- stage12_1_account_contract_guard_server_check=passed;
- production_runtime_changed=no.

Accepted production report:

- /opt/obrportal/tmp/stage_12_1_3_account_contract_guard_server_check_20260527160847.txt

## 15. Stage 12.1 account workflow smoke server check result - 2026-05-27

Status: accepted

Stage 12.1 runtime account workflow smoke was checked on the production server and accepted.

Accepted evidence:

- production git head: 3bda3a2;
- server-only smoke learner environment was loaded without sourcing .env;
- smoke learner user was seeded on production;
- smoke learner role: learner_fl;
- Stage 12.1 account workflow smoke passed;
- account summary without token returned HTTP 401;
- account summary with learner token returned ok;
- account courses without token returned HTTP 401;
- account courses with learner token returned ok;
- account course detail was safely skipped when learner had no courses;
- account documents without token returned HTTP 401;
- account documents with learner token returned ok;
- missing account document download returned HTTP 404;
- account document download was safely skipped when no downloadable documents existed;
- frontend /account returned HTTP 200;
- frontend /login returned HTTP 200;
- frontend /catalog returned HTTP 200;
- frontend /verify-document returned HTTP 200;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- public / returned HTTP 200;
- public /login returned HTTP 200;
- public /account returned HTTP 200;
- public /catalog returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- server_only_smoke_user_seeded=yes;
- stage12_1_account_workflow_smoke_server_check=passed;
- production_runtime_changed=no.

Accepted production report:

- /opt/obrportal/tmp/stage_12_1_5_account_workflow_smoke_server_check_seeded_retry_20260527170759.txt

## 16. Stage 12.1 account empty states frontend deploy result - 2026-05-27

Status: accepted

Stage 12.1 account empty states UX improvement was deployed to the production static frontend and accepted.

Accepted evidence:

- production git head: 701e6a8;
- frontend source marker AccountEmptyState was present;
- frontend source marker amber tone was present;
- frontend source marker course filter reset was present;
- frontend source marker document filter reset was present;
- frontend source marker documents empty link was present;
- frontend static image was rebuilt;
- frontend container was recreated;
- frontend health became healthy;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- public /account returned HTTP 200;
- public /catalog returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- secrets_printed=no;
- frontend_runtime_changed=already_deployed;
- backend_runtime_changed=no;
- stage12_1_account_empty_states_frontend_deploy=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_1_7_account_empty_states_frontend_deploy_ascii_retry_20260527172748.txt
