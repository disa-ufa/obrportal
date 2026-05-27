# Stage 12.1 learner account workflow

Status: drafted
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
