# Production Stage 9 final gate

Version: `v0.1.0-stage6`
Stage: `9.9`
Status: `drafted`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This document records the final local gate for Stage 9 production operations.

Stage 9 goal:

- stabilize operational documentation;
- verify production monitoring;
- verify backup coverage;
- create protected backup artifact;
- verify restore metadata dry-run;
- prepare operational runbook;
- prepare maintenance checklist;
- prepare handover package;
- keep `main` untouched until final approval.

## 2. Current repository state

| Branch | State |
| --- | --- |
| `develop` | `9bd2cf2`, Stage 9.8 checkpoint |
| `origin/develop` | `9bd2cf2`, Stage 9.8 checkpoint |
| `main` | `88990b2`, Stage 8 production rollout checkpoint |
| `origin/main` | `88990b2`, Stage 8 production rollout checkpoint |

Decision:

- Stage 9 final gate runs on `develop`;
- `main` is not fast-forwarded during this document step;
- `main` can be fast-forwarded only after Stage 9 final gate is committed and verified.

## 3. Stage 9 closure matrix

| Stage | Scope | Status |
| --- | --- | --- |
| `9.1` | production operations baseline | closed |
| `9.2` | production monitoring smoke | closed |
| `9.3` | backup inventory precheck | closed |
| `9.4` | protected backup artifact creation | closed |
| `9.5` | restore dry-run metadata verification | closed |
| `9.6` | operational runbook / incident checklist | closed |
| `9.7` | maintenance / update checklist | closed |
| `9.8` | handover package / operator summary | closed |
| `9.9` | final local gate / release readiness summary | in progress |

## 4. Stage 9 production documents

| Document | Status |
| --- | --- |
| `docs/production-operations-baseline.md` | created |
| `docs/production-monitoring-smoke.md` | created |
| `docs/production-backup-verification.md` | created |
| `docs/production-operational-runbook.md` | created |
| `docs/production-maintenance-update-checklist.md` | created |
| `docs/production-handover-package.md` | created |
| `docs/production-deployment-runbook.md` | preserved |
| `docs/production-server-facts.md` | preserved |
| `docs/production-domain-dns-verification.md` | preserved |
| `docs/production-domain-reverse-proxy-decision.md` | preserved |
| `docs/production-reverse-proxy-checklist.md` | preserved |

## 5. Stage 9 diagnostics scripts

| Script | Status |
| --- | --- |
| `scripts/smoke_production_monitoring.py` | created |
| `scripts/check_production_monitoring_smoke.py` | created |
| `scripts/check_production_operations_baseline.py` | created |
| `scripts/check_production_backup_verification.py` | created/extended |
| `scripts/check_production_operational_runbook.py` | created |
| `scripts/check_production_maintenance_update_checklist.py` | created |
| `scripts/check_production_handover_package.py` | created/hardened |
| `scripts/check_release_readiness.py` | preserved |
| `scripts/check_ci_local_gate.py` | preserved |
| `scripts/smoke_frontend_core.py` | preserved |
| `scripts/check_frontend_smoke_coverage.py` | preserved |
| `scripts/check_no_todo_markers.py` | preserved |
| `scripts/check_source_bom.py` | preserved |
| `scripts/check_text_encoding.py` | preserved |

## 6. Production health baseline

