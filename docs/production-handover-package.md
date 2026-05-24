# Production handover package

Version: `v0.1.0-stage6`
Stage: `9.8`
Status: `drafted`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This document is the production handover package for ObrPortal.

It summarizes:

- production access points;
- health checks;
- operational documents;
- backup and restore references;
- maintenance rules;
- incident response basics;
- update process;
- safety boundaries;
- current Stage 9 status.

## 2. Production access summary

| Item | Value |
| --- | --- |
| Public URL | `https://portal.rcdo02.ru` |
| Health URL | `https://portal.rcdo02.ru/health` |
| Readiness URL | `https://portal.rcdo02.ru/api/v1/ready` |
| Login route | `https://portal.rcdo02.ru/login` |
| Admin route | `https://portal.rcdo02.ru/admin` |
| Catalog route | `https://portal.rcdo02.ru/catalog` |
| Public IPv4 | `89.127.203.70` |
| Server hostname | `306733.fornex.cloud` |

## 3. Runtime topology

| Component | Runtime |
| --- | --- |
| Caddy | public HTTP/HTTPS entrypoint |
| Frontend | `127.0.0.1:5173` |
| Backend | `127.0.0.1:8000` |
| PostgreSQL | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |
| MinIO API | `127.0.0.1:9000` |
| MinIO console | `127.0.0.1:9001` |
| Existing VPN | `amnezia-awg`, UDP `34503` |

Required exposure model:

- only Caddy is public for HTTP/HTTPS;
- app/service ports remain localhost-only;
- `amnezia-awg` is preserved and not part of portal maintenance.

## 4. Current repository state

| Branch | State |
| --- | --- |
| `develop` | `5cb2a6e`, Stage 9.7 checkpoint |
| `main` | `88990b2`, Stage 8 production rollout checkpoint |

Rules:

- continue Stage 9 work in `develop`;
- do not fast-forward `main` until final Stage 9 gate;
- do not commit server-only files;
- do not commit production secrets;
- do not commit backup artifacts.

## 5. Core operational documents

| Document | Purpose |
| --- | --- |
| `docs/production-operations-baseline.md` | production baseline |
| `docs/production-monitoring-smoke.md` | public monitoring smoke |
| `docs/production-backup-verification.md` | backup and restore verification |
| `docs/production-operational-runbook.md` | operator runbook and incident checklist |
| `docs/production-maintenance-update-checklist.md` | maintenance and update checklist |
| `docs/production-deployment-runbook.md` | deployment runbook |
| `docs/production-server-facts.md` | server facts |
| `docs/production-domain-dns-verification.md` | DNS verification |
| `docs/production-domain-reverse-proxy-decision.md` | reverse proxy decision |
| `docs/production-reverse-proxy-checklist.md` | Caddy checklist |

## 6. Core diagnostics scripts

| Script | Purpose |
| --- | --- |
| `scripts/smoke_production_monitoring.py` | public production smoke |
| `scripts/check_production_monitoring_smoke.py` | monitoring smoke guard |
| `scripts/check_production_operations_baseline.py` | operations baseline guard |
| `scripts/check_production_backup_verification.py` | backup and restore verification guard |
| `scripts/check_production_operational_runbook.py` | runbook guard |
| `scripts/check_production_maintenance_update_checklist.py` | maintenance checklist guard |
| `scripts/check_release_readiness.py` | release readiness |
| `scripts/check_ci_local_gate.py` | local CI gate |
| `scripts/smoke_frontend_core.py` | frontend core smoke |
| `scripts/check_frontend_smoke_coverage.py` | frontend smoke coverage |
| `scripts/check_no_todo_markers.py` | TODO/stub guard |
| `scripts/check_source_bom.py` | BOM guard |
| `scripts/check_text_encoding.py` | text encoding guard |

## 7. Standard public health checks

Run locally:

- `python .\scripts\smoke_production_monitoring.py`
- `python .\scripts\check_production_monitoring_smoke.py`

Expected routes:

| Route | Expected |
| --- | --- |
| `https://portal.rcdo02.ru` | `200` |
| `https://portal.rcdo02.ru/login` | `200` |
| `https://portal.rcdo02.ru/admin` | `200` |
| `https://portal.rcdo02.ru/catalog` | `200` |
| `https://portal.rcdo02.ru/health` | `200` |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` |

Expected backend health:

- `/health`: `status=ok`, `app=ObrPortal`, `version=0.1.0-stage6`;
- `/api/v1/ready`: `status=ok`, `database=ok`, `redis=ok`, `storage=ok`.

## 8. Backup handover summary

Protected backup artifact:

- `/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807/obrportal_protected_backup_stage_9_4_1b_20260524103807.tar.gz`

Backup SHA256:

- `ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad`

Artifact verification result:

| Check | Result |
| --- | --- |
| PostgreSQL dump | created |
| MinIO archive | created |
| server-only `.env` | copied without printing |
| server-only compose override | copied without printing |
| server-only Caddyfile | copied without printing |
| gzip test | passed |
| tar list test | passed |
| secret marker scan | passed |

## 9. Restore handover summary

Restore dry-run directory:

- `/opt/obrportal-backups/restore-dry-run/stage_9_5_1_20260524105954`

Restore result:

| Check | Result |
| --- | --- |
| Production restore performed | no |
| Database restore performed | no |
| MinIO restore performed | no |
| Volume delete performed | no |
| Service restart performed | no |
| Secret values printed | no |
| Table data printed | no |
| Public health preserved | yes |

PostgreSQL clarification:

- current production PostgreSQL public table count is `0`;
- current PostgreSQL dump is valid but minimal;
- `dump_line_count=26`;
- `dump_create_table_count=0`;
- future backups after migrations/data should include schema/table markers.

## 10. Server-only files handover

| File | Rule |
| --- | --- |
| `/opt/obrportal/.env` | server-only, never commit, never print |
| `/opt/obrportal/docker-compose.override.yml` | server-only, never commit |
| `/etc/caddy/Caddyfile` | server-only, never commit |
| `/opt/obrportal-backups/*` | server-only backup and dry-run data |

Operator rules:

- do not paste `.env` into chat;
- do not commit server-only files;
- do not upload backup artifacts to public storage;
- do not print secret values in logs.

## 11. Maintenance handover

Before maintenance:

- confirm `git status --short`;
- confirm `git branch -vv`;
- run production monitoring smoke;
- run operational runbook guard;
- run maintenance checklist guard;
- verify backup/restore verification guard;
- confirm no server-only files are staged.

After maintenance:

- run public smoke;
- run local gates;
- verify private ports remain private;
- document production-impacting changes;
- commit only intended files.

## 12. Incident handover

Initial incident order:

1. Check `https://portal.rcdo02.ru`.
2. Check `https://portal.rcdo02.ru/health`.
3. Check `https://portal.rcdo02.ru/api/v1/ready`.
4. Check local backend health.
5. Check Docker Compose status.
6. Check Caddy status.
7. Check disk usage.
8. Check memory.
9. Check recent commits.
10. Check server-only override presence.
11. Check port privacy.

Do not during incidents:

- do not run `docker compose down -v`;
- do not delete Docker volumes;
- do not print `.env`;
- do not expose private ports;
- do not touch `amnezia-awg` unless the incident is VPN-specific.

## 13. Update handover

Safe update flow:

1. Work in `develop`.
2. Keep `main` untouched until final Stage gate.
3. Run full local diagnostics.
4. Make only intended changes.
5. Run post-update diagnostics.
6. Commit to `develop`.
7. Push `develop`.
8. Fast-forward `main` only at final approved checkpoint.

Required checks before final merge:

- `python .\scripts\check_production_maintenance_update_checklist.py`;
- `python .\scripts\check_production_operational_runbook.py`;
- `python .\scripts\check_production_backup_verification.py`;
- `python .\scripts\smoke_production_monitoring.py`;
- `python .\scripts\check_release_readiness.py`;
- `python .\scripts\smoke_frontend_core.py`;
- `python .\scripts\check_frontend_smoke_coverage.py`;
- `python .\scripts\check_no_todo_markers.py`;
- `python .\scripts\check_source_bom.py`;
- `python .\scripts\check_text_encoding.py`.

## 14. Handover safety boundaries

Strictly forbidden without explicit restore/deployment plan:

- production database restore;
- production MinIO restore;
- Docker volume deletion;
- `docker compose down -v`;
- public exposure of backend/frontend/PostgreSQL/Redis/MinIO;
- secret printing;
- server-only file commits;
- backup artifact commits;
- unrelated changes to `amnezia-awg`.

## 15. Responsibility matrix

| Area | Primary document |
| --- | --- |
| Daily monitoring | `docs/production-monitoring-smoke.md` |
| Incident handling | `docs/production-operational-runbook.md` |
| Maintenance/update | `docs/production-maintenance-update-checklist.md` |
| Backup/restore verification | `docs/production-backup-verification.md` |
| Production baseline | `docs/production-operations-baseline.md` |
| Reverse proxy | `docs/production-reverse-proxy-checklist.md` |
| Deployment | `docs/production-deployment-runbook.md` |

## 16. Acceptance criteria

Production handover package is accepted when:

- handover document exists;
- public access points are documented;
- runtime topology is documented;
- backup artifact is documented;
- restore dry-run result is documented;
- server-only files are documented;
- maintenance checklist is linked;
- incident checklist is summarized;
- update flow is documented;
- diagnostics guard verifies required markers;
- all existing Stage 9 diagnostics remain green.
