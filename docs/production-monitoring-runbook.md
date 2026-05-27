# Production monitoring smoke runbook

Status: accepted
Stage: 11.3
Production domain: portal.rcdo02.ru
Production server: 89.127.203.70
Production hardened tag: v0.1.0-stage10-production-hardened

## 1. Purpose

This runbook defines a safe manual monitoring smoke procedure for ObrPortal production.

The monitoring smoke must check production availability without changing production data.

## 2. Monitoring scope

Minimum monitoring scope:

- public root page;
- public login page;
- public admin page;
- public API readiness endpoint;
- local frontend health endpoint;
- local backend readiness endpoint;
- Docker Compose service state;
- frontend container health;
- database, redis and storage readiness;
- Docker and Caddy systemd services;
- disk usage for root filesystem;
- backup directory size;
- tmp report directory size.

## 3. Safety rules

Monitoring must be read-only.

Forbidden monitoring actions:

- do not run docker compose down -v;
- do not delete volumes;
- do not restart containers during monitoring smoke;
- do not print .env;
- do not print passwords;
- do not print tokens;
- do not expose internal service ports publicly;
- do not commit monitoring reports containing secrets.

## 4. Public endpoint checks

Required public checks:

- https://portal.rcdo02.ru/ returns HTTP 200;
- https://portal.rcdo02.ru/login returns HTTP 200;
- https://portal.rcdo02.ru/admin returns HTTP 200;
- https://portal.rcdo02.ru/api/v1/ready returns database=ok, redis=ok, storage=ok.

Accepted result:

- public_root_http=200;
- public_login_http=200;
- public_admin_http=200;
- public_ready=ok.

## 5. Local internal checks

Required local checks from the production server:

- http://127.0.0.1:5173/healthz returns ok;
- http://127.0.0.1:8000/api/v1/ready returns database=ok, redis=ok, storage=ok.

Accepted result:

- local_frontend_healthz=ok;
- local_backend_ready=ok.

## 6. Container checks

Required container checks:

- docker compose ps;
- frontend image is obrportal-frontend-static:prod;
- frontend command is nginx -g daemon off;
- frontend health is healthy;
- frontend restart policy is unless-stopped;
- postgres container is healthy;
- redis container is healthy;
- minio container is healthy;
- backend container is running.

## 7. System service checks

Required systemd checks:

- Docker service is enabled;
- Docker service is active;
- Caddy service is enabled;
- Caddy service is active.

## 8. Disk and retention checks

Required disk checks:

- df -h /;
- du -sh /opt/obrportal/backups;
- du -sh /opt/obrportal/tmp.

Warning thresholds:

- root filesystem usage above 80%;
- tmp reports directory growing unexpectedly;
- backups directory missing;
- post-hardening backup missing.

Monitoring must not delete backups automatically.

## 9. Evidence

Each monitoring smoke must create a report in:

- /opt/obrportal/tmp

The report must include:

- timestamp;
- git head;
- public endpoint HTTP statuses;
- local endpoint results;
- container state;
- frontend image and health;
- systemd state;
- disk usage;
- secrets_printed=no.

## 10. Acceptance criteria

Monitoring smoke is accepted when:

- public root, login and admin endpoints return HTTP 200;
- public /api/v1/ready returns database=ok, redis=ok, storage=ok;
- local /healthz returns ok;
- local backend /api/v1/ready returns database=ok, redis=ok, storage=ok;
- frontend container health is healthy;
- Docker and Caddy are enabled and active;
- no internal service port is exposed publicly;
- no secrets are printed;
- monitoring report is created.

## 11. Production monitoring smoke result - 2026-05-27

Status: accepted

Production monitoring smoke was completed and accepted.

Accepted evidence:

- production git head after sync: 562b04a;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- public_root_http=200;
- public_login_http=200;
- public_admin_http=200;
- public_ready=ok;
- local_frontend_healthz=ok;
- local_backend_ready=ok;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- postgres health: healthy;
- redis health: healthy;
- minio health: healthy;
- backend status: running;
- Docker service: enabled and active;
- Caddy service: enabled and active;
- root filesystem usage: 40%;
- /opt/obrportal/backups size: 92K;
- /opt/obrportal/tmp size: 184K;
- post_hardening_backup_present=yes;
- internal ports 5173, 8000, 5432, 6379, 9000 and 9001 were bound to 127.0.0.1;
- secrets_printed=no;
- monitoring_smoke_report_created=yes;
- monitoring_smoke_result=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_11_3_1_monitoring_smoke_20260527143628.txt
