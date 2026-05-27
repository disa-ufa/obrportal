# Production incident response and log retention runbook

Status: drafted
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
