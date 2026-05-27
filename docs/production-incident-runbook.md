# Production incident response and log retention runbook

Status: accepted
Stage: 11.5
Production domain: portal.rcdo02.ru
Production server: 89.127.203.70
Production hardened tag: v0.1.0-stage10-production-hardened

## 1. Purpose

This runbook defines safe incident response and log retention procedures for ObrPortal production.

Incident response must preserve production data, capture evidence and avoid destructive commands.

## 2. Incident safety rules

During an incident, the first priority is preserving data and evidence.

Forbidden incident actions:

- do not run docker compose down -v;
- do not delete production volumes;
- do not delete database backups;
- do not restore database dumps over production without approved maintenance window;
- do not print .env;
- do not print passwords;
- do not print tokens;
- do not commit incident reports containing secrets;
- do not expose internal service ports publicly;
- do not hide failed command output.

## 3. First response checklist

Initial checks:

- record current timestamp;
- record current git head;
- run docker compose ps;
- check frontend health;
- check backend readiness;
- check public /api/v1/ready;
- check public /login;
- check public /admin;
- check Docker service status;
- check Caddy service status;
- check disk usage.

Required commands:

- git rev-parse --short HEAD;
- docker compose ps;
- docker inspect obrportal-frontend;
- curl -fsS http://127.0.0.1:8000/api/v1/ready;
- curl -kfsS https://portal.rcdo02.ru/api/v1/ready;
- systemctl is-active docker;
- systemctl is-active caddy;
- df -h /.

## 4. Evidence collection

Evidence must be collected before any recovery action when possible.

Required evidence:

- docker compose ps output;
- backend logs tail;
- frontend logs tail;
- caddy status;
- docker status;
- disk usage;
- current git head;
- current branch;
- public endpoint HTTP status;
- local endpoint readiness result.

Recommended log commands:

- docker compose logs --tail=200 backend;
- docker compose logs --tail=200 frontend;
- journalctl -u caddy --no-pager -n 200;
- journalctl -u docker --no-pager -n 100.

## 5. Common incident scenarios

Frontend unavailable:

- check Caddy status;
- check frontend container status;
- check local http://127.0.0.1:5173/healthz;
- check frontend image is obrportal-frontend-static:prod;
- check frontend command is nginx -g daemon off.

Backend not ready:

- check backend container status;
- check backend logs;
- check database readiness;
- check redis readiness;
- check storage readiness;
- check alembic current and heads.

Disk pressure:

- check df -h /;
- check du -sh /opt/obrportal/tmp;
- check du -sh /opt/obrportal/backups;
- do not delete backups automatically;
- archive old tmp reports only after review.

Database issue:

- do not delete postgres volume;
- do not recreate postgres container with new empty volume;
- do not restore backup over production without approved maintenance window;
- collect logs and readiness output first.

## 6. Recovery policy

Allowed low-risk recovery actions:

- restart Caddy only if Caddy is inactive and configuration is known-good;
- restart frontend only if frontend container is unhealthy;
- restart backend only if backend is unhealthy;
- run docker compose up -d for affected runtime service only;
- preserve postgres, redis and minio volumes.

Recovery actions requiring explicit approval:

- database restore;
- production volume changes;
- server reboot;
- changing docker-compose.override.yml;
- changing Caddyfile;
- package upgrades on VPS.

## 7. Log retention policy

Production reports are stored in:

- /opt/obrportal/tmp

Production backups are stored in:

- /opt/obrportal/backups

Retention rules:

- tmp reports may be archived after review;
- tmp reports must not be committed to git;
- backups must not be deleted automatically;
- backups must not be committed to git;
- backup checksum files must be kept with dumps;
- incident reports must not contain secrets.

## 8. Safe tmp cleanup policy

Allowed tmp cleanup:

- list files before cleanup;
- archive old reports outside git if needed;
- remove only reviewed tmp report files;
- keep latest Stage 10 and Stage 11 acceptance reports;
- never remove backups through tmp cleanup.

Forbidden cleanup:

- rm -rf /opt/obrportal;
- rm -rf /opt/obrportal/backups;
- docker system prune --volumes;
- docker volume prune;
- deleting postgres, redis or minio volumes.

## 9. Escalation policy

Escalate when:

- database readiness is failed;
- restore may be needed;
- disk usage is above 80%;
- production public endpoints are unavailable;
- Caddy cannot start;
- Docker cannot start;
- repeated restarts do not fix the issue.

Escalation evidence must include:

- timestamp;
- symptoms;
- commands executed;
- command outputs;
- current git head;
- docker compose ps;
- backend logs tail;
- frontend logs tail;
- public and local smoke results.

## 10. Incident report format

Each incident report must include:

- incident id;
- started_at;
- detected_by;
- symptoms;
- affected endpoints;
- git head;
- docker compose ps;
- local readiness result;
- public readiness result;
- actions taken;
- result;
- follow-up tasks;
- secrets_printed=no.

## 11. Acceptance criteria

Incident response baseline is accepted when:

- this runbook exists;
- this runbook has a CI guard;
- forbidden destructive actions are documented;
- evidence collection procedure is documented;
- recovery policy is documented;
- log retention policy is documented;
- safe tmp cleanup policy is documented;
- no secrets are added to repository.

## 12. Server incident runbook check result - 2026-05-27

Status: accepted

Production incident response and log retention runbook was checked on the production server and accepted.

Accepted evidence:

- production git head after sync: e678445;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- git branch: develop;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- local /healthz returned ok;
- local /api/v1/ready returned database=ok, redis=ok, storage=ok;
- public / returned HTTP 200;
- public /login returned HTTP 200;
- public /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- backend_log_tail_captured=yes;
- frontend_log_tail_captured=yes;
- caddy_log_tail_command_executed=yes;
- docker_log_tail_command_executed=yes;
- temporary_log_tail_files_removed=yes;
- root filesystem usage: 40%;
- /opt/obrportal/tmp size: 204K;
- /opt/obrportal/backups size: 92K;
- post_hardening_backup_present=yes;
- Docker service was enabled and active;
- Caddy service was enabled and active;
- internal ports 5173, 8000, 5432, 6379, 9000 and 9001 were bound to 127.0.0.1;
- secrets_printed=no;
- incident_runbook_server_check=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_11_5_1_incident_runbook_server_check_20260527150145.txt
