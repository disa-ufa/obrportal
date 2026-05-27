# Stage 12 product roadmap

Status: accepted
Stage: 12
Project: ObrPortal
Production baseline tag: v0.1.0-stage11-operations-baseline

## 1. Purpose

Stage 12 defines the next product-development phase after production hardening and operations baseline.

The goal is to continue functional development without breaking the accepted production baseline.

## 2. Current accepted baseline

Accepted baseline before Stage 12:

- Stage 10 production hardening is complete;
- Stage 11 operations baseline is complete;
- production frontend is static nginx;
- production restore drill is accepted;
- production monitoring smoke is accepted;
- production release procedure is accepted;
- production incident response runbook is accepted;
- production server is synchronized with repository;
- production internal ports remain bound to 127.0.0.1 only.

## 3. Stage 12 development principles

Stage 12 must follow these principles:

- develop features incrementally;
- keep each change small and verifiable;
- preserve production operations baseline;
- keep CI green before server sync;
- avoid unrelated refactoring;
- avoid changing production configs without a separate runbook step;
- keep migrations explicit and reversible where possible;
- document new workflows before broad implementation.

## 4. Priority map

Recommended Stage 12 order:

1. Stage 12.1 learner account and profile workflow;
2. Stage 12.2 organization cabinet workflow;
3. Stage 12.3 course structure and enrollment workflow;
4. Stage 12.4 document generation and QR verification workflow;
5. Stage 12.5 admin moderation and audit workflow;
6. Stage 12.6 UX/UI navigation and empty states;
7. Stage 12.7 import/export and reporting;
8. Stage 12.8 final stabilization and Stage 12 tag.

## 5. Stage 12.1 learner account and profile workflow

Goal:

- improve learner-facing account page;
- clarify profile fields;
- show enrollment state;
- show generated documents if available;
- make pending enrollment state understandable.

Expected artifacts:

- frontend page/component updates;
- API contract review;
- tests or smoke checks;
- UX acceptance notes.

Acceptance criteria:

- learner can understand account status;
- profile data is displayed safely;
- unauthenticated users are redirected correctly;
- admin-only data is not exposed.

## 6. Stage 12.2 organization cabinet workflow

Goal:

- improve organization-facing cabinet;
- show organization profile;
- show related groups, users, enrollments or documents when available;
- keep role-based access strict.

Acceptance criteria:

- organization user sees only allowed data;
- admin sees broader details through admin interface;
- object-level access control is preserved;
- frontend empty states are clear.

## 7. Stage 12.3 course and enrollment workflow

Goal:

- improve course catalog and course detail pages;
- define enrollment statuses;
- improve admin enrollment review;
- keep public catalog usable without authentication where intended.

Acceptance criteria:

- catalog loads correctly;
- course detail has clear state;
- enrollment action is protected;
- admin can review enrollments;
- tests cover basic access rules.

## 8. Stage 12.4 document and QR verification workflow

Goal:

- stabilize document generation;
- improve document status display;
- keep QR verification public but safe;
- preserve document authenticity checks.

Acceptance criteria:

- generated document metadata is visible;
- QR verification endpoint/page works;
- invalid verification codes are handled safely;
- document data is not leaked beyond intended fields.

## 9. Stage 12.5 admin moderation and audit workflow

Goal:

- improve admin operational workflows;
- make audit events easier to inspect;
- improve forms and detail panels;
- keep RBAC strict.

Acceptance criteria:

- admin pages remain accessible only to allowed roles;
- forms show validation errors clearly;
- audit page remains read-only unless explicitly changed;
- tests cover critical admin access paths.

## 10. Stage 12.6 UX/UI improvements

Goal:

- improve navigation consistency;
- improve loading states;
- improve error messages;
- improve empty states;
- keep frontend API error handling safe.

Acceptance criteria:

- no raw backend error objects are rendered;
- frontend guard remains green;
- direct routes remain supported;
- build remains green.

## 11. Stage 12.7 import/export and reporting

Goal:

- define safe import/export requirements;
- avoid implementing destructive imports without validation;
- keep exported data scoped by role.

Acceptance criteria:

- import format is documented before implementation;
- export endpoints are access-controlled;
- large operations are tested or guarded;
- no secrets or internal configs are exported.

## 12. Stage 12 safety rules

Forbidden without a separate accepted plan:

- destructive production database changes;
- production volume deletion;
- docker compose down -v on production;
- exposing internal ports publicly;
- committing production secrets;
- bypassing CI before release;
- broad unrelated rewrites;
- changing server-only docker-compose.override.yml in git.

## 13. Stage 12 local quality gate

Before every Stage 12 merge, run:

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

## 14. Stage 12 acceptance criteria

Stage 12 roadmap is accepted when:

- this document exists;
- this document has a CI guard;
- priorities are documented;
- safety rules are documented;
- local quality gate is documented;
- no production runtime change is made by this roadmap step.

## 15. Stage 12 roadmap server check result - 2026-05-27

Status: accepted

Stage 12 product roadmap was checked on the production server and accepted.

Accepted evidence:

- production git head after sync: 33945ad;
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
- stage12_roadmap_server_check=passed;
- production_runtime_changed=no.

Accepted production report:

- /opt/obrportal/tmp/stage_12_0_1_roadmap_server_check_20260527151954.txt
