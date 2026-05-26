# Production frontend static serving runbook

Status: drafted
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
