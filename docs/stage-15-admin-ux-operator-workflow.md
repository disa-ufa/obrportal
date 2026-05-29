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

## 11. Stage 15.1 admin UX inventory - 2026-05-29

Goal: record the current admin UX/operator workflow inventory before runtime UX changes.

Inventory result:
- current local git head before checkpoint: `52bfea7`;
- compact inventory report was generated at `tmp/stage15_admin_ux_inventory.txt`;
- dashboard page exists: `frontend/src/pages/DashboardPage.jsx`;
- users page exists: `frontend/src/pages/UsersPage.jsx`;
- organizations page exists: `frontend/src/pages/OrganizationsPage.jsx`;
- courses page exists: `frontend/src/pages/AdminCoursesPage.jsx`;
- enrollments page exists: `frontend/src/pages/AdminEnrollmentsPage.jsx`;
- documents page exists: `frontend/src/pages/DocumentsPage.jsx`;
- audit page exists: `frontend/src/pages/AuditPage.jsx`;
- admin route renderer exists: `frontend/src/routes/AdminPageRenderer.jsx`;
- frontend API client exists: `frontend/src/api/client.js`;
- backend admin API anchor exists: `backend/app/api/v1/admin.py`.

Decision:
- Stage 15 should improve the existing admin surfaces instead of creating a second admin UI.
- The next runtime step should focus on dashboard/worklist and filter usability first.
- Bulk actions must not be added before explicit confirmation UX and backend/frontend tests.
- No database migration is required for the inventory step.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- The inventory report in `tmp/` is a local working artifact and must not be committed.
- `admin_ux_inventory_runtime_changed=no`.

Verification markers:
- `Stage 15.1 admin UX inventory - 2026-05-29`
- `stage15_admin_ux_inventory=tmp/stage15_admin_ux_inventory.txt`
- `dashboard_page_existing=yes`
- `users_page_existing=yes`
- `organizations_page_existing=yes`
- `admin_courses_page_existing=yes`
- `admin_enrollments_page_existing=yes`
- `documents_page_existing=yes`
- `audit_page_existing=yes`
- `admin_route_renderer_existing=yes`
- `frontend_api_client_existing=yes`
- `backend_admin_api_anchor_existing=yes`
- `admin_ux_inventory_runtime_changed=no`

## 12. Stage 15.2 dashboard/worklists checkpoint - 2026-05-29

Goal: record current dashboard/worklists operator UX before deciding whether runtime dashboard changes are needed.

Checkpoint result:
- current local git head before checkpoint: `476d540`;
- compact inventory report was generated at `tmp/stage15_dashboard_worklists_inventory.txt`;
- dashboard page already contains Admin API work center metrics;
- dashboard page already contains signal cards for assignments, documents, inactive users, draft documents and revoked documents;
- dashboard page already contains `dashboard-work-tasks`;
- dashboard page already contains `dashboard-documents-task`;
- dashboard page already contains `dashboard-enrollments-task`;
- dashboard page already links worklists to filtered documents and enrollments through admin route builders;
- admin link builder utility exists: `frontend/src/utils/adminLinks.js`;
- admin work center component exists: `frontend/src/components/admin/AdminWorkCenter.jsx`.

Decision:
- Stage 15.2 accepts the existing dashboard/worklists UI as the current operator baseline.
- The next runtime step should focus on filter usability and friendly operator errors in list pages.
- No new dashboard rewrite is required before list-page UX hardening.
- No database migration is required for this checkpoint.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- The inventory report in `tmp/` is a local working artifact and must not be committed.
- `dashboard_worklists_runtime_changed=no`.

Verification markers:
- `Stage 15.2 dashboard/worklists checkpoint - 2026-05-29`
- `stage15_dashboard_worklists_inventory=tmp/stage15_dashboard_worklists_inventory.txt`
- `dashboard_work_center_existing=yes`
- `dashboard_signal_cards_existing=yes`
- `dashboard_work_tasks_existing=yes`
- `dashboard_documents_task_existing=yes`
- `dashboard_enrollments_task_existing=yes`
- `admin_link_builder_existing=yes`
- `admin_work_center_component_existing=yes`
- `dashboard_worklists_runtime_changed=no`

## 13. Stage 15.3 list pages filters/errors inventory - 2026-05-29

Goal: record current list-page filter and operator-friendly error UX before runtime hardening.

