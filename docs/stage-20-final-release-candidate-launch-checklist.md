# Stage 20 - Final release candidate and production launch checklist

## 1. Baseline - 2026-05-30

Goal: start Stage 20 after completing Stage 19 production security/secrets hardening.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 17 production deployment readiness is complete;
- Stage 18 production runbook/operator handoff is complete;
- Stage 19 production security/secrets hardening is complete;
- Stage 19 final tag is expected: `v0.1.0-stage19-production-security-secrets-hardening-complete`;
- current git head at Stage 20 baseline creation: `8e205d3`.

Stage 20 purpose:
- prepare final release candidate checklist;
- verify all accepted stage guards before launch;
- define final production launch checklist;
- define final smoke and security confirmation;
- define final release tag procedure;
- document known non-blocking warnings;
- avoid runtime changes until final release candidate acceptance.

Planned Stage 20 scope:
1. Release candidate baseline:
   - accepted stages/tags summary;
   - required docs and guards summary;
   - required final checks before launch.

2. Final launch checklist:
   - clean working tree;
   - synchronized `develop` and `main`;
   - green GitHub Actions;
   - final local guards;
   - backup confirmation;
   - production `.env` private confirmation;
   - service health confirmation;
   - smoke confirmation.

3. Final release candidate acceptance:
   - no runtime changes;
   - no database migrations;
   - no secret exposure;
   - final tag after acceptance.

Out of scope for Stage 20 baseline:
- no database migrations;
- no backend API contract changes;
- no frontend UI feature changes;
- no RBAC changes;
- no destructive bulk actions;
- no real secret rotation inside git;
- no production deployment command execution without explicit confirmation.

Safety notes:
- This baseline creates documentation and a diagnostic guard only.
- Runtime code is not changed.
- Secrets must not be printed.
- `.env` must stay uncommitted.
- `stage20_final_release_candidate_baseline=yes`.

Verification markers:
- `Stage 20 final release candidate launch checklist baseline - 2026-05-30`
- `stage20_final_release_candidate_baseline=yes`
- `stage20_runtime_changed=no`
- `stage20_depends_on_stage14_complete=yes`
- `stage20_depends_on_stage15_complete=yes`
- `stage20_depends_on_stage16_complete=yes`
- `stage20_depends_on_stage17_complete=yes`
- `stage20_depends_on_stage18_complete=yes`
- `stage20_depends_on_stage19_complete=yes`

## 2. Release candidate summary - 2026-05-30

Goal: record final release candidate scope before production launch checklist acceptance.

Current git head before release candidate summary: `612ff7c`.

Accepted release candidate chain:
- Stage 14: documents/certificates/verification complete;
- Stage 15: admin UX/operator workflow complete;
- Stage 16: release readiness/regression complete;
- Stage 17: production deployment readiness complete;
- Stage 18: production runbook/operator handoff complete;
- Stage 19: production security/secrets hardening complete;
- Stage 20: final release candidate/launch checklist in progress.

Accepted final tags:
- `v0.1.0-stage14-documents-verification-complete`;
- `v0.1.0-stage15-admin-ux-operator-workflow-complete`;
- `v0.1.0-stage16-release-readiness-complete`;
- `v0.1.0-stage17-production-deployment-readiness-complete`;
- `v0.1.0-stage18-production-runbook-operator-handoff-complete`;
- `v0.1.0-stage19-production-security-secrets-hardening-complete`.

Release candidate includes:
- document/certificate generation and verification acceptance;
- admin/operator workflow acceptance;
- full regression/readiness acceptance;
- deployment readiness acceptance;
- runbook/operator handoff acceptance;
- security/secrets hardening acceptance;
- final launch checklist baseline.

Release candidate excludes:
- unapproved runtime code changes;
- unapproved database migrations;
- unapproved RBAC changes;
- production `.env` or real secret values;
- destructive production actions without explicit confirmation.

Required final launch confirmations:
- working tree is clean;
- `develop` and `main` are synchronized;
- GitHub Actions are green;
- Stage 20 guard passes;
- Stage 19 guard passes;
- Stage 18 guard passes;
- Stage 17 guard passes;
- Stage 16 guard passes;
- Stage 15 guard passes;
- Stage 14 guard passes;
- text encoding guard passes;
- source BOM guard passes.

Known non-blocking warnings:
- frontend chunk-size warning remains non-blocking;
- backend pytest third-party deprecation warnings remain non-blocking;
- Docker `COMMAND` column console-encoding artifacts remain non-blocking.

Safety notes:
- This checkpoint documents release candidate summary only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage20_release_candidate_summary_recorded=yes`.

Verification markers:
- `Stage 20.1 release candidate summary - 2026-05-30`
- `stage20_release_candidate_summary_recorded=yes`
- `stage20_accepted_stage_chain_recorded=yes`
- `stage20_accepted_final_tags_recorded=yes`
- `stage20_release_candidate_scope_recorded=yes`
- `stage20_required_final_confirmations_recorded=yes`

## 3. Final production launch checklist - 2026-05-30

Goal: define the final production launch checklist for the release candidate.

Current git head before final production launch checklist: `2b217f5`.

Pre-launch repository checks:
- working tree is clean;
- `develop` and `main` are synchronized;
- final accepted Stage 19 tag is present;
- GitHub Actions are green for `develop` and `main`;
- no untracked release/smoke/debug artifacts are present.

Pre-launch guard checks:
- Stage 20 guard passes;
- Stage 19 guard passes;
- Stage 18 guard passes;
- Stage 17 guard passes;
- Stage 16 guard passes;
- Stage 15 guard passes;
- Stage 14 guard passes;
- text encoding guard passes;
- source BOM guard passes.

Pre-launch deployment checks:
- production `.env` exists privately on the target host;
- production `.env` is not committed and is not printed;
- backup destination is available;
- PostgreSQL backup is created before launch;
- MinIO/object storage backup is created if production documents exist;
- current production commit/tag is recorded before update.

Pre-launch service checks:
- backend service starts successfully;
- frontend service starts successfully;
- PostgreSQL readiness check passes;
- Redis ping returns `PONG`;
- MinIO health endpoint returns success;
- reverse proxy / domain routing is verified if used.

Post-launch smoke checks:
- frontend home page opens;
- catalog page opens;
- course detail page opens;
- admin login works;
- learner login works;
- account summary/courses/documents paths work;
- admin dashboard opens;
- admin users/organizations/courses/enrollments/documents pages open;
- document download works for allowed users;
- public document verification works;
- forbidden/unauthorized paths return controlled safe responses.

Launch acceptance rules:
- launch is blocked if any required guard fails;
- launch is blocked if real secrets are printed or committed;
- launch is blocked if backup is missing when production data exists;
- launch is blocked if document verification smoke fails;
- launch is blocked if rollback path is not available.

Rollback readiness:
- previous known-good commit/tag is recorded;
- database restore procedure is available;
- object storage restore procedure is available if documents exist;
- `.env` restore path is available if config changed;
- smoke checklist must be rerun after rollback.

Safety notes:
- This checkpoint documents final launch checklist only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage20_final_launch_checklist_recorded=yes`.

Verification markers:
- `Stage 20.2 final production launch checklist - 2026-05-30`
- `stage20_final_launch_checklist_recorded=yes`
- `stage20_pre_launch_repo_checks_defined=yes`
- `stage20_pre_launch_guard_checks_defined=yes`
- `stage20_pre_launch_deployment_checks_defined=yes`
- `stage20_pre_launch_service_checks_defined=yes`
- `stage20_post_launch_smoke_checks_defined=yes`
- `stage20_rollback_readiness_defined=yes`
