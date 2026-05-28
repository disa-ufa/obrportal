# Stage 12.5. Admin moderation and audit workflow

Status: in progress

Stage 12.5 focuses on admin operational workflows, moderation surfaces, audit inspection, forms and detail panels.

This stage must stay safe and incremental:

- no database migrations in the baseline documentation step;
- no API contract changes unless backend tests are added first;
- no authentication or RBAC weakening;
- no object-level access weakening;
- no audit mutation workflow unless explicitly planned;
- audit page remains read-only unless a separate accepted checkpoint changes it;
- no production config changes;
- no secrets in docs, logs, screenshots or reports;
- no broad unrelated frontend rewrites;
- every deploy must state whether frontend_runtime_changed or backend_runtime_changed.

## 1. Baseline state

Accepted baseline:

- current git head before Stage 12.5 implementation: 130c8d4;
- Stage 12.1 learner account UX polish was completed;
- tag v0.1.0-stage12-1-account-ux-polish exists;
- Stage 12.2 catalog UX polish was completed;
- tag v0.1.0-stage12-2-catalog-ux-polish exists;
- Stage 12.3 course detail UX polish was completed;
- tag v0.1.0-stage12-3-course-detail-ux-polish exists;
- Stage 12.4 document verification UX polish was completed;
- tag v0.1.0-stage12-4-document-verification-ux-polish exists;
- Stage 12 product roadmap defines Stage 12.5 as admin moderation and audit workflow;
- admin dashboard route exists;
- admin users page exists;
- admin organizations page exists;
- admin groups page exists;
- admin courses page exists;
- admin enrollments page exists;
- admin documents page exists;
- admin roles page exists;
- admin permissions page exists;
- admin audit page exists;
- direct admin routes remain supported;
- CI/local gate is green;
- text encoding guard is green;
- source BOM guard is green.

## 2. Product goal

Goal:

- make admin moderation workflows clearer;
- make review queues and operational states easier to inspect;
- make audit events easier to read and filter;
- improve validation and empty states on admin forms;
- preserve strict RBAC and object-level access rules;
- keep audit page read-only unless explicitly changed later.

## 3. Admin workflow states

Stage 12.5 must explicitly handle these admin states:

- admin opens dashboard;
- admin opens users list;
- admin opens user detail panel;
- admin opens organizations list;
- admin opens organization detail panel;
- admin opens groups list;
- admin opens courses list;
- admin opens enrollment review page;
- admin opens documents page;
- admin opens roles page;
- admin opens permissions page;
- admin opens audit page;
- admin sees loading state;
- admin sees empty state;
- admin sees validation error;
- admin sees API error;
- unauthorized user must not access admin pages.

## 4. Admin route contract

Admin routes must remain available and protected:

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

## 5. Admin pages contract

Stage 12.5 baseline covers these frontend pages:

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
- AdminPageRenderer.

## 6. Admin components contract

Stage 12.5 baseline covers these reusable admin components:

- UserDetailPanel;
- UserForm;
- OrganizationDetailPanel;
- OrganizationForm;
- RoleDetailPanel;
- RoleForm.

## 7. API client contract

Stage 12.5 starts without API changes.

Existing admin API client behavior must remain stable:

- admin users API calls remain available;
- admin organizations API calls remain available;
- admin groups API calls remain available;
- admin courses API calls remain available;
- admin enrollments API calls remain available;
- admin documents API calls remain available;
- admin roles API calls remain available;
- admin permissions API calls remain available;
- admin audit API calls remain available;
- frontend error formatting remains safe;
- raw backend error objects must not be rendered directly.

## 8. Audit safety contract

Audit workflow must keep these boundaries:

- audit page is read-only by default;
- audit entries are inspected, not mutated;
- audit filters must not expose secrets;
- audit data must stay admin-only;
- audit page must handle empty data clearly;
- audit page must handle loading and API errors safely.

## 9. First implementation target

The first safe implementation target after this baseline is frontend-only admin UX polish:

- inspect current AuditPage and admin moderation pages;
- add or improve stable data-testid markers;
- improve admin empty states where needed;
- improve validation and error-state presentation where needed;
- keep API calls unchanged;
- keep RBAC/admin smoke green;
- keep Stage 12.4 document verification guard green;
- keep Stage 12.3 course detail guard green;
- keep Stage 12.2 catalog guard green;
- keep Stage 12.1 account workflow smoke green.

## 10. Acceptance checks

Local acceptance must include:

- python scripts/check_stage12_5_admin_moderation_audit_workflow.py;
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

## 11. Production acceptance

Production acceptance must include:

- git head check;
- Stage 12.5 admin moderation and audit workflow guard passed;
- Stage 12.4 document verification workflow guard passed;
- Stage 12.3 course detail workflow guard passed;
- Stage 12.2 catalog workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12 product roadmap guard passed;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend health healthy;
- public /admin returned HTTP 200;
- public /admin/audit returned HTTP 200;
- public /admin/users returned HTTP 200;
- public /admin/enrollments returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed must be explicit;
- backend_runtime_changed must be explicit;
- RESULT=PASSED.

## 12. Safety boundaries

Do not do these inside Stage 12.5 without a separate explicit checkpoint:

