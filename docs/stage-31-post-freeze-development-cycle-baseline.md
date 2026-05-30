# Stage 31 - Post-freeze development cycle baseline

## 1. Baseline - 2026-05-30

Goal: start a new controlled development cycle after Stage 30 final pre-launch freeze and successful server redeploy.

Important boundary:
- Stage 30 frozen release is complete;
- production server is updated to `v0.1.0-stage30-pre-launch-freeze-complete`;
- production server commit is expected: `f8bdba657fde6f1bbbe21e42989f4eff9f4e8984`;
- public domain `portal.rcdo02.ru` passed smoke checks;
- backend, frontend, postgres, redis and minio are running;
- new development must not be pushed to `main` until accepted;
- new development must not be deployed to production until accepted;
- `main` remains the stable production branch;
- `develop` becomes the active development branch for the next cycle.

Current git head at Stage 31 baseline creation: `f8bdba6`.

Stage 31 purpose:
- reopen development after frozen release;
- keep production protected;
- define next-cycle development rules;
- define branch policy;
- define acceptance policy for new changes;
- define safety checks before any future production redeploy.

Post-freeze branch policy:
- `main` stays at the last accepted production/frozen release until a future release decision;
- `develop` may advance with new development;
- feature/stage branches may branch from `develop`;
- changes should be reviewed before merge;
- production redeploy requires separate explicit decision.

New development safety rules:
- no direct production changes;
- no direct edits on server as a substitute for source changes;
- no secrets committed to git;
- `.env` remains local/private;
- database migrations require explicit review;
- destructive operations require explicit confirmation;
- `docker compose down -v` remains forbidden unless explicitly approved;
- `git clean -fd` remains forbidden on production because production-local files exist.

Known production-local files:
- `/opt/obrportal/.env`;
- `/opt/obrportal/backups/`;
- `/opt/obrportal/docker-compose.override.yml`.

Accepted production checkpoint:
- tag: `v0.1.0-stage30-pre-launch-freeze-complete`;
- commit: `f8bdba657fde6f1bbbe21e42989f4eff9f4e8984`;
- public URL: `https://portal.rcdo02.ru`;
- health: `/health`;
- readiness: `/api/v1/ready`;
- public courses smoke: `/api/v1/public/courses?limit=3`.

Planned next-cycle work categories:
1. Version and release metadata cleanup:
   - update hardcoded `0.1.0-stage6` display if accepted;
   - make app version configurable or derived from env/build metadata.

2. Admin/operator UX improvements:
   - improve post-deploy admin usability;
   - refine dashboards, audit and moderation pages if needed.

3. Performance and stability:
   - investigate occasional local pytest timeout;
   - review heavy admin endpoints;
   - optimize audit/users/documents queries if needed.

4. Production operations:
   - define backup routine;
   - define restore rehearsal;
   - define monitoring checklist;
   - document restart/redeploy procedures.

5. Product backlog:
   - collect next functional requirements separately;
   - implement only after explicit approval.

Out of scope for Stage 31 baseline:
- no runtime code changes;
- no production redeploy;
- no database migrations;
- no destructive commands;
- no secrets rotation;
- no direct production modifications.

Safety notes:
- This baseline starts a new development cycle only.
- Production remains on Stage 30 frozen release.
- No deployment is performed by this checkpoint.
- No runtime code is changed by this checkpoint.
- `stage31_post_freeze_development_cycle_baseline=yes`.

Verification markers:
- `Stage 31 post freeze development cycle baseline - 2026-05-30`
- `stage31_post_freeze_development_cycle_baseline=yes`
- `stage31_production_remains_stage30=yes`
- `stage31_main_remains_production_branch=yes`
- `stage31_develop_is_active_development_branch=yes`
- `stage31_no_production_redeploy=yes`
- `stage31_no_runtime_changes=yes`
- `stage31_no_database_migrations=yes`
- `stage31_no_destructive_commands=yes`
