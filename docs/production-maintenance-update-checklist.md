# Production maintenance update checklist

Version: `v0.1.0-stage6`
Stage: `9.7`
Status: `drafted`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This checklist defines safe maintenance and update actions for ObrPortal production.

It is used before, during and after:

- code updates;
- documentation updates;
- dependency updates;
- Docker image rebuilds;
- Caddy changes;
- environment changes;
- backup/restore maintenance;
- incident recovery updates.

## 2. Current branch baseline

| Branch | Current role |
| --- | --- |
| `develop` | active Stage 9 operations branch |
| `main` | last stable Stage 8 production rollout checkpoint |

Current rule:

- Stage 9 changes continue in `develop`;
- `main` is updated only after a final local gate and explicit fast-forward step;
- `main` is not touched during intermediate Stage 9 checklist work.

## 3. Pre-update local checklist

Before any update:

| Check | Command |
| --- | --- |
| Working tree | `git status --short` |
| Branch state | `git branch -vv` |
| Recent commits | `git log --oneline --decorate -7` |
| Fetch remote | `git fetch origin --tags` |
| Release readiness | `python .\scripts\check_release_readiness.py` |
| CI local gate | `python .\scripts\check_ci_local_gate.py` |
| Frontend smoke | `python .\scripts\smoke_frontend_core.py` |
| Frontend coverage | `python .\scripts\check_frontend_smoke_coverage.py` |
| TODO guard | `python .\scripts\check_no_todo_markers.py` |
| BOM guard | `python .\scripts\check_source_bom.py` |
| Encoding guard | `python .\scripts\check_text_encoding.py` |

Required result:

- working tree is clean before starting;
- current branch is expected;
- no accidental server-only files are staged;
- all local guards pass.

## 4. Production smoke before maintenance

Before production-impacting changes:

| Check | Command |
| --- | --- |
| Public monitoring smoke | `python .\scripts\smoke_production_monitoring.py` |
| Monitoring smoke guard | `python .\scripts\check_production_monitoring_smoke.py` |
| Operations baseline guard | `python .\scripts\check_production_operations_baseline.py` |
| Operational runbook guard | `python .\scripts\check_production_operational_runbook.py` |
| Backup verification guard | `python .\scripts\check_production_backup_verification.py` |

Required result:

- public frontend routes return `200`;
- `/health` returns expected JSON;
- `/api/v1/ready` returns expected JSON;
- docs and diagnostics remain consistent.

## 5. Server-only file protection

Never commit:

| File | Reason |
| --- | --- |
| `/opt/obrportal/.env` | contains production secrets |
| `/opt/obrportal/docker-compose.override.yml` | server-only localhost bindings |
| `/etc/caddy/Caddyfile` | server-only reverse proxy config |
| `/opt/obrportal-backups/*` | backup artifacts and restore dry-run data |

Local repository must not contain:

- production `.env`;
- production backup artifacts;
- production restore dry-run files;
- Caddy server-only config;
- server-only Docker Compose override;
- temporary logs from `tmp/`.

## 6. Allowed update types

Allowed low-risk updates:

| Update type | Allowed in Stage 9 |
| --- | --- |
| Documentation updates | yes |
| Diagnostics guard updates | yes |
| Smoke script updates | yes, if non-destructive |
| Operational checklist updates | yes |
| README checkpoints | yes |

Higher-risk updates require additional plan:

| Update type | Requirement |
| --- | --- |
| Backend code changes | local tests and deployment plan |
| Frontend code changes | frontend smoke and route coverage |
| Database migrations | backup and migration rollback plan |
| Caddy changes | Caddyfile backup and validation |
| Docker Compose changes | config validation and port exposure check |
| Environment changes | no secret printing, controlled update only |

## 7. Forbidden actions during routine maintenance

Do not:

- do not print production `.env`;
- do not print secret values;
- do not commit `.env`;
- never commit `.env`;
- do not commit server-only override;
- do not commit server-only Caddyfile;
- do not commit backup artifacts;
- do not run `docker compose down -v`;
- do not delete Docker volumes;
- do not expose private ports publicly;
- do not restart PostgreSQL without explicit reason;
- do not restart MinIO without explicit reason;
- do not touch `amnezia-awg` unless the incident is specifically about VPN.

