# Stage 15 Admin UX / operator workflow

Status: in progress
Stage: 15
Project: ObrPortal
Baseline tag: v0.1.0-stage14-documents-verification-complete
Parent roadmap: docs/project-roadmap-after-stage9.md

## 1. Purpose

Stage 15 improves the admin panel so real operators can work with the system daily without direct database access or developer assistance.

The goal is to make common administrative work predictable, visible and safe:
- see priority worklists;
- filter users, organizations, courses and enrollments;
- process enrollments/documents faster;
- review audit events conveniently;
- understand API/backend errors in operator-friendly language.

This baseline step is documentation-only and guard-only.

## 2. Accepted baseline

Stage 15 starts from the accepted Stage 14 checkpoint:

- final Stage 14 tag: `v0.1.0-stage14-documents-verification-complete`;
- final Stage 14 acceptance commit: `4f9bc18`;
- Stage 14 Documents / certificates / verification is accepted;
- document generation, verification and account/admin document surfaces are stable enough for the next UX layer.

Existing admin foundation:
- admin shell and navigation exist;
- dashboard page exists;
- users page exists;
- organizations page exists;
- courses page exists;
- enrollments page exists;
- documents page exists;
- audit page exists;
- RBAC-protected admin routes exist.

## 3. Stage 15 scope

Stage 15 scope:
- dashboard worklists;
- user filters;
- organization filters;
- course filters;
- enrollment worklists;
- bulk actions;
- audit view;
- operator-friendly error messages.

## 4. MVP operator flow

MVP operator flow:

1. Operator signs in with admin permissions.
2. Operator opens admin dashboard.
3. Operator sees worklists and counters requiring action.
4. Operator filters users, organizations, courses and enrollments.
5. Operator opens detail cards without losing list context.
6. Operator performs common actions with clear confirmations.
7. Operator sees friendly error messages instead of raw API/backend details.
8. Operator can review audit events for recent administrative changes.

## 5. Data and API expectations

Stage 15 may require backend/frontend hardening for:
- stable filtering query parameters;
- predictable pagination and sorting where needed;
- action-required counters;
- enrollment/document/admin worklists;
- safe bulk actions with explicit confirmation;
- consistent error shape consumption on frontend;
- audit event display improvements.

All admin UX improvements must preserve RBAC and object-level authorization.

## 6. Frontend expectations

Stage 15 frontend should provide:
- clearer dashboard cards and worklists;
- useful empty/loading/error states;
- preserved filters after detail actions where practical;
- consistent filter controls;
- clear action buttons and confirmations;
- readable audit rows;
- friendly Russian error messages for common operator cases.

## 7. Safety rules

Stage 15 must not:
- weaken authentication, authorization or RBAC;
- expose private learner documents or another user's data;
- add destructive bulk actions without confirmation and tests;
- change production secrets;
- print tokens or environment values;
- change server-local `docker-compose.override.yml`;
- commit generated files from `tmp/`, `dist/`, storage or backups;
- introduce database migrations without explicit migration/rollback notes;
- bypass CI/local quality gates.

## 8. Baseline acceptance criteria

Stage 15 baseline is accepted when:
- this document exists;
- the Stage 15 guard exists;
- the guard checks the post-Stage 9 roadmap;
- the guard checks Stage 14 final acceptance;
- the guard checks current admin UX anchor files;
- encoding and BOM guards pass;
- no runtime files are changed by the baseline step.

## 9. Local quality gate

Before merging the Stage 15 baseline, run:
- `python scripts/check_stage15_admin_ux_operator_workflow.py`;
- `python scripts/check_stage14_documents_certificates_verification.py`;
- `python scripts/check_stage13_learning_flow.py`;
- `python scripts/check_project_roadmap_after_stage9.py`;
- `python scripts/check_ci_local_gate.py`;
- `python scripts/check_text_encoding.py`;
- `python scripts/check_source_bom.py`.

Before merging Stage 15 runtime implementation, additionally run:
- `docker compose exec frontend npm run build`;
- `docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q`.

## 10. Verification markers

- `Stage 15 Admin UX / operator workflow`
- `Stage 15 baseline`
- `v0.1.0-stage14-documents-verification-complete`
- `dashboard worklists`
- `user filters`
- `organization filters`
- `course filters`
- `enrollment worklists`
- `bulk actions`
- `audit view`
- `operator-friendly error messages`
- `admin_ux_runtime_changed=no`
- `secrets_printed=no`
