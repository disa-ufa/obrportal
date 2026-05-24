# Production operational runbook

Version: `v0.1.0-stage6`
Stage: `9.6`
Status: `drafted`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This runbook defines safe operational actions for ObrPortal production.

It covers:

- daily health checks;
- public monitoring smoke;
- backup verification;
- restore dry-run verification;
- incident triage;
- restart rules;
- update rules;
- rollback basics;
- secret handling;
- server-only file handling.

## 2. Current production baseline

| Item | Value |
| --- | --- |
| Server | `306733.fornex.cloud` |
| Public IPv4 | `89.127.203.70` |
| Domain | `portal.rcdo02.ru` |
| Public URL | `https://portal.rcdo02.ru` |
| Caddy | public HTTP/HTTPS entrypoint |
| Backend | `127.0.0.1:8000` |
| Frontend | `127.0.0.1:5173` |
| PostgreSQL | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |
| MinIO API | `127.0.0.1:9000` |
| MinIO console | `127.0.0.1:9001` |
| Existing VPN | `amnezia-awg`, UDP `34503` |

## 3. Public checks

Expected public routes:

| Route | Expected |
| --- | --- |
| `https://portal.rcdo02.ru` | `200` |
| `https://portal.rcdo02.ru/login` | `200` |
| `https://portal.rcdo02.ru/admin` | `200` |
| `https://portal.rcdo02.ru/catalog` | `200` |
| `https://portal.rcdo02.ru/health` | `200` |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` |

Local command:

- `python .\scripts\smoke_production_monitoring.py`

## 4. Daily operator checklist

Daily checks:

- run production monitoring smoke;
- verify `/health`;
- verify `/api/v1/ready`;
- verify Caddy status if public route fails;
- verify Docker Compose status if backend readiness fails;
- verify disk usage;
- verify memory usage;
- verify backup artifact presence;
- confirm app/service ports remain localhost-only.

Do not:

- do not print production `.env`;
- do not expose private service ports;
- do not run `docker compose down -v`;
- do not delete Docker volumes;
- do not touch `amnezia-awg` unless the incident is specifically about VPN.

## 5. Safe server status commands

Allowed status-only commands:

| Purpose | Command |
| --- | --- |
| Caddy status | `systemctl is-active caddy` |
| Docker status | `docker compose ps` |
| Container list | `docker ps` |
| Public health | `curl -I https://portal.rcdo02.ru` |
| Backend health | `curl -fsS http://127.0.0.1:8000/health` |
| Backend ready | `curl -fsS http://127.0.0.1:8000/api/v1/ready` |
| Disk usage | `df -h` |
| Memory usage | `free -h` |
| Port check | `ss -tulpen` |

## 6. Incident triage checklist

Initial triage order:

1. Check public frontend route.
2. Check public `/health`.
3. Check public `/api/v1/ready`.
4. Check local backend health.
5. Check local backend readiness.
6. Check Docker Compose status.
7. Check Caddy status.
8. Check disk space.
9. Check memory.
10. Check recent git/deployment changes.
11. Check whether server-only override still exists.
12. Check whether service ports are still localhost-only.

Incident categories:

| Category | First checks |
| --- | --- |
| Public site down | Caddy, DNS, frontend container |
| `/health` down | backend container, backend logs |
| `/api/v1/ready` down | database, Redis, MinIO |
| Login/admin routes down | frontend route, backend API, auth |
| Slow response | CPU, memory, disk, container status |
| Backup issue | backup artifact, disk, permissions |
| Caddy issue | Caddyfile validate, Caddy logs |
| Database issue | PostgreSQL container health, ready endpoint |
| Storage issue | MinIO container health, ready endpoint |

## 7. Restart rules

Allowed only after diagnostics:

| Service | Safe command |
| --- | --- |
| Caddy | `systemctl reload caddy` |
| Backend | `docker compose restart backend` |
| Frontend | `docker compose restart frontend` |
| Redis | `docker compose restart redis` |

Restricted:

- PostgreSQL restart requires explicit reason;
- MinIO restart requires explicit reason;
- full stack restart requires approval;
- `docker compose down -v` is forbidden in production operations.

## 8. Backup and restore rules

Backup artifact location:

- `/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807/obrportal_protected_backup_stage_9_4_1b_20260524103807.tar.gz`

Backup SHA256:

- `ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad`

Restore dry-run directory:

- `/opt/obrportal-backups/restore-dry-run/stage_9_5_1_20260524105954`

Rules:

- restore into production is not allowed without explicit restore plan;
- verify SHA256 before any restore;
- verify gzip/tar list before any restore;
- do not print secrets;
- do not print table data;
- do not overwrite server-only files without backup.

## 9. Update procedure

Before update:

- confirm local `git status --short` is clean;
- run local guards;
- confirm current branch;
- confirm `develop` and `main` state;
- do not commit server-only files;
- do not commit production `.env`;
- backup Caddyfile before Caddy changes;
- verify production monitoring smoke.

After update:

- verify Docker Compose status;
- verify Caddy status;
- verify public routes;
- verify backend health;
- verify backend readiness;
- verify app/service ports are localhost-only;
- record production-impacting changes in docs.

## 10. Rollback basics

Rollback decision requires:

- failed public smoke after update;
- failed health/readiness after update;
- confirmed relation to latest deployment;
- known previous good commit or artifact.

Rollback must not:

- delete volumes;
- expose private ports;
- overwrite `.env` without backup;
- touch `amnezia-awg`;
- skip post-rollback public smoke.

## 11. Secret handling

Strict rules:

- never print production `.env`;
- never print secret values;
- never paste secrets into chat;
- never commit `.env`;
- never commit server-only override;
- never commit server-only Caddyfile;
- store backup artifacts only in protected server backup directories;
- do not upload backup artifacts to public storage.

## 12. Server-only files

| File | Rule |
| --- | --- |
| `/opt/obrportal/.env` | server-only, not committed |
| `/opt/obrportal/docker-compose.override.yml` | server-only, not committed |
| `/etc/caddy/Caddyfile` | server-only, not committed |
| `/opt/obrportal-backups/*` | server-only backup data |

## 13. Escalation checklist

Escalate when:

- public HTTPS is down and Caddy restart/reload does not help;
- backend health remains down after backend restart;
- readiness remains down due to PostgreSQL/Redis/MinIO;
- disk usage is critical;
- backup artifact creation fails repeatedly;
- restore is required for production data;
- security exposure is suspected;
- private ports are exposed publicly.

## 14. Acceptance criteria

Operational runbook is accepted when:

- it documents current production baseline;
- it documents daily checks;
- it documents incident triage;
- it documents restart rules;
- it documents backup/restore rules;
- it documents secret handling;
- diagnostics guard verifies required markers;
- all existing production diagnostics remain green.
