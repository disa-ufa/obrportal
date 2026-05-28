# Stage 12.7 Import/export and reporting

Status: in progress
Stage: 12.7
Project: ObrPortal
Baseline tag: v0.1.0-stage12-6-ux-navigation-empty-states

## 1. Purpose

Stage 12.7 defines safe import, export and reporting requirements for ObrPortal.

This baseline step is documentation-only and guard-only.

No backend runtime code, frontend runtime code, database migrations, production configuration or API contract changes are introduced by this baseline step.

## 2. Accepted input baseline

Accepted before Stage 12.7:

- Stage 12.1 learner account workflow is accepted;
- Stage 12.2 catalog learner workflow is accepted;
- Stage 12.3 course detail learner workflow is accepted;
- Stage 12.4 document verification workflow is accepted;
- Stage 12.5 admin moderation and audit workflow is accepted;
- Stage 12.6 UX navigation and empty states is accepted;
- production deploy for Stage 12.6 was recorded;
- production internal ports remain private;
- frontend build remains green;
- text encoding and BOM guards remain green.

## 3. Product goal

Goal:

- define safe import/export requirements;
- avoid destructive imports without validation;
- keep exported data scoped by role;
- prepare reporting surfaces without leaking secrets, internal configs or unauthorized personal data.

## 4. Safety principles

Stage 12.7 must follow these principles:

- exports must be access-controlled;
- exports must be role-scoped;
- exports must not include secrets or internal configuration values;
- imports must have validation before write operations;
- destructive imports are forbidden without a separate accepted plan;
- large operations must be guarded;
- admin-only reports must stay admin-only;
- organization-scoped reports must not leak other organizations;
- audit data remains read-only unless a separate accepted checkpoint changes it.

## 5. Export candidates

Safe export candidates to evaluate:

- users list export for admin role only;
- organizations list export for admin role only;
- groups list export with organization scope;
- enrollments report with status filters;
- course catalog report;
- document metadata report without raw binary leakage;
- audit summary export as read-only administrative evidence.

## 6. Import candidates

Safe import candidates to evaluate:

- users import template;
- organizations import template;
- groups import template;
- enrollments import template.

Import rules:

- first implementation must be dry-run or validation-first;
- row-level validation errors must be visible before writing;
- duplicate handling must be explicit;
- partial success rules must be documented before implementation;
- production destructive import is forbidden by default.

## 7. Reporting candidates

Safe reporting candidates to evaluate:

- admin operational summary;
- learner enrollment progress summary;
- organization activity summary;
- document generation and verification summary;
- audit inspection summary.

Reports must not expose data beyond the current user's role and object-level permissions.

## 8. Implementation sequence

Recommended sequence:

1. Stage 12.7 baseline document and guard;
2. export API contract review;
3. read-only export for one low-risk entity;
4. frontend export UX with clear loading, empty and error states;
5. import template documentation;
6. import dry-run validation;
7. reporting summary UX;
8. production deploy record and final Stage 12.7 tag.

## 9. Forbidden changes in the baseline step

Forbidden in this baseline step:

- database migrations;
- backend API contract changes;
- frontend runtime changes;
- production docker-compose override changes;
- authentication weakening;
- RBAC weakening;
- object-level access weakening;
- exposing internal ports publicly;
- committing secrets;
- printing production secrets;
- broad unrelated refactoring.

## 10. Acceptance criteria

Stage 12.7 baseline is accepted when:

- this document exists;
- the Stage 12.7 guard exists;
- the guard checks roadmap, previous Stage 12.6 baseline and this document;
- the guard confirms safety markers;
- encoding and BOM guards pass;
- no runtime code changes are required for the baseline step.

## 11. Local quality gate

Before merging Stage 12.7 baseline, run:

- python scripts/check_stage12_7_import_export_reporting.py;
- python scripts/check_stage12_6_ux_ui_navigation_empty_states.py;
- python scripts/check_stage12_product_roadmap.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py.

## 12. Baseline verification result

Status: pending local verification.

Expected result:

- stage 12.7 import/export and reporting diagnostics passed;
- secrets_printed=no;
- runtime_changed=no;

## 13. Stage 12.7 admin users CSV export - 2026-05-28

Goal: add a low-risk frontend-only CSV export for the currently visible admin users list.

Scope:

- exports only the filtered users already visible to the signed-in admin;
- does not add backend API endpoints;
- does not change authentication, RBAC or object-level access;
- does not add database migrations;
- does not export secrets, internal configs or binary files;
- uses UTF-8 BOM and semicolon delimiter for safer spreadsheet opening;
- keeps export disabled when the current filtered list is empty.

