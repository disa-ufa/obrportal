# Production operations runbook

Status: drafted
Stage: 11
Production domain: portal.rcdo02.ru
Production server: 89.127.203.70
Production hardened tag: v0.1.0-stage10-production-hardened

## 1. Purpose

This runbook defines the minimum operational baseline for maintaining ObrPortal production after Stage 10 hardening.

The production runtime checkpoint is tagged as v0.1.0-stage10-production-hardened.

## 2. Accepted production baseline

Accepted baseline:

- public entrypoint is Caddy on 80/tcp and 443/tcp;
- SSH is available on 22/tcp;
- frontend runs as static nginx image obrportal-frontend-static:prod;
- frontend command is nginx -g daemon off;
- backend, frontend, postgres, redis and minio use restart policy unless-stopped;
- internal service ports are bound to 127.0.0.1 only;
- public /login and /admin return HTTP 200;
- public /api/v1/ready returns database=ok, redis=ok, storage=ok;
- post-hardening backup exists.

## 3. Backup policy

Minimum backup scope:

- PostgreSQL custom-format dump;
- docker-compose.override.yml server-only file;
- resolved docker compose config;
- docker compose ps output;
- docker images list;
- metadata without secrets.

Required backup rules:

- do not print .env;
- do not print passwords;
- do not commit server-only override;
- do not store backup inside git history;
- keep checksum for database dump.

## 4. Restore drill policy

Restore drill must be performed in an isolated environment only.

Forbidden on production during restore drill:

- docker compose down -v;
- deleting production volumes;
- restoring dump over production database without a separate approved maintenance window;
- exposing postgres, redis, minio, backend or frontend ports publicly.

Restore drill acceptance criteria:

- backup file exists;
- checksum verifies successfully;
- dump can be inspected or restored in an isolated temporary database;
- no production data is deleted;
- no secrets are printed.

## 5. Production update policy

Allowed update procedure:

- commit and push to develop;
- wait for CI green;
- fast-forward main;
- sync server with git pull --ff-only;
- run repository guards on server;
- run alembic current and alembic heads;
- run local /api/v1/ready;
- run public /api/v1/ready;
- run public /login and /admin smoke;
- create a report in /opt/obrportal/tmp.

Forbidden update actions:

- force push to main;
- manual database schema edits;
- docker compose down -v;
- deleting volumes;
- printing .env;
- committing production secrets.

## 6. Monitoring baseline

Minimum manual monitoring checks:

- https://portal.rcdo02.ru/ returns HTTP 200;
- https://portal.rcdo02.ru/login returns HTTP 200;
- https://portal.rcdo02.ru/admin returns HTTP 200;
- https://portal.rcdo02.ru/api/v1/ready returns database=ok, redis=ok, storage=ok;
- frontend container health is healthy;
- postgres, redis and minio containers are healthy;
- Docker service is active;
- Caddy service is active.

## 7. Log and disk baseline

Minimum checks:

- docker compose ps;
- docker compose logs --tail=100 backend;
- docker compose logs --tail=100 frontend;
- df -h;
- du -sh /opt/obrportal/backups;
- du -sh /opt/obrportal/tmp.

If disk usage grows unexpectedly, old tmp reports may be archived outside the repository. Backups must not be deleted without a separate decision.

## 8. Incident response baseline

For production incident:

- do not delete volumes;
- do not run destructive cleanup;
- capture docker compose ps;
- capture backend and frontend logs;
- check /api/v1/ready locally;
- check public /api/v1/ready;
- check Caddy status;
- check disk usage;
- document exact time, symptoms and commands used.

## 9. Acceptance criteria for Stage 11 baseline

Stage 11 baseline is accepted when:

- this runbook exists;
- this runbook has a CI guard;
- backup policy is documented;
- restore drill policy is documented;
- update policy is documented;
- monitoring baseline is documented;
- incident response baseline is documented;
- no secrets are added to repository.