## 8. Docker Compose update checklist

Before Docker Compose changes:

- inspect intended compose diff;
- confirm no public exposure for backend/frontend/PostgreSQL/Redis/MinIO;
- preserve `127.0.0.1` bindings;
- validate config before restart;
- record changes in docs if production-impacting.

Expected private ports:

| Service | Expected binding |
| --- | --- |
| Backend | `127.0.0.1:8000` |
| Frontend | `127.0.0.1:5173` |
| PostgreSQL | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |
| MinIO API | `127.0.0.1:9000` |
| MinIO console | `127.0.0.1:9001` |

## 9. Caddy update checklist

Before Caddy changes:

- backup `/etc/caddy/Caddyfile`;
- edit only intended host block;
- validate Caddy config;
- reload, not restart, if possible;
- verify public routes after reload.

Safe commands:

| Purpose | Command |
| --- | --- |
| Validate | `caddy validate --config /etc/caddy/Caddyfile` |
| Reload | `systemctl reload caddy` |
| Status | `systemctl is-active caddy` |
| Public check | `curl -I https://portal.rcdo02.ru` |

## 10. Backup maintenance checklist

Before backup maintenance:

- verify backup root exists;
- verify protected backup artifact exists;
- verify SHA256;
- verify gzip test;
- verify tar list test;
- do not print server-only file contents;
- do not upload backup artifacts to public storage.

Current protected artifact:

- `/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807/obrportal_protected_backup_stage_9_4_1b_20260524103807.tar.gz`

Expected SHA256:

- `ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad`

## 11. Restore maintenance checklist

Restore into production is not a routine maintenance action.

Before any real restore:

- create explicit restore plan;
- confirm backup artifact SHA256;
- run metadata-only restore dry-run;
- decide target database/storage;
- define rollback path;
- get explicit approval;
- do not overwrite production data without a confirmed restore window.

Current accepted dry-run:

- `/opt/obrportal-backups/restore-dry-run/stage_9_5_1_20260524105954`

Important clarification:

- current production PostgreSQL public table count is `0`;
- current PostgreSQL dump is valid but minimal;
- future backups after migrations/data should include schema/table markers.

## 12. Post-update verification checklist

After update:

| Check | Command |
| --- | --- |
| Public smoke | `python .\scripts\smoke_production_monitoring.py` |
| Operational runbook guard | `python .\scripts\check_production_operational_runbook.py` |
| Backup verification guard | `python .\scripts\check_production_backup_verification.py` |
| Release readiness | `python .\scripts\check_release_readiness.py` |
| Frontend core smoke | `python .\scripts\smoke_frontend_core.py` |
| Frontend coverage | `python .\scripts\check_frontend_smoke_coverage.py` |
| TODO guard | `python .\scripts\check_no_todo_markers.py` |
| BOM guard | `python .\scripts\check_source_bom.py` |
| Encoding guard | `python .\scripts\check_text_encoding.py` |

Required result:

- all checks pass;
- `git status --short` is clean after commit;
- public routes remain green;
- private ports remain private;
- no secrets are printed or committed.

## 13. Rollback checklist

Rollback is considered when:

- update caused public route failure;
- update caused `/health` failure;
- update caused `/api/v1/ready` failure;
- frontend routes fail after deployment;
- Caddy validation fails;
- port privacy is broken.

Rollback steps must include:

- identify previous good commit;
- identify affected component;
- avoid volume deletion;
- avoid secret printing;
- restore previous config only from trusted backup;
- run production monitoring smoke after rollback;
- document result.

## 14. Acceptance criteria

Maintenance update checklist is accepted when:

- checklist document exists;
- diagnostics guard exists;
- server-only files are protected;
- forbidden actions are documented;
- backup and restore maintenance rules are documented;
- Caddy and Docker Compose update rules are documented;
- post-update verification is documented;
- rollback basics are documented;
- all production diagnostics remain green.
