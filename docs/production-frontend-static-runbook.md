# Production frontend static serving runbook

Status: accepted
Stage: 10.12
Production domain: portal.rcdo02.ru

## 1. Purpose

This runbook describes the controlled switch from Vite dev frontend server to static nginx frontend serving for production.

The default docker-compose.yml remains development-oriented and must not be changed for local dev or CI.

## 2. Current production issue

Current production frontend can run through Vite dev server.

That is acceptable for MVP smoke, but not ideal for production because it serves source-based dev runtime, keeps development volume mounts, relies on Vite dev server, and is not the intended final static delivery model.

## 3. Target production state

Production frontend should build React/Vite app into dist, serve static files through nginx, expose internal container port 5173, keep SPA fallback to index.html, keep API calls relative to the same origin, keep Caddy as the public HTTPS entrypoint, and not expose backend, database, redis or minio publicly.

## 4. Repository artifacts

Required committed files:

- frontend/Dockerfile.prod
- frontend/nginx.conf
- scripts/check_frontend_static_serving.py

Expected local validation:

- python scripts/check_frontend_static_serving.py
- docker build -f frontend/Dockerfile.prod -t obrportal-frontend-static:test ./frontend
- static container returns 200 for /healthz, /, /login, /admin, /catalog

## 5. Server-only override template

The following file is server-only and must not be committed:

/opt/obrportal/docker-compose.override.yml

Required frontend override content:

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    image: obrportal-frontend-static:prod
    env_file:
      - .env
    ports:
      - "127.0.0.1:5173:5173"
    depends_on:
      - backend
    volumes: []
    command: null

## 6. Pre-switch checks

Before switching:

- production git worktree is clean except allowed server-only files
- .env is present but not printed
- Caddy is active
- current /health and /api/v1/ready are green
- production admin login works
- backup-after-init exists or the current accepted backup state is documented

## 7. Switch procedure

On the server:

- cd /opt/obrportal
- backup current docker-compose.override.yml if it exists
- write the server-only frontend override
- docker compose build frontend
- docker compose up -d frontend

## 8. Post-switch smoke

Required checks:

- curl -fsS http://127.0.0.1:5173/healthz
- curl -fsS http://127.0.0.1:5173/login
- curl -fsS http://127.0.0.1:8000/api/v1/ready
- curl -kfsS https://portal.rcdo02.ru/health
- curl -kfsS https://portal.rcdo02.ru/api/v1/ready
- curl -kfsS https://portal.rcdo02.ru/login
- curl -kfsS https://portal.rcdo02.ru/admin

Browser checks:

- open https://portal.rcdo02.ru
- login as real production admin
- open /admin
- verify health: ok, ready: ok, authenticated, admin api: loaded

## 9. Rollback

If static frontend switch fails:

- restore previous docker-compose.override.yml backup
- docker compose up -d --build frontend

If there was no previous override backup, remove only the frontend override section and return to the previously accepted production state.

Do not run:

- docker compose down -v
- volume deletion
- database restore
- MinIO restore

## 10. Acceptance criteria

The switch is accepted only when nginx static frontend container is running, /healthz returns ok, public /login and /admin return frontend HTML, backend /api/v1/ready remains green, browser admin login works, secrets are not printed, Caddy remains public HTTPS entrypoint, and backend/database/redis/minio are not exposed publicly.

## 11. Production switch result - 2026-05-26

Status: accepted

Production frontend was switched from Vite dev server to static nginx frontend.

Accepted evidence:

- production git head: 07aa32c;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend container health: healthy;
- local /healthz returned ok;
- local /, /login, /admin, /catalog returned HTTP 200;
- public /, /login, /admin, /catalog returned HTTP 200;
- public /health returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- dependencies were not recreated during the successful switch;
- secrets_printed=no;
- static_frontend_enabled=yes.

Accepted production report:

- /opt/obrportal/tmp/stage_10_12_4_static_frontend_final_smoke_20260526165019.txt

Rollback backup retained on server:

- /opt/obrportal/tmp/docker-compose.override.yml.backup-static-nodeps-20260526164845

## 12. Autostart persistence result - 2026-05-26

Status: accepted

Production static frontend persistence was verified and accepted.

Accepted evidence:

