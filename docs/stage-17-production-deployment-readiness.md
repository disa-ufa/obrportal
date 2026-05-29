# Stage 17 - Production deployment readiness / deployment verification

## 1. Baseline - 2026-05-29

Goal: start Stage 17 after completing Stage 16 release readiness.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 16 full local regression passed;
- Stage 16 final tag is expected: `v0.1.0-stage16-release-readiness-complete`;
- current git head at Stage 17 baseline creation: `9403881`.

Stage 17 purpose:
- verify production deployment readiness;
- document repeatable deployment procedure;
- verify Docker Compose/service health;
- verify environment variables and secret hygiene;
- define production smoke checks;
- define backup/restore and rollback checklist;
- avoid runtime changes until deployment readiness baseline is accepted.

Planned Stage 17 scope:
1. Deployment inventory:
   - Docker Compose services;
   - backend/frontend/postgres/redis/minio health;
   - exposed ports;
   - required environment variables;
   - `.env.example` completeness.

2. Production smoke:
   - backend health/API availability;
   - frontend availability;
   - auth login path;
   - public catalog path;
   - account path;
   - admin path;
   - document verification path.

3. Data safety:
   - backup checklist;
   - restore checklist;
   - migration safety;
   - no destructive deployment commands without explicit confirmation.

4. Release operations:
   - clean working tree;
   - synchronized `main` and `develop`;
   - green CI;
   - final tag after acceptance;
   - rollback notes.

Out of scope for Stage 17 baseline:
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
- `stage17_production_deployment_readiness_baseline=yes`.

Verification markers:
- `Stage 17 production deployment readiness baseline - 2026-05-29`
- `stage17_production_deployment_readiness_baseline=yes`
- `stage17_runtime_changed=no`
- `stage17_depends_on_stage14_complete=yes`
- `stage17_depends_on_stage15_complete=yes`
- `stage17_depends_on_stage16_complete=yes`
