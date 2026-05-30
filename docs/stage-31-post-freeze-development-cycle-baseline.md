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

## 2. Release metadata cleanup - 2026-05-30

Goal: remove stale hardcoded `0.1.0-stage6` release metadata from runtime surfaces and make application version configurable.

Scope:
- backend `FastAPI(version=...)` now uses `settings.app_version`;
- backend `/health` now returns `settings.app_version`;
- `.env.example` documents `APP_VERSION`;
- frontend package metadata is advanced from `0.1.0-stage6` to `0.1.0-stage31-dev`;
- production remains on Stage 30 until a separate redeploy decision.

Safety boundary:
- no production redeploy is performed by this checkpoint;
- no database migrations are added;
- no destructive commands are required;
- no secrets are changed;
- `main` remains production/frozen until a future release decision.

Verification markers:
- `Stage 31.1 release metadata cleanup - 2026-05-30`
- `stage31_release_metadata_cleanup=yes`
- `stage31_app_version_configurable=yes`
- `stage31_health_uses_settings_app_version=yes`
- `stage31_no_stage6_runtime_metadata=yes`
- `stage31_no_production_redeploy=yes`

## 3. Local runtime metadata smoke - 2026-05-30

Goal: confirm that Stage 31.1 release metadata cleanup works in local runtime after rebuild.

Current git head before smoke evidence: `bbd4050`.

Executed local runtime smoke:
- `docker compose up -d --build backend frontend`;
- `curl.exe -i http://127.0.0.1:8000/health`;
- `curl.exe -i http://127.0.0.1:8000/api/v1/ready`;
- `curl.exe -I http://127.0.0.1:5173/`;
- `docker compose ps`;
- `git status --short`;
- `git log --oneline -7`.

Observed local runtime result:
- backend `/health` returned `200 OK`;
- backend `/health` returned `version=0.1.0-stage31-dev`;
- backend `/api/v1/ready` returned `database=ok`, `redis=ok`, `storage=ok`;
- frontend root returned `200 OK`;
- backend container was running;
- frontend container was running;
- postgres container was healthy;
- redis container was healthy;
- minio container was healthy;
- active development head was `bbd4050`;
- production branch `main` remained on Stage 30 frozen release `f8bdba6`.

Safety boundary:
- this was a local smoke check only;
- no production redeploy was performed;
- no `main` update was performed;
- no database migrations were added;
- no destructive commands were executed;
- production server remains on `v0.1.0-stage30-pre-launch-freeze-complete`.

Known non-blocking item:
- Docker emitted a transient `error reading preface from client ... file has already been close` message before successful build;
- build and containers completed successfully, so this is recorded as non-blocking.

Verification markers:
- `Stage 31.2 local runtime metadata smoke - 2026-05-30`
- `stage31_local_runtime_metadata_smoke=yes`
- `stage31_local_health_version_stage31_dev=yes`
- `stage31_local_ready_dependencies_ok=yes`
- `stage31_local_frontend_200=yes`
- `stage31_no_production_redeploy=yes`
- `stage31_main_remains_stage30=yes`