Inventory result:
- current local git head before checkpoint: `44b4712`;
- compact inventory report was generated at `tmp/stage15_list_pages_filters_errors_inventory.txt`;
- users page exists: `frontend/src/pages/UsersPage.jsx`;
- organizations page exists: `frontend/src/pages/OrganizationsPage.jsx`;
- courses page exists: `frontend/src/pages/AdminCoursesPage.jsx`;
- enrollments page exists: `frontend/src/pages/AdminEnrollmentsPage.jsx`;
- documents page exists: `frontend/src/pages/DocumentsPage.jsx`;
- audit page exists: `frontend/src/pages/AuditPage.jsx`;
- frontend API error utility exists: `frontend/src/utils/apiErrors.js`;
- admin link builder utility exists: `frontend/src/utils/adminLinks.js`;
- quick filter component exists: `frontend/src/components/admin/AdminQuickFilterButtons.jsx`;
- empty state component exists: `frontend/src/components/admin/AdminEmptyState.jsx`.

Decision:
- Stage 15 should harden existing list pages instead of replacing them.
- The next runtime step should be focused and limited to one list-page UX gap at a time.
- Priority candidates are filter persistence, visible active-filter summaries and friendly action errors.
- Bulk actions remain out of scope until confirmation UX and test coverage are explicitly added.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- The inventory report in `tmp/` is a local working artifact and must not be committed.
- `list_pages_filters_errors_runtime_changed=no`.

Verification markers:
- `Stage 15.3 list pages filters/errors inventory - 2026-05-29`
- `stage15_list_pages_filters_errors_inventory=tmp/stage15_list_pages_filters_errors_inventory.txt`
- `users_filters_errors_inventory=yes`
- `organizations_filters_errors_inventory=yes`
- `courses_filters_errors_inventory=yes`
- `enrollments_filters_errors_inventory=yes`
- `documents_filters_errors_inventory=yes`
- `audit_filters_errors_inventory=yes`
- `api_errors_utility_existing=yes`
- `admin_quick_filters_component_existing=yes`
- `admin_empty_state_component_existing=yes`
- `list_pages_filters_errors_runtime_changed=no`

## 14. Stage 15.4 enrollments active filters UX - 2026-05-29

Goal: improve list-page operator UX by making active enrollment filters visible and resettable.

Runtime change:
- added reusable component `frontend/src/components/admin/AdminActiveFiltersSummary.jsx`;
- connected active filter summary to `frontend/src/pages/AdminEnrollmentsPage.jsx`;
- visible filter chips now show search, user, course, organization, status, group and action_required filters;
- reset action reuses the existing safe `handleResetFilter` flow;
- no backend API changes were required.

Verification plan:
- Stage 15 guard must pass;
- Stage 14 guard must pass;
- text encoding guard must pass;
- source BOM guard must pass;
- frontend production build must pass.

Safety notes:
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `enrollments_active_filters_runtime_changed=yes`.

Verification markers:
- `Stage 15.4 enrollments active filters UX - 2026-05-29`
- `admin_active_filters_summary_component_added=yes`
- `admin_enrollments_active_filters_summary_added=yes`
- `admin_enrollments_active_filter_chips=yes`
- `admin_enrollments_filter_reset_reused=yes`
- `enrollments_active_filters_runtime_changed=yes`

## 15. Stage 15.5 documents active filters UX - 2026-05-29

Goal: reuse the active filters summary component on the admin documents list.

Runtime change:
- connected `AdminActiveFiltersSummary` to `frontend/src/pages/DocumentsPage.jsx`;
- visible filter chips now show search, user, enrollment, organization, status, document type and action_required filters;
- reset action reuses the existing safe `handleResetFilter` flow;
- no backend API changes were required.

Verification plan:
- Stage 15 guard must pass;
- Stage 14 guard must pass;
- text encoding guard must pass;
- source BOM guard must pass;
- frontend production build must pass.

Safety notes:
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `documents_active_filters_runtime_changed=yes`.

Verification markers:
- `Stage 15.5 documents active filters UX - 2026-05-29`
- `admin_documents_active_filters_summary_added=yes`
- `admin_documents_active_filter_chips=yes`
- `admin_documents_filter_reset_reused=yes`
- `documents_active_filters_runtime_changed=yes`

## 16. Stage 15.6 users active filters UX - 2026-05-29

Goal: reuse the active filters summary component on the admin users list.

Runtime change:
- connected `AdminActiveFiltersSummary` to `frontend/src/pages/UsersPage.jsx`;
- visible filter chips now show search, activity and role filters;
- reset action reuses the existing safe `resetFilters` flow;
- no backend API changes were required.

Verification plan:
- Stage 15 guard must pass;
- Stage 14 guard must pass;
- text encoding guard must pass;
- source BOM guard must pass;
- frontend production build must pass.

Safety notes:
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `users_active_filters_runtime_changed=yes`.

Verification markers:
- `Stage 15.6 users active filters UX - 2026-05-29`
- `admin_users_active_filters_summary_added=yes`
- `admin_users_active_filter_chips=yes`
- `admin_users_filter_reset_reused=yes`
- `users_active_filters_runtime_changed=yes`

## 17. Stage 15.7 organizations active filters UX - 2026-05-29