Recorded frontend markers:

- `admin-users-export-summary`;
- `admin-users-export-csv-button`;
- `obrportal-admin-users`;
- `downloadCsvFile`;
- `buildDatedCsvFilename`.

Runtime impact:

- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- database_migrations_added=no;
- api_contract_changed=no.

## 14. Stage 12.7 admin users CSV export production deploy - 2026-05-28

Production deploy result: passed.

Deployed production git head:

- `203832d` — `feat: add stage 12.7 admin users CSV export`.

Production verification:

- backend container is up;
- frontend container is up and healthy;
- local backend `/health` returns `status=ok`;
- local backend `/api/v1/ready` returns `status=ok`, `database=ok`, `redis=ok`, `storage=ok`;
- local frontend returns HTTP 200;
- public `/login` returns HTTP 200;
- public `/admin` returns HTTP 200;
- public `/api/v1/ready` returns `status=ok`, `database=ok`, `redis=ok`, `storage=ok`.

Operational notes:

- first backend health checks immediately after container recreation returned transient connection errors;
- after backend startup completed, local and public health checks passed;
- no database migrations were added;
- no backend API contract changes were added;
- backend runtime behavior was not changed by the CSV export feature;
- frontend runtime changed intentionally for admin users CSV export;
- secrets were not printed.

Deployment markers:

- `production git head: 203832d`;
- `stage12_7_admin_users_csv_export_production_deploy=passed`;
- `frontend_runtime_changed=yes`;
- `backend_runtime_changed=no`;
- `database_migrations_added=no`;
- `api_contract_changed=no`.

## 14. Stage 12.7 admin organizations CSV export - 2026-05-28

Goal: add a low-risk frontend-only CSV export for the currently visible admin organizations list.

Scope:

- exports only the filtered organizations already visible to the signed-in admin;
- does not add backend API endpoints;
- does not change authentication, RBAC or object-level access;
- does not add database migrations;
- does not export secrets, internal configs or binary files;
- uses the existing UTF-8 CSV export utility;
- keeps export disabled when the current filtered list is empty.

Recorded frontend markers:

- `admin-organizations-export-summary`;
- `admin-organizations-export-csv-button`;
- `obrportal-admin-organizations`;
- `ORGANIZATION_CSV_EXPORT_COLUMNS`;
- `handleExportOrganizationsCsv`.

Runtime impact:

- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- database_migrations_added=no;
- api_contract_changed=no.

Verification commands:

- `python scripts/check_stage12_7_import_export_reporting.py`;
- `python scripts/check_stage12_6_ux_ui_navigation_empty_states.py`;
- `python scripts/check_text_encoding.py`;
- `python scripts/check_source_bom.py`;
- `docker compose exec frontend npm run build`.

Expected result:

- organization CSV export markers are present;
- Stage 12.7 guard passes;
- frontend build passes;
- secrets_printed=no.

## Stage 12.7 admin organizations CSV export production deploy - 2026-05-28

Goal: record production deployment of the admin organizations CSV export UI/runtime after successful main branch rollout.

Production deployment result:
- production git head: 07917d7
- deployed commit: `feat: add stage 12.7 admin organizations CSV export`
- server project path: `/opt/obrportal`
- branch: `main`
- frontend image was rebuilt with `docker compose up -d --build frontend`
- backend container restarted successfully as part of compose dependency resolution
- backend health endpoint returned OK
- backend ready endpoint returned OK
- local frontend smoke returned HTTP 200
- public login route returned HTTP 200
- public admin route returned HTTP 200
- public ready endpoint returned HTTP 200

Safety notes:
- No database migrations were added.
- No backend API contract changes were added in the deployment documentation step.
- No authentication or RBAC weakening was introduced.
- Existing server-local untracked paths `backups/`, `tmp/`, and `docker-compose.override.yml` were left untouched.
- Secrets were not printed.

Verification markers:
- `Stage 12.7 admin organizations CSV export production deploy - 2026-05-28`
- `production git head: 07917d7`
- `admin organizations CSV export deployed`
- `local_frontend_http=200`
- `public_login_http=200`
- `public_admin_http=200`
- `public_ready_http=200`

## 15. Stage 12.7 admin groups CSV export - 2026-05-28

Goal: add a low-risk frontend-only CSV export for the currently visible admin learning groups list.

