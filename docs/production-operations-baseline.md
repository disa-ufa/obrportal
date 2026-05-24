# Production operations baseline

Version: `v0.1.0-stage6`
Stage: `9.1`
Status: `drafted`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This document defines the operational baseline after Stage 8 production rollout.

Stage 8 result:

- production server prepared;
- production `.env` created safely;
- Docker Compose stack started;
- external app/service port exposure remediated;
- Caddy HTTPS reverse proxy activated;
- final public smoke passed;
- `main` fast-forwarded from `develop`.

Stage 9 focuses on:

- monitoring;
- backup verification;
- restore verification;
- operational handover;
- maintenance checklist;
- update procedure;
- incident response basics.

## 2. Current production state

| Item | Value | Status |
| --- | --- | --- |
| Server | `306733.fornex.cloud` | active |
| Public IPv4 | `89.127.203.70` | active |
| Domain | `portal.rcdo02.ru` | active |
| HTTPS URL | `https://portal.rcdo02.ru` | active |
| Caddy | `v2.11.3` | public HTTP/HTTPS entrypoint |
| Docker Compose stack | `running` | active |
| Backend | `127.0.0.1:8000` | private |
| Frontend | `127.0.0.1:5173` | private |
| PostgreSQL | `127.0.0.1:5432` | private |
| Redis | `127.0.0.1:6379` | private |
| MinIO API | `127.0.0.1:9000` | private |
| MinIO console | `127.0.0.1:9001` | private |
| Existing VPN container | `amnezia-awg` | preserved |
| Existing VPN UDP port | `34503/udp` | preserved |

## 3. Public health baseline

| Route | Expected |
| --- | --- |
| `https://portal.rcdo02.ru` | `200` |
| `https://portal.rcdo02.ru/health` | `200` |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` |
| `https://portal.rcdo02.ru/login` | `200` |
| `https://portal.rcdo02.ru/admin` | `200` |
| `https://portal.rcdo02.ru/catalog` | `200` |

## 4. Security baseline

Required state:

- Caddy is the only public HTTP/HTTPS entrypoint.
- Backend, frontend, PostgreSQL, Redis and MinIO are bound to `127.0.0.1`.
- Production `.env` is not committed.
- Production `.env` is not printed to logs or chat.
- Production `.env` permissions remain `600`.
- Server-only `docker-compose.override.yml` remains untracked.
- Server-only `/etc/caddy/Caddyfile` remains untracked.
- `amnezia-awg` and UDP `34503` are not touched by portal maintenance.

## 5. Server-only files

| File | Purpose | Git status |
| --- | --- | --- |
| `/opt/obrportal/.env` | production environment | not committed |
| `/opt/obrportal/docker-compose.override.yml` | localhost-only port binds | not committed |
| `/etc/caddy/Caddyfile` | production reverse proxy | not committed |
| `/opt/obrportal-backups/caddy/*` | Caddy backups | not committed |
| `/opt/obrportal-backups/compose/*` | Compose override backups | not committed |

## 6. Monitoring baseline

Minimum manual monitoring checks:

- public HTTPS route availability;
- backend health;
- backend readiness;
- Docker Compose container status;
- Caddy service status;
- disk usage;
- memory usage;
- backup directory presence;
- private port binding verification;
- secret leakage check in collected logs.

Recommended command groups:

- `curl -fsS https://portal.rcdo02.ru >/dev/null`
- `curl -fsS https://portal.rcdo02.ru/health`
- `curl -fsS https://portal.rcdo02.ru/api/v1/ready`
- `docker compose ps`
- `systemctl is-active caddy`
- `df -h`
- `free -h`
- `ss -tulpen`

## 7. Backup baseline

Backup verification must cover:

- PostgreSQL data;
- MinIO data;
- server-only `.env`;
- server-only `docker-compose.override.yml`;
- Caddyfile;
- Caddy backups;
- deployment documentation.

Backup rules:

- do not print secrets;
- do not store secrets in git;
- do not upload production `.env` to chat;
- verify backup existence without dumping sensitive values;
- test restore procedure before declaring backups production-ready.

## 8. Restore baseline

Restore verification must include:

- creating a controlled backup artifact;
- validating backup metadata;
- restoring into a safe temporary location or test volume;
- verifying expected files/tables exist;
- confirming no secrets are printed in restore logs;
- documenting the restore result.

## 9. Operational handover baseline

Handover package should include:

- public URL;
- health URLs;
- known service layout;
- startup/restart commands;
- backup commands;
- restore commands;
- incident checklist;
- update procedure;
- rollback procedure;
- secret handling rules;
- contact/responsibility matrix.

## 10. Update procedure baseline

Before any update:

- confirm `git status --short` is clean locally;
- confirm `develop` and `main` state;
- run local diagnostics;
- avoid touching server-only files;
- backup Caddyfile before Caddy changes;
- avoid exposing app/service ports externally;
- keep `.env` private.

After any update:

- verify Docker Compose status;
- verify Caddy status;
- verify public routes;
- verify local upstreams;
- verify port privacy;
- record result in docs if it changes production state.

## 11. Incident response baseline

Initial incident checks:

- public route status;
- Caddy status;
- backend health;
- backend readiness;
- Docker Compose status;
- container logs;
- disk space;
- memory;
- recent deployment changes;
- Caddyfile changes;
- `.env` permission changes;
- port exposure changes.

Do not do during incident response:

- do not print `.env`;
- do not delete volumes;
- do not run `docker compose down -v`;
- do not expose database/cache/storage ports publicly;
- do not touch `amnezia-awg` unless the incident is specifically about VPN.

## 12. Stage 9 planned sequence

| Step | Name | Goal |
| --- | --- | --- |
| `9.1` | production operations baseline | define operating baseline |
| `9.2` | monitoring smoke script | create repeatable public/local smoke |
| `9.3` | backup verification | verify backup coverage |
| `9.4` | restore dry-run | verify restore process safely |
| `9.5` | operational runbook | document operator actions |
| `9.6` | incident checklist | document response flow |
| `9.7` | maintenance/update checklist | document safe updates |
| `9.8` | handover package | prepare admin/operator handover |
| `9.9` | Stage 9 checkpoint | stabilize and merge |

## 13. Acceptance criteria

Stage 9 operations baseline is accepted when:

- production public routes remain green;
- private bindings remain private;
- server-only files remain uncommitted;
- operational baseline document exists;
- diagnostics guard verifies required markers;
- no secret-like data is committed;
- Stage 9 next steps are clear.