- no database schema changes;
- no permission model changes;
- no auth token storage changes;
- no admin API refactor;
- no audit mutation feature;
- no destructive admin bulk actions;
- no production backend restart for frontend-only documentation changes;
- no production config changes;
- no Caddy/Nginx changes;
- no docker compose down -v.

## 13. Current checkpoint

Current checkpoint:

- Stage 12.5 admin moderation and audit workflow document created;
- Stage 12.5 admin moderation and audit workflow guard created;
- initial Stage 12.5 scope is documentation and contract only;
- implementation has not changed runtime yet;
- frontend_runtime_changed=no;
- backend_runtime_changed=no.

## 14. Stage 12.5 admin moderation and audit workflow docs sync - 2026-05-28

Status: accepted

Stage 12.5 admin moderation and audit workflow documentation and guard were synced to production and accepted.

Accepted evidence:

- production git head: 9803b47;
- Stage 12.5 admin moderation and audit workflow guard passed;
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
- Stage 12.4 document verification UX polish tag head verified: 417e65a;
- Stage 12.5 document title marker was present;
- Stage 12.5 baseline head marker was present;
- Stage 12.5 guard created marker was present;
- Stage 12.5 audit read-only marker was present;
- source marker AuditPage was present;
- source marker UsersPage was present;
- source marker AdminEnrollmentsPage was present;
- source marker DocumentsPage was present;
- admin route marker dashboard was present;
- admin route marker users was present;
- admin route marker enrollments was present;
- admin route marker audit was present;
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
- public /admin returned HTTP 200;
- public /admin/audit returned HTTP 200;
- public /admin/users returned HTTP 200;
- public /admin/enrollments returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=no;
- backend_runtime_changed=no;
- stage12_5_admin_moderation_audit_workflow_docs_sync=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_5_1_admin_moderation_audit_workflow_docs_sync_retry_20260528075808.txt

## 15. Stage 12.5 audit page service states - 2026-05-28

Status: implemented locally

Stage 12.5 adds stable frontend markers and service-state boundaries for the admin audit page.

Implementation boundaries:

- frontend-only change;
- no database migrations;
- no backend API changes;
- no audit mutation workflow;
- no RBAC weakening;
- no object-level access weakening;
- existing getAdminAuditEvents filters remain unchanged;
- existing getAdminAuditEventDetail detail loading remains unchanged;
- AuditPage remains read-only;
- audit_events are inspected, not mutated;
- frontend_runtime_changed=yes after deploy;
- backend_runtime_changed=no.

Source markers:

- admin-audit-page;
- admin-audit-unauthorized-state;
- admin-audit-readonly-notice;
- admin-audit-filters;
- admin-audit-filter-action;
- admin-audit-filter-entity-type;
- admin-audit-filter-entity-id;
- admin-audit-filter-actor-user-id;
- admin-audit-filter-limit;
- admin-audit-filter-actions;
- admin-audit-apply-filters-action;
- admin-audit-reset-filters-action;
- admin-audit-filter-error-state;
- admin-audit-quick-action-filter;
- admin-audit-quick-entity-type-filter;
- admin-audit-result-summary;
- admin-audit-loading-state;
- admin-audit-empty-state;
- admin-audit-table;
- admin-audit-row-actions;
- admin-audit-open-detail-action;
- admin-audit-detail-panel;
- admin-audit-detail-loading;
- admin-audit-detail-error;
- role="alert";
- aria-live="assertive";
- aria-live="polite".

## 16. Stage 12.5 audit page service states frontend deploy - 2026-05-28

Status: accepted

Stage 12.5 audit page service states were deployed to the production static frontend and accepted.

Accepted evidence:

- production git head: d51be52;
- Stage 12.5 admin moderation and audit workflow guard passed;
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
- Stage 12.4 document verification UX polish tag head verified: 417e65a;
- source marker admin-audit-page was present;
- source marker admin-audit-unauthorized-state was present;
- source marker admin-audit-readonly-notice was present;
- source marker admin-audit-filters was present;
- source marker admin-audit-filter-action was present;
- source marker admin-audit-filter-entity-type was present;
- source marker admin-audit-filter-entity-id was present;
- source marker admin-audit-filter-actor-user-id was present;
- source marker admin-audit-filter-limit was present;
- source marker admin-audit-filter-error-state was present;
- source marker admin-audit-quick-action-filter was present;
- source marker admin-audit-quick-entity-type-filter was present;
- source marker admin-audit-result-summary was present;
- source marker admin-audit-loading-state was present;
- source marker admin-audit-empty-state was present;
- source marker admin-audit-table was present;
- source marker admin-audit-row-actions was present;
- source marker admin-audit-open-detail-action was present;
- source marker admin-audit-detail-panel was present;
- source marker admin-audit-detail-loading was present;
- source marker admin-audit-detail-error was present;
- source marker audit_events was present;
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
- public /admin returned HTTP 200;
- public /admin/audit returned HTTP 200;
- public /admin/users returned HTTP 200;
- public /admin/enrollments returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- stage12_5_admin_audit_service_states_frontend_deploy=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_5_3_admin_audit_service_states_frontend_deploy_retry_20260528101536.txt