Goal: reuse the active filters summary component on the admin organizations list.

Runtime change:
- connected `AdminActiveFiltersSummary` to `frontend/src/pages/OrganizationsPage.jsx`;
- visible filter chips now show search and organization data-scope filters;
- reset action reuses the existing safe `resetFilters` flow;
- no backend API changes were required.

Verification plan:
- Stage 15 guard must pass;
- Stage 14 guard must pass;
- text encoding guard must pass;
- source BOM guard must pass;
- frontend production build must pass.

Safety notes:
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `organizations_active_filters_runtime_changed=yes`.

Verification markers:
- `Stage 15.7 organizations active filters UX - 2026-05-29`
- `admin_organizations_active_filters_summary_added=yes`
- `admin_organizations_active_filter_chips=yes`
- `admin_organizations_filter_reset_reused=yes`
- `organizations_active_filters_runtime_changed=yes`

## 18. Stage 15.8 courses active filters UX - 2026-05-29

Goal: reuse the active filters summary component on the admin courses list.

Runtime change:
- connected `AdminActiveFiltersSummary` to `frontend/src/pages/AdminCoursesPage.jsx`;
- visible filter chips now show search and course activity filters;
- reset action reuses the existing safe `handleResetFilter` flow;
- no backend API changes were required.

Verification plan:
- Stage 15 guard must pass;
- Stage 14 guard must pass;
- text encoding guard must pass;
- source BOM guard must pass;
- frontend production build must pass.

Safety notes:
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `courses_active_filters_runtime_changed=yes`.

Verification markers:
- `Stage 15.8 courses active filters UX - 2026-05-29`
- `admin_courses_active_filters_summary_added=yes`
- `admin_courses_active_filter_chips=yes`
- `admin_courses_filter_reset_reused=yes`
- `courses_active_filters_runtime_changed=yes`

## 19. Stage 15.9 active filters UX accepted - 2026-05-29

Goal: accept the completed active filters summary UX block for key admin list pages.

Accepted runtime scope:
- reusable active filters summary component exists: `frontend/src/components/admin/AdminActiveFiltersSummary.jsx`;
- active filters summary is connected to enrollments;
- active filters summary is connected to documents;
- active filters summary is connected to users;
- active filters summary is connected to organizations;
- active filters summary is connected to courses.

Accepted commits:
- `5468225` — enrollments active filters summary;
- `4359e6c` — documents active filters summary;
- `627600e` — users active filters summary;
- `18ebcce` — organizations active filters summary;
- `fcff77d` — courses active filters summary.

Verification result:
- Stage 15 guard passed after each runtime step;
- Stage 14 guard passed after each runtime step;
- text encoding guard passed after each runtime step;
- source BOM guard passed after each runtime step;
- frontend production build passed after each runtime step;
- current local git head before acceptance checkpoint: `fcff77d`.

Safety notes:
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `active_filters_ux_accepted=yes`.

Verification markers:
- `Stage 15.9 active filters UX accepted - 2026-05-29`
- `admin_active_filters_summary_component_accepted=yes`
- `admin_enrollments_active_filters_accepted=yes`
- `admin_documents_active_filters_accepted=yes`
- `admin_users_active_filters_accepted=yes`
- `admin_organizations_active_filters_accepted=yes`
- `admin_courses_active_filters_accepted=yes`
- `active_filters_ux_accepted=yes`

## 20. Stage 15.10 friendly operator errors inventory - 2026-05-29

Goal: record current operator-friendly API error handling before runtime hardening.

Inventory result:
- current local git head before checkpoint: `ad27bd9`;
- compact inventory report was generated at `tmp/stage15_friendly_operator_errors_inventory.txt`;
- shared API error utility exists: `frontend/src/utils/apiErrors.js`;
- admin user, organization, course, enrollment, document and audit pages exist;
- admin user and organization form/detail components exist;
- the project already contains shared messages for authentication, access denied, not found, conflict, validation and server errors.

Decision:
- Stage 15 should improve the existing shared API error utility and existing page-specific formatters.
- The next runtime step should be small and focused: strengthen `apiErrors.js` first, then reuse it from pages as needed.
- Raw backend details should not be shown directly when a safe operator-friendly message exists.
- No backend API or database migration is required for this inventory step.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- The inventory report in `tmp/` is a local working artifact and must not be committed.
- `friendly_operator_errors_inventory_runtime_changed=no`.

Verification markers:
- `Stage 15.10 friendly operator errors inventory - 2026-05-29`
- `stage15_friendly_operator_errors_inventory=tmp/stage15_friendly_operator_errors_inventory.txt`
- `api_errors_utility_inventory=yes`
- `admin_pages_error_inventory=yes`
- `admin_forms_error_inventory=yes`
- `friendly_operator_errors_inventory_runtime_changed=no`
