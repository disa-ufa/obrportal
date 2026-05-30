# Stage 21 - Production launch dry-run and deployment execution preparation

## 1. Baseline - 2026-05-30

Goal: start Stage 21 after completing Stage 20 final release candidate and production launch checklist.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 17 production deployment readiness is complete;
- Stage 18 production runbook/operator handoff is complete;
- Stage 19 production security/secrets hardening is complete;
- Stage 20 final release candidate/launch checklist is complete;
- Stage 20 final tag is expected: `v0.1.0-stage20-final-release-candidate-launch-checklist-complete`;
- current git head at Stage 21 baseline creation: `b9250ac`.

Stage 21 purpose:
- prepare a safe production launch dry-run;
- verify final guards before real launch;
- verify Docker/service health readiness;
- prepare backup/restore confirmation steps;
- prepare final smoke checklist execution steps;
- prepare deployment execution commands as documentation;
- avoid real production launch without separate explicit confirmation.

Planned Stage 21 scope:
1. Dry-run baseline:
   - accepted stage chain confirmation;
   - required tags confirmation;
   - final local guard list;
   - GitHub Actions confirmation rule.

2. Deployment execution preparation:
   - pre-deploy backup checklist;
   - update/restart command plan;
   - health-check command plan;
   - post-launch smoke command plan;
   - rollback command plan.

3. Safety gate:
   - no destructive production action;
   - no production secret printing;
   - no `.env` commit;
   - no production launch without explicit confirmation;
   - no database migration unless separately approved.

Out of scope for Stage 21 baseline:
- no database migrations;
- no backend API contract changes;
- no frontend UI feature changes;
- no RBAC changes;
- no destructive bulk actions;
- no real secret rotation inside git;
- no real production deployment command execution.

Safety notes:
- This baseline creates documentation and a diagnostic guard only.
- Runtime code is not changed.
- Secrets must not be printed.
- `.env` must stay uncommitted.
- Production launch remains a separate explicit operational action.
- `stage21_production_launch_dry_run_baseline=yes`.

Verification markers:
- `Stage 21 production launch dry run deployment preparation baseline - 2026-05-30`
- `stage21_production_launch_dry_run_baseline=yes`
- `stage21_runtime_changed=no`
- `stage21_depends_on_stage14_complete=yes`
- `stage21_depends_on_stage15_complete=yes`
- `stage21_depends_on_stage16_complete=yes`
- `stage21_depends_on_stage17_complete=yes`
- `stage21_depends_on_stage18_complete=yes`
- `stage21_depends_on_stage19_complete=yes`
- `stage21_depends_on_stage20_complete=yes`
- `stage21_no_real_production_launch_without_confirmation=yes`

## 2. Dry-run guards and service health plan - 2026-05-30

Goal: define the safe dry-run guard and service health plan before real production launch.

Current git head before dry-run plan: `228d96b`.

Dry-run guard sequence:
- Stage 21 guard passes;
- Stage 20 guard passes;
- Stage 19 guard passes;
- Stage 18 guard passes;
- Stage 17 guard passes;
- Stage 16 guard passes;
- Stage 15 guard passes;
- Stage 14 guard passes;
- text encoding guard passes;
- source BOM guard passes.

Dry-run runtime checks:
- backend pytest can be run locally or in container;
- frontend build can be run locally or in container;
- Docker Compose services can be listed with `docker compose ps`;
- backend container health/logs can be inspected without printing secrets;
- frontend container health/logs can be inspected without printing secrets;
- PostgreSQL readiness can be checked without printing credentials;
- Redis ping can be checked without printing credentials;
- MinIO health can be checked without printing credentials.

Dry-run safety boundaries:
- do not run destructive database commands;
- do not run production migration commands unless separately approved;
- do not delete Docker volumes;
- do not print `.env`;
- do not commit smoke/debug logs unless sanitized;
- do not execute real production launch.

Dry-run acceptance criteria:
- all guards pass;
- working tree is clean after dry-run documentation changes are committed;
- no secrets are printed;
- no production data is modified;
- no destructive action is executed;
- service health plan is documented and ready for real launch confirmation.

Safety notes:
- This checkpoint documents dry-run guards and service health plan only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- Real production launch was not executed.
- `stage21_dry_run_guards_service_health_plan_recorded=yes`.

Verification markers:
- `Stage 21.1 dry run guards service health plan - 2026-05-30`
- `stage21_dry_run_guards_service_health_plan_recorded=yes`
- `stage21_guard_sequence_defined=yes`
- `stage21_runtime_checks_defined=yes`
- `stage21_service_health_plan_defined=yes`
- `stage21_dry_run_safety_boundaries_defined=yes`
- `stage21_dry_run_acceptance_criteria_defined=yes`

## 3. Deployment execution command plan - 2026-05-30

