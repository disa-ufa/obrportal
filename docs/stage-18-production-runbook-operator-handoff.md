# Stage 18 - Production deployment runbook and operator handoff

## 1. Baseline - 2026-05-30

Goal: start Stage 18 after completing Stage 17 production deployment readiness.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 17 production deployment readiness is complete;
- Stage 17 final tag is expected: `v0.1.0-stage17-production-deployment-readiness-complete`;
- current git head at Stage 18 baseline creation: `1eb4643`.

Stage 18 purpose:
- prepare a repeatable production deployment runbook;
- prepare operator/admin handoff notes;
- document safe update procedure;
- document backup-before-deploy procedure;
- document post-deploy smoke procedure;
- document rollback procedure;
- avoid runtime changes until runbook baseline is accepted.

Planned Stage 18 scope:
1. Production runbook:
   - pre-deploy checks;
   - backup commands/checklist;
   - update commands/checklist;
   - service restart commands/checklist;
   - post-deploy smoke checks.

2. Operator handoff:
   - admin/operator login path;
   - dashboard/list page usage;
   - documents/certificates verification path;
   - known friendly error behavior;
   - support/debug escalation path.

3. Release artifact summary:
   - accepted stages and tags;
   - non-blocking warnings;
   - required infrastructure services;
   - final release tag procedure.

Out of scope for Stage 18 baseline:
- no database migrations;
- no backend API contract changes;
- no frontend UI feature changes;
- no RBAC changes;
- no destructive bulk actions;
- no secret/token changes.

Safety notes:
- This baseline creates documentation and a diagnostic guard only.
- Runtime code is not changed.
- Secrets must not be printed.
- `.env` must stay uncommitted.
- `stage18_production_runbook_operator_handoff_baseline=yes`.

Verification markers:
- `Stage 18 production runbook operator handoff baseline - 2026-05-30`
- `stage18_production_runbook_operator_handoff_baseline=yes`
- `stage18_runtime_changed=no`
- `stage18_depends_on_stage14_complete=yes`
- `stage18_depends_on_stage15_complete=yes`
- `stage18_depends_on_stage16_complete=yes`
- `stage18_depends_on_stage17_complete=yes`

## 2. Production runbook inventory - 2026-05-30

Goal: define the production deployment runbook structure after Stage 17 deployment readiness.

Current git head before runbook inventory: `d23c8ad`.

Runbook structure:
1. Pre-deploy checks:
   - confirm `main` and `develop` are synchronized;
   - confirm working tree is clean;
   - confirm latest accepted tag is known;
   - confirm GitHub Actions are green;
   - confirm production `.env` exists privately and is not committed;
   - confirm Docker services can be started;
   - confirm backup destination is available.

2. Backup before deploy:
   - create PostgreSQL backup before update;
   - backup MinIO/object storage if production documents exist;
   - backup production `.env` privately;
   - record current git commit/tag;
   - record current Docker service state.

3. Update procedure:
   - fetch latest git state;
   - switch to accepted branch/tag;
   - rebuild or pull images as required;
   - run migrations only if explicitly required;
   - restart services in controlled order;
   - verify service health.

4. Post-deploy smoke:
   - backend `/docs` or health endpoint returns `200 OK`;
   - frontend root returns `200 OK`;
   - auth/admin path works;
   - learner/account path works;
   - document verification path works;
   - PostgreSQL/Redis/MinIO health checks pass.

5. Rollback procedure:
   - stop deployment on failed health/smoke checks;
   - return to previous known-good tag/commit;
   - restore `.env` if deployment config changed;
   - restore database/object storage backup if data changed;
   - restart services;
   - rerun smoke checks.

Required runbook safety rules:
- no destructive command without explicit manual confirmation;
- no production volume deletion during routine deployment;
- no secret values printed in logs;
- no backup artifacts committed to git;
- no final release acceptance without smoke checks.

Safety notes:
- This checkpoint documents production runbook inventory only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage18_production_runbook_inventory_recorded=yes`.

Verification markers:
- `Stage 18.1 production runbook inventory - 2026-05-30`
- `stage18_production_runbook_inventory_recorded=yes`
- `stage18_pre_deploy_checks_defined=yes`
- `stage18_backup_before_deploy_defined=yes`
- `stage18_update_procedure_defined=yes`
- `stage18_post_deploy_smoke_defined=yes`
- `stage18_rollback_procedure_defined=yes`

## 3. Operator/admin handoff notes - 2026-05-30

Goal: define operator/admin handoff notes for day-to-day use after production deployment.

Current git head before operator handoff notes: `c3cc94d`.

Operator/admin access path:
- open frontend application URL;
- log in with an admin account;
- confirm successful redirect to admin area;
- open dashboard;
- verify key admin sections are available according to permissions.

Core admin/operator sections:
1. Dashboard:
   - use as the starting point for operational monitoring;
   - check worklists/counters;
   - follow links to users, organizations, enrollments, courses and documents.

2. Users:
   - search and filter users;
   - open user detail panel;
   - create/update users only with correct role/organization;
   - use friendly error messages for correction, not raw API errors.

3. Organizations:
   - search and filter organizations;
   - open organization detail panel;
   - create/update organization records carefully;
   - verify organization-related users and course/enrollment relations before operational changes.

4. Groups and roles/permissions:
   - verify groups before assigning learners/operators;
   - change roles/permissions only with explicit administrative intent;
   - do not weaken RBAC rules during routine operation.

5. Courses and enrollments:
   - search/filter courses and enrollments;
   - use active filters summary to confirm current list context;
   - verify enrollment status before document/certificate operations.

6. Documents and verification:
   - use documents page for document-related operations;
   - verify status and allowed download path;
   - use public verification by document number for external confirmation;
   - QR/verification block must remain available for completed documents.

Expected friendly behavior:
- validation errors should be shown as user-friendly messages;
- forbidden/unauthorized states should not expose raw technical details;
- missing records should show controlled not-found states;
- raw API exception strings must not be shown to operators.

Escalation path:
- if UI shows unexpected blank screen, capture browser console and current URL;
- if backend API fails, capture endpoint, status code and timestamp;
- if document download/verification fails, capture document number, user role and expected access path;
- if Docker service fails, collect `docker compose ps` and relevant service logs;
- never send real `.env` or secret values in support messages.

Safety notes:
- This checkpoint documents operator/admin handoff notes only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage18_operator_admin_handoff_recorded=yes`.

Verification markers:
- `Stage 18.2 operator admin handoff notes - 2026-05-30`
- `stage18_operator_admin_handoff_recorded=yes`
- `stage18_admin_access_path_defined=yes`
- `stage18_dashboard_handoff_defined=yes`
- `stage18_users_organizations_handoff_defined=yes`
- `stage18_documents_verification_handoff_defined=yes`
- `stage18_support_escalation_path_defined=yes`
