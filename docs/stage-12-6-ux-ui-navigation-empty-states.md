# Stage 12.6 UX/UI navigation and empty states

Status: in progress
Stage: 12.6
Project: ObrPortal
Baseline tag: v0.1.0-stage12-5-admin-moderation-audit-workflow

## 1. Baseline state

Accepted baseline before Stage 12.6:

- Stage 12.1 learner account workflow is completed;
- Stage 12.2 catalog learner workflow is completed;
- Stage 12.3 course detail learner workflow is completed;
- Stage 12.4 document verification workflow is completed;
- Stage 12.5 admin moderation and audit workflow is completed;
- tag v0.1.0-stage12-5-admin-moderation-audit-workflow exists;
- develop, main, origin/develop and origin/main are aligned;
- production frontend uses static nginx;
- production backend health is green;
- production ready endpoint is green;
- no backend API contract change is planned for the baseline step;
- no database migration is planned for the baseline step.

## 2. Product goal

Goal:

- improve navigation consistency across public, account and admin pages;
- improve loading states;
- improve empty states;
- improve filtered empty states;
- improve validation and API error presentation;
- keep frontend API error handling safe;
- keep direct routes supported;
- keep RBAC and object-level access unchanged.

## 3. UX/UI workflow states

Stage 12.6 must explicitly handle these UX states:

- visitor opens home page;
- visitor opens catalog page;
- visitor opens course detail page;
- visitor opens login page;
- visitor opens register page;
- learner opens account page;
- visitor opens document verification page;
- admin opens dashboard page;
- admin opens direct admin routes;
- user sees loading state;
- user sees empty state;
- user sees filtered empty state;
- user sees validation error;
- user sees API error;
- unauthenticated user sees protected-route state;
- unauthorized user does not receive admin-only data.

## 4. Navigation contract

Stage 12.6 must preserve these routes and navigation paths:

- /;
- /catalog;
- /courses/:slug;
- /account;
- /login;
- /register;
- /verify-document;
- /verify/:code;
- /admin;
- /admin/dashboard;
- /admin/users;
- /admin/organizations;
- /admin/groups;
- /admin/courses;
- /admin/enrollments;
- /admin/documents;
- /admin/roles;
- /admin/permissions;
- /admin/audit.

## 5. Frontend safety contract

Stage 12.6 starts without backend API changes.

Frontend safety rules:

- raw backend error objects must not be rendered directly;
- frontend error formatting must remain centralized and safe;
- loading states must not expose secrets;
- empty states must not expose internal implementation details;
- admin-only links must not bypass RBAC;
- public pages must not expose private account/admin data;
- direct routes must remain supported;
- build must remain green.

## 6. Files in scope

Baseline UX/UI review covers these frontend areas:

- HomePage;
- CatalogPage;
- CourseDetailPage;
- AccountPage;
- AuthPage;
- RegisterPage;
- VerifyDocumentPage;
- DashboardPage;
- UsersPage;
- OrganizationsPage;
- GroupsPage;
- AdminCoursesPage;
- AdminEnrollmentsPage;
- DocumentsPage;
- RolesPage;
- PermissionsPage;
- AuditPage;
- AdminPageRenderer;
- frontend API client;
- frontend API error utilities.

## 7. First implementation target

The first safe implementation target after this baseline is frontend-only UX polish:

- inspect shared navigation and page state consistency;
- add or improve stable data-testid markers where needed;
- improve generic loading state consistency;
- improve generic empty state consistency;
- improve filtered empty state text consistency;
- improve safe API error display consistency;
- keep all existing API calls unchanged;
- keep backend runtime unchanged;
- keep database unchanged;
- keep production configs unchanged.

## 8. Acceptance checks

Local acceptance must include:

- python scripts/check_stage12_6_ux_ui_navigation_empty_states.py;
- python scripts/check_stage12_5_admin_moderation_audit_workflow.py;
- python scripts/check_stage12_4_document_verification_workflow.py;
- python scripts/check_stage12_3_course_detail_learner_workflow.py;
- python scripts/check_stage12_2_catalog_learner_workflow.py;
- python scripts/smoke_stage12_1_account_workflow.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py;
- docker compose exec frontend npm run build.

## 9. Production acceptance

Production acceptance must include:

- git head check;
- Stage 12.6 guard passed;
- Stage 12.5 guard remained green;
- Stage 12.4 guard remained green;
- Stage 12.3 guard remained green;
- Stage 12.2 guard remained green;
- Stage 12.1 smoke remained green;
- public / returned HTTP 200;
- public /catalog returned HTTP 200;
- public /login returned HTTP 200;
- public /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed must be explicit;
- backend_runtime_changed must be explicit;
- RESULT=PASSED.

## 10. Safety restrictions

Forbidden in this baseline step:

- database migrations;
- backend API contract changes;
- authentication weakening;
- RBAC weakening;
- object-level access weakening;
- exposing internal ports publicly;
- changing production docker-compose.override.yml in git;
- rendering raw backend error objects;
- broad unrelated refactoring.

## Stage 12.6 admin users loading and empty states - 2026-05-28

Goal: improve UsersPage loading, table, and empty-state observability without backend API changes, RBAC changes, authentication changes, object-level access changes, database migrations, or production docker-compose override changes.

Recorded changes:
- `UsersPage` keeps the existing users table, filters, quick filters, related links, and selected user detail workflow.
- Loading state now has stable marker `admin-users-loading-state`.
- Empty result state now has stable marker `admin-users-empty-state`.
- Non-empty table state now has stable marker `admin-users-table-state`.
- Existing `LoadingBlock`, `SmallTable`, and `getFilteredEmptyText` behavior remains in use.
- Existing admin user API client methods are unchanged.
- Secrets were not printed.
- Backend runtime was not changed.
- Database schema was not changed.

Verification markers:
- `admin-users-loading-state`
- `admin-users-empty-state`
- `admin-users-table-state`

## Stage 12.6 production deploy record - 2026-05-28

Production deployment was verified after the Stage 12.6 admin users loading and empty states polish.

Production git state:
- branch: `main`
- deployed head: `dc176d6`
- commit: `Polish stage 12.6 admin users loading and empty states`

Production verification:
- backend container was running.
- frontend container was running and healthy.
- postgres, redis, and minio were running and healthy.
- `GET /health` returned `status=ok`.
- `GET /api/v1/ready` returned `database=ok`, `redis=ok`, and `storage=ok`.
- local frontend smoke returned HTTP 200.
- public `/login` returned HTTP 200.
- public `/admin` returned HTTP 200.
- public `/api/v1/ready` returned `status=ok`.

Operational notes:
- production untracked paths `backups/`, `tmp/`, and `docker-compose.override.yml` were preserved.
- no secrets were printed.
- no database migrations were added for this UX polish step.
- no backend API contract changes were introduced.
- no RBAC, authentication, or object-level access weakening was introduced.

Verification markers:
- `Stage 12.6 production deploy record - 2026-05-28`
- `production git head: dc176d6`
- `frontend_runtime_changed=yes after deploy`
- `public_login_http=200`
- `public_admin_http=200`
- `public_ready_status=ok`
