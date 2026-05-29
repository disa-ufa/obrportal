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