Scope:
- `GroupsPage` exports only the already loaded and currently filtered `filteredGroups` collection.
- Export respects the current search, organization and status filters.
- Export uses the shared `downloadCsvFile` and `buildDatedCsvFilename` helpers.
- Export filename prefix is `obrportal-admin-groups`.
- No backend API contract changes were added.
- No database migrations were added.
- No authentication, RBAC or object-level access changes were added.
- No destructive imports were introduced.

CSV columns:
- `id`
- `name`
- `code`
- `organization_name`
- `organization_id`
- `is_active`
- `description`
- `created_at`
- `updated_at`

Verification markers:
- `Stage 12.7 admin groups CSV export - 2026-05-28`
- `groups list export for admin role only`
- `admin-groups-export-summary`
- `admin-groups-export-csv-button`
- `obrportal-admin-groups`
- `GROUP_CSV_EXPORT_COLUMNS`
- `handleExportGroupsCsv`

## Stage 12.7 admin groups CSV export production deploy - 2026-05-28

Goal: record production deployment of the admin groups CSV export UI/runtime after successful main branch rollout.

Production deployment result:
- production git head: 69f38ab
- deployed commit: `feat: add stage 12.7 admin groups CSV export`
- server project path: `/opt/obrportal`
- branch: `main`
- frontend image was rebuilt with `docker compose up -d --build frontend`
- backend container restarted successfully as part of compose dependency resolution
- backend health endpoint returned OK
- backend ready endpoint returned OK
- local frontend smoke returned HTTP 200
- public login route returned HTTP 200
- public admin route returned HTTP 200
- public ready endpoint returned HTTP 200

Safety notes:
- No database migrations were added.
- No backend API contract changes were added in the deployment documentation step.
- No authentication or RBAC weakening was introduced.
- Existing server-local untracked paths `backups/`, `tmp/`, and `docker-compose.override.yml` were left untouched.
- Secrets were not printed.

Verification markers:
- `Stage 12.7 admin groups CSV export production deploy - 2026-05-28`
- `production git head: 69f38ab`
- `admin groups CSV export deployed`
- `local_frontend_http=200`
- `public_login_http=200`
- `public_admin_http=200`
- `public_ready_http=200`

## 16. Stage 12.7 admin courses CSV export - 2026-05-28

Goal: add a low-risk frontend-only CSV export for the currently visible admin courses list.

Scope:
- `AdminCoursesPage` exports only the already loaded and currently visible `courses` collection.
- Export respects the current search and activity filters.
- Export includes course-level fields and already loaded module/lesson counts.
- Export uses the shared `downloadCsvFile` and `buildDatedCsvFilename` helpers.
- Export filename prefix is `obrportal-admin-courses`.
- No backend API contract changes were added.
- No database migrations were added.
- No authentication, RBAC or object-level access changes were added.
- No destructive imports were introduced.

CSV columns:
- `id`
- `slug`
- `title`
- `is_active`
- `hours`
- `format`
- `document_type`
- `modules_count`
- `lessons_count`
- `public_url`
- `description`
- `created_at`
- `updated_at`

Verification markers:
- `Stage 12.7 admin courses CSV export - 2026-05-28`
- `courses list export for admin role only`
- `admin-courses-export-summary`
- `admin-courses-export-csv-button`
- `obrportal-admin-courses`
- `COURSE_CSV_EXPORT_COLUMNS`
- `handleExportCoursesCsv`

## Stage 12.7 admin courses CSV export production deploy - 2026-05-28

Goal: record production deployment of the admin courses CSV export UI/runtime after successful main branch rollout.

Production deployment result:
- production git head: aa976e9
- deployed commit: `feat: add stage 12.7 admin courses CSV export`
- server project path: `/opt/obrportal`
- branch: `main`
- frontend image was rebuilt with `docker compose up -d --build frontend`
- backend container restarted successfully as part of compose dependency resolution
- backend health endpoint returned OK
- backend ready endpoint returned OK
- local frontend smoke returned HTTP 200
- public login route returned HTTP 200
- public admin route returned HTTP 200
- public ready endpoint returned HTTP 200

Safety notes:
- No database migrations were added.
- No backend API contract changes were added in the deployment documentation step.
- No authentication or RBAC weakening was introduced.
- Existing server-local untracked paths `backups/`, `tmp/`, and `docker-compose.override.yml` were left untouched.
- Secrets were not printed.

Verification markers:
- `Stage 12.7 admin courses CSV export production deploy - 2026-05-28`
- `production git head: aa976e9`
- `admin courses CSV export deployed`
- `local_frontend_http=200`
- `public_login_http=200`
- `public_admin_http=200`
- `public_ready_http=200`
