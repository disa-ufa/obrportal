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

## 2. Deployment inventory - 2026-05-29

Goal: record the current deployment inventory before production deployment verification.

Current git head before deployment inventory: `d3b62b8`.

Docker Compose inventory:
- compose file: `docker-compose.yml`;
- detected services: `backend, frontend, postgres, redis, minio`;
- required service group:
  - `backend`;
  - `frontend`;
  - `postgres`;
  - `redis`;
  - `minio`.

Detected exposed ports from compose:
- no explicit host ports detected by inventory script

Environment inventory:
- example env file: `.env.example`;
- detected example keys count: `43`;
- required deployment-sensitive keys include:
  - `DATABASE_URL`;
  - `SECRET_KEY`;
  - MinIO-related settings when object storage is enabled;
  - CORS/frontend/backend URL settings when deployed outside local Docker network.

Current `.env.example` safety decision:
- `.env.example` may contain placeholders and variable names;
- `.env.example` must not contain real production secrets;
- `.env` must stay uncommitted;
- real tokens/passwords must be supplied only through deployment secrets or private `.env`.

Deployment readiness decisions:
- production deployment must verify service health after `docker compose up -d`;
- production deployment must verify backend API availability;
- production deployment must verify frontend availability;
- production deployment must verify database migrations before accepting release;
- production deployment must verify object storage availability before document download/verification acceptance.

Known local services:
- backend API: expected local port `8000`;
- frontend dev server: expected local port `5173`;
- PostgreSQL: expected local port `5432`;
- Redis: expected local port `6379`;
- MinIO API/console: expected local ports `9000` and `9001`.

Safety notes:
- This checkpoint documents deployment inventory only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage17_deployment_inventory_recorded=yes`.

Verification markers:
- `Stage 17.1 deployment inventory - 2026-05-29`
- `stage17_deployment_inventory_recorded=yes`
- `stage17_compose_services_inventory=yes`
- `stage17_env_example_inventory=yes`
- `stage17_ports_inventory=yes`
- `stage17_no_runtime_change=yes`

## 3. Docker services health inventory - 2026-05-30

Goal: record actual local Docker Compose service health before production deployment verification.

Current git head before health inventory recording: `f989205`.

Observed Docker services:
- `obrportal-backend` is up and exposes `0.0.0.0:8000->8000/tcp`;
- `obrportal-frontend` is up and exposes `0.0.0.0:5173->5173/tcp`;
- `obrportal-postgres` is up and healthy, exposes `0.0.0.0:5432->5432/tcp`;
- `obrportal-redis` is up and exposes `0.0.0.0:6379->6379/tcp`;
- `obrportal-minio` is up and healthy, exposes `0.0.0.0:9000-9001->9000-9001/tcp`.

Observed health checks:
- backend `/docs` check returned `200 OK`;
- frontend root check returned `200 OK`;
- PostgreSQL `pg_isready` returned `accepting connections`;
- Redis `redis-cli ping` returned `PONG`;
- MinIO `/minio/health/live` returned `200 OK`.

Local artifact:
- full local UTF-8 health log saved at `tmp_stage17_2_docker_services_health_utf8.txt`;
- this local log must not be committed.

Notes:
- Docker command text in `docker compose ps` may contain console-encoding artifacts in the `COMMAND` column;
- this is non-blocking because service names, statuses, ports and health checks are valid.

Safety notes:
- This checkpoint documents service health only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage17_docker_services_health_recorded=yes`.

Verification markers:
- `Stage 17.2 docker services health inventory - 2026-05-30`
- `stage17_docker_services_health_recorded=yes`
- `stage17_backend_health_ok=yes`
- `stage17_frontend_health_ok=yes`
- `stage17_postgres_health_ok=yes`
- `stage17_redis_health_ok=yes`
- `stage17_minio_health_ok=yes`