| Route | Expected |
| --- | --- |
| `https://portal.rcdo02.ru` | `200` |
| `https://portal.rcdo02.ru/login` | `200` |
| `https://portal.rcdo02.ru/admin` | `200` |
| `https://portal.rcdo02.ru/catalog` | `200` |
| `https://portal.rcdo02.ru/health` | `200` |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` |

Expected readiness:

| Dependency | Expected |
| --- | --- |
| Database | `ok` |
| Redis | `ok` |
| Storage | `ok` |

## 7. Production runtime safety baseline

| Component | Exposure |
| --- | --- |
| Caddy | public HTTP/HTTPS entrypoint |
| Backend | `127.0.0.1:8000` |
| Frontend | `127.0.0.1:5173` |
| PostgreSQL | `127.0.0.1:5432` |
| Redis | `127.0.0.1:6379` |
| MinIO API | `127.0.0.1:9000` |
| MinIO console | `127.0.0.1:9001` |
| `amnezia-awg` | preserved, UDP `34503` |

Required:

- app/service ports remain localhost-only;
- Caddy remains the only public HTTP/HTTPS entrypoint;
- `amnezia-awg` remains untouched.

## 8. Backup and restore final status

Protected backup artifact:

- `/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807/obrportal_protected_backup_stage_9_4_1b_20260524103807.tar.gz`

Backup SHA256:

- `ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad`

Restore dry-run directory:

- `/opt/obrportal-backups/restore-dry-run/stage_9_5_1_20260524105954`

Backup/restore decisions:

| Item | Result |
| --- | --- |
| Backup inventory | passed |
| Protected backup artifact | created |
| PostgreSQL dump | valid |
| MinIO archive | valid |
| Server-only files | copied without printing |
| Restore metadata dry-run | passed |
| Production restore | not performed |
| Database restore | not performed |
| MinIO restore | not performed |
| Volume deletion | not performed |
| Service restart | not performed |
| Secret printing | not performed |

PostgreSQL clarification:

- current production PostgreSQL public table count is `0`;
- current PostgreSQL dump is valid but minimal;
- future backups after migrations/data should include schema/table markers.

## 9. Final local gate command list

Required final gate commands:

| Check | Command |
| --- | --- |
| Stage 9 final gate guard | `python .\scripts\check_production_stage9_final_gate.py` |
| Handover package guard | `python .\scripts\check_production_handover_package.py` |
| Maintenance checklist guard | `python .\scripts\check_production_maintenance_update_checklist.py` |
| Operational runbook guard | `python .\scripts\check_production_operational_runbook.py` |
| Backup verification guard | `python .\scripts\check_production_backup_verification.py` |
| Production smoke | `python .\scripts\smoke_production_monitoring.py` |
| Production smoke guard | `python .\scripts\check_production_monitoring_smoke.py` |
| Operations baseline guard | `python .\scripts\check_production_operations_baseline.py` |
| DNS verification guard | `python .\scripts\check_production_domain_dns_verification.py` |
| Reverse proxy decision guard | `python .\scripts\check_production_domain_reverse_proxy_decision.py` |
| Server remediation guard | `python .\scripts\check_production_server_remediation_plan.py` |
| Fact collection guard | `python .\scripts\check_production_fact_collection_result.py` |
| Server preflight guard | `python .\scripts\check_production_server_preflight_execution.py` |
| Server facts guard | `python .\scripts\check_production_server_facts.py` |
| Rollout inventory guard | `python .\scripts\check_production_rollout_inventory.py` |
| Deployment runbook guard | `python .\scripts\check_production_deployment_runbook.py` |
| Backup monitoring checklist guard | `python .\scripts\check_production_backup_monitoring_checklist.py` |
| Reverse proxy checklist guard | `python .\scripts\check_production_reverse_proxy_checklist.py` |
| Server checklist guard | `python .\scripts\check_production_server_checklist.py` |
| Environment template guard | `python .\scripts\check_production_environment_template.py` |
| Deployment plan guard | `python .\scripts\check_production_deployment_plan.py` |
| CI local gate | `python .\scripts\check_ci_local_gate.py` |
| Release readiness | `python .\scripts\check_release_readiness.py` |
| Frontend smoke | `python .\scripts\smoke_frontend_core.py` |
| Frontend coverage | `python .\scripts\check_frontend_smoke_coverage.py` |
| TODO guard | `python .\scripts\check_no_todo_markers.py` |
| BOM guard | `python .\scripts\check_source_bom.py` |
| Encoding guard | `python .\scripts\check_text_encoding.py` |

## 10. Final safety boundaries

Forbidden without explicit separate production plan:

- do not print production `.env`;
- do not print secret values;
- do not commit `.env`;
- do not commit server-only override;
- do not commit server-only Caddyfile;
- do not commit backup artifacts;
- do not upload backup artifacts to public storage;
- do not run `docker compose down -v`;
- do not delete Docker volumes;
- do not restore production database;
- do not restore production MinIO data;
- do not expose private service ports publicly;
- do not touch `amnezia-awg` unless the incident is VPN-specific.

## 11. Main branch readiness decision

`main` is not updated in this step.

Criteria before fast-forwarding `main`:

- Stage 9 final gate document exists;
- Stage 9 final gate guard exists;
- full diagnostics pass;
- README Stage 9 final checkpoint is committed;
- `develop` is clean and pushed;
- `main` can be updated with `git merge --ff-only develop`;
- post-merge branch state is verified.

## 12. Acceptance criteria

Stage 9 final gate is accepted when:

- final gate document exists;
- final gate diagnostics guard exists;
- all Stage 9 documents are listed;
- all Stage 9 guards are listed;
- production smoke passes;
- backup and restore status is documented;
- safety boundaries are documented;
- `main` fast-forward decision is explicitly deferred;
- all existing production diagnostics remain green.