Goal: document deployment execution command plan for a future explicit production launch without executing it now.

Current git head before command plan: `8caa0aa`.

Pre-deploy command plan:
- confirm repository state with `git status --short`;
- confirm current branch and remote tracking with `git branch -vv`;
- confirm latest accepted tags with `git tag --list "v0.1.0-stage*"`;
- confirm Docker services with `docker compose ps`;
- confirm no local secret files are staged or committed.

Backup command plan:
- create PostgreSQL backup before production update;
- create MinIO/object storage backup if production documents exist;
- store backup artifacts outside git;
- record backup timestamp and previous known-good commit/tag;
- do not print database or object storage credentials.

Update/restart command plan:
- fetch latest repository state;
- switch to the approved release tag or approved branch;
- rebuild/recreate services only after backup confirmation;
- run migrations only if separately approved;
- restart services in controlled order;
- do not delete Docker volumes during routine launch.

Health-check command plan:
- check backend service availability;
- check frontend service availability;
- check PostgreSQL readiness;
- check Redis ping;
- check MinIO health;
- inspect logs only for non-secret diagnostics.

Post-launch smoke command plan:
- verify frontend home/catalog/course pages;
- verify auth login paths;
- verify admin dashboard and admin lists;
- verify account/course/document paths;
- verify document download for allowed users;
- verify public document verification;
- verify forbidden/unauthorized paths return safe responses.

Rollback command plan:
- stop rollout on failed health/smoke;
- return to previous known-good commit/tag;
- restore database backup if data changed;
- restore object storage backup if documents changed;
- restore private `.env` if config changed;
- rerun health and smoke checks after rollback.

Hard execution gate:
- this command plan is documentation only;
- real production launch requires a separate explicit confirmation;
- destructive commands require a separate explicit confirmation;
- production `.env` must not be printed;
- production backup artifacts must not be committed.

Safety notes:
- This checkpoint documents deployment execution command plan only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- Real production launch was not executed.
- `stage21_deployment_execution_command_plan_recorded=yes`.

Verification markers:
- `Stage 21.2 deployment execution command plan - 2026-05-30`
- `stage21_deployment_execution_command_plan_recorded=yes`
- `stage21_pre_deploy_command_plan_defined=yes`
- `stage21_backup_command_plan_defined=yes`
- `stage21_update_restart_command_plan_defined=yes`
- `stage21_health_check_command_plan_defined=yes`
- `stage21_post_launch_smoke_command_plan_defined=yes`
- `stage21_rollback_command_plan_defined=yes`
- `stage21_hard_execution_gate_defined=yes`

## 4. Final dry-run acceptance - 2026-05-30

Goal: accept Stage 21 production launch dry-run and deployment execution preparation without executing real production launch.

Current git head before final dry-run acceptance: `073c239`.

Accepted Stage 21 scope:
- Stage 21 baseline created;
- dry-run guards and service health plan recorded;
- guard sequence defined;
- runtime checks defined;
- service health plan defined;
- dry-run safety boundaries defined;
- dry-run acceptance criteria defined;
- deployment execution command plan recorded;
- pre-deploy command plan defined;
- backup command plan defined;
- update/restart command plan defined;
- health-check command plan defined;
- post-launch smoke command plan defined;
- rollback command plan defined;
- hard execution gate defined.

Accepted dry-run state:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 17 production deployment readiness is complete;
- Stage 18 production runbook/operator handoff is complete;
- Stage 19 production security/secrets hardening is complete;
- Stage 20 final release candidate/launch checklist is complete;
- Stage 21 production launch dry-run/deployment preparation is accepted for tagging;
- `develop` and `main` must be synchronized before final Stage 21 tag;
- GitHub Actions must be green on `develop` and `main` before final Stage 21 tag;
- working tree must be clean before final Stage 21 tag.

Final dry-run rules:
- real production launch was not executed;
- production launch remains a separate explicit operational action;
- no destructive command was executed;
- no production `.env` was printed;
- no backup artifact was committed;
- no database migration was added or executed by this checkpoint;
- no runtime code was changed by this checkpoint.

Known non-blocking items:
- frontend chunk-size warning remains non-blocking;
- backend pytest third-party deprecation warnings remain non-blocking;
- Docker `COMMAND` column console-encoding artifacts remain non-blocking.

Safety notes:
- This checkpoint documents final dry-run acceptance only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- Real production launch was not executed.
- `stage21_final_dry_run_accepted=yes`.

Verification markers:
- `Stage 21.3 final dry run acceptance - 2026-05-30`
- `stage21_final_dry_run_accepted=yes`
- `stage21_dry_run_health_plan_accepted=yes`
- `stage21_deployment_command_plan_accepted=yes`
- `stage21_real_launch_executed_no=yes`
- `stage21_ready_for_final_tag=yes`
