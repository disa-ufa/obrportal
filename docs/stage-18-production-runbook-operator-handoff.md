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