- production git head: 113cb89;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- postgres restart policy: unless-stopped;
- redis restart policy: unless-stopped;
- minio restart policy: unless-stopped;
- backend restart policy: unless-stopped;
- Docker systemd service: enabled and active;
- Caddy systemd service: enabled and active;
- local /healthz returned ok;
- local /login and /admin returned HTTP 200;
- public /login and /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- static_frontend_persistent=yes;
- restart_policy_applied=yes;
- static_frontend_stable=yes.

Accepted production reports:

- /opt/obrportal/tmp/stage_10_13_1_static_frontend_autostart_persistence_20260526165829.txt
- /opt/obrportal/tmp/stage_10_13_2_static_frontend_stable_health_20260526165955.txt

Rollback backup retained on server:

- /opt/obrportal/tmp/docker-compose.override.yml.backup-autostart-20260526165829

## 13. Controlled restart verification result - 2026-05-27

Status: accepted

Controlled production container restart verification was completed and accepted.

Scope:

- postgres restart;
- redis restart;
- minio restart;
- backend restart;
- frontend restart.

Accepted evidence:

- production git head during restart verification: 113cb89;
- frontend image after restart: obrportal-frontend-static:prod;
- frontend command after restart: nginx -g daemon off;
- frontend health after stable check: healthy;
- frontend restart policy: unless-stopped;
- postgres restart policy: unless-stopped;
- redis restart policy: unless-stopped;
- minio restart policy: unless-stopped;
- backend restart policy: unless-stopped;
- local /healthz returned ok;
- local /login and /admin returned HTTP 200;
- local /api/v1/ready returned database=ok, redis=ok, storage=ok;
- public /login and /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- controlled_restart_verified=yes;
- static_frontend_after_restart=yes;
- controlled_restart_stable=yes;
- static_frontend_healthy_after_restart=yes;
- secrets_printed=no.

Accepted production reports:

- /opt/obrportal/tmp/stage_10_14_1_controlled_container_restart_20260527130633.txt
- /opt/obrportal/tmp/stage_10_14_2_controlled_restart_stable_health_20260527130858.txt

## 14. Production public surface audit result - 2026-05-27

Status: accepted

Production public surface audit was completed and accepted.

Accepted external surface from client:

- 22/tcp SSH: open;
- 80/tcp HTTP/Caddy: open;
- 443/tcp HTTPS/Caddy: open;
- 5173/tcp frontend internal: closed;
- 8000/tcp backend internal: closed;
- 5432/tcp Postgres: closed;
- 6379/tcp Redis: closed;
- 9000/tcp MinIO API: closed;
- 9001/tcp MinIO console: closed.

Accepted server-side evidence:

- Docker Compose published ports are bound to 127.0.0.1 only;
- frontend port 5173 is bound to 127.0.0.1 only;
- backend port 8000 is bound to 127.0.0.1 only;
- Postgres port 5432 is bound to 127.0.0.1 only;
- Redis port 6379 is bound to 127.0.0.1 only;
- MinIO ports 9000 and 9001 are bound to 127.0.0.1 only;
- Caddy listens publicly on 80/tcp and 443/tcp;
- SSH listens publicly on 22/tcp;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- restart policy for postgres, redis, minio, backend and frontend: unless-stopped;
- local /healthz returned ok;
- public /, /login and /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- compose_ports_localhost_only=yes;
- external_internal_ports_closed=yes;
- public_surface_audit_server_side=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_10_15_1_public_surface_audit_20260527132138.txt

## 15. Post-hardening production backup result - 2026-05-27

Status: accepted

Post-hardening production backup was completed and accepted after static frontend hardening, controlled restart verification and public surface audit.

Accepted evidence:

- production git head during backup: c4caf9f;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- backend /api/v1/ready returned database=ok, redis=ok, storage=ok before backup;
- backup directory was created with chmod 700;
- PostgreSQL custom-format dump was created;
- PostgreSQL dump checksum file was created;
- PostgreSQL dump checksum verification returned OK;
- server-only docker-compose.override.yml was copied;
- resolved Docker Compose config was saved;
- Docker Compose ps output was saved;
- Docker images list was saved;
- backup metadata was saved without secrets;
- post-backup /healthz returned ok;
- post-backup public /login returned HTTP 200;
- post-backup public /admin returned HTTP 200;
- post-backup public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- post_hardening_backup_created=yes.

Accepted backup directory:

- /opt/obrportal/backups/post-hardening-20260527-132749

Accepted production report:

- /opt/obrportal/tmp/stage_10_16_1_post_hardening_backup_20260527132749.txt
