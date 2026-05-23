# Production fact collection result

## Purpose

This document records the sanitized result of production server fact collection before real ObrPortal deployment.

It must not contain passwords, tokens, private keys, production `.env` values or any other secrets.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 rollout inventory checkpoint: `415f3dd`
- Stage 8 server facts checkpoint: `f2b1d13`
- Stage 8 preflight checkpoint: `53066d6`

## Source documents

- `docs/production-server-preflight-execution.md`
- `docs/production-server-facts.md`
- `docs/production-rollout-inventory.md`
- `docs/production-deployment-runbook.md`

## Collection status

| Item | Status | Notes |
| --- | --- | --- |
| Local preflight completed | `<pending>` | Guards must pass before server access. |
| Server access checked | `<pending>` | Record only non-secret facts. |
| Capacity checked | `<pending>` | Disk/RAM/uptime summary only. |
| Docker checked | `<pending>` | Docker and Compose versions. |
| Git checked | `<pending>` | Git version. |
| Directories checked | `<pending>` | `/opt/obrportal` and backups. |
| Network ports checked | `<pending>` | Sanitized exposure summary. |
| Reverse proxy checked | `<pending>` | Nginx or Caddy. |
| `.env` existence checked | `<pending>` | Do not print content. |
| Backup root checked | `<pending>` | `/opt/obrportal-backups`. |
| Server facts updated | `<pending>` | Update `docs/production-server-facts.md`. |

## Sanitized server facts summary

| Fact | Value | Notes |
| --- | --- | --- |
| Provider | `<pending>` | No credentials. |
| Server name | `<pending>` | Human-readable. |
| Server public IP | `<pending>` | Public IP only. |
| Operating system | `<pending>` | Example: Ubuntu 22.04 LTS. |
| CPU/RAM/Disk summary | `<pending>` | Capacity summary only. |
| SSH user | `<pending>` | Username only. |
| Application directory | `/opt/obrportal` | Expected path. |
| Backup directory | `/opt/obrportal-backups` | Expected path. |
| Reverse proxy | `<pending>` | Nginx or Caddy. |
| Production domain | `<pending>` | Public domain. |
| HTTPS status | `<pending>` | Planned/enabled. |

## Sanitized command result checklist

Do not paste secret values. Record only safe summaries.

| Command group | Result | Notes |
| --- | --- | --- |
| `whoami`, `hostname`, `hostnamectl`, `uname -a` | `<pending>` | Server identity summary. |
| `df -h`, `free -h`, `uptime` | `<pending>` | Capacity summary. |
| `docker --version`, `docker compose version` | `<pending>` | Runtime availability. |
| `git --version` | `<pending>` | Git availability. |
| directory checks | `<pending>` | Required paths exist/missing. |
| port checks | `<pending>` | Public/private exposure summary. |
| reverse proxy checks | `<pending>` | Nginx/Caddy status. |
| `.env` existence check | `<pending>` | Exists/missing only. |
| backup root check | `<pending>` | Exists/missing only. |

## Server facts update target

After collecting facts, update only non-secret values in:

- `docs/production-server-facts.md`

Keep `<pending>` for unknown facts.

Never commit:

- passwords;
- tokens;
- private keys;
- production `.env` values;
- database credentials;
- storage credentials;
- session secrets;
- API secrets.

## Local verification after fact update

```powershell
python .\scripts\check_production_server_preflight_execution.py
python .\scripts\check_production_server_facts.py
python .\scripts\check_production_rollout_inventory.py
python .\scripts\check_production_deployment_runbook.py
python .\scripts\check_production_backup_monitoring_checklist.py
python .\scripts\check_production_reverse_proxy_checklist.py
python .\scripts\check_production_server_checklist.py
python .\scripts\check_production_environment_template.py
python .\scripts\check_production_deployment_plan.py
python .\scripts\check_ci_local_gate.py
python .\scripts\check_release_readiness.py
python .\scripts\check_no_todo_markers.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
```

## Acceptance criteria

- Fact collection result document exists.
- Secret-safe collection status is documented.
- Sanitized server facts summary is documented.
- Sanitized command result checklist is documented.
- Server facts update target is documented.
- Secret exclusion rules are documented.
- Local verification commands are documented.
- No secrets are committed to Git.

## Result diagnostics

Required diagnostic command:

- `python .\scripts\check_production_fact_collection_result.py`

## Collection result snapshot - 2026-05-23

Source: local safe preflight output `tmp/stage_8_5_2_server_preflight.txt` (not committed).
Secret marker scan result: passed.

| Item | Result | Notes |
| --- | --- | --- |
| Local preflight completed | `done` | Stage 8 local guards passed before server access. |
| Server access checked | `done` | SSH access to `root@89.127.203.70` succeeded. |
| Capacity checked | `done` | `/` disk 20G total, 23% used; RAM 1.9Gi; swap 0B. |
| Docker checked | `partial` | Docker exists, Docker Compose command is unavailable. |
| Git checked | `done` | Git 2.43.0 installed. |
| Directories checked | `missing` | `/opt/obrportal` and `/opt/obrportal-backups` missing. |
| Network ports checked | `done` | SSH 22 public; existing UDP 34503 for `amnezia-awg`. |
| Reverse proxy checked | `missing` | Nginx and Caddy not installed. |
| `.env` existence checked | `missing` | `/opt/obrportal/.env` missing; no content printed. |
| Backup root checked | `missing` | `/opt/obrportal-backups` missing. |
| Server facts updated | `done` | Safe facts snapshot added to `docs/production-server-facts.md`. |

### Sanitized server facts summary

| Fact | Value | Notes |
| --- | --- | --- |
| Provider | `Fornex / inferred from hostname` | Hostname uses `fornex.cloud`. |
| Server name | `306733.fornex.cloud` | From safe preflight. |
| Server public IP | `89.127.203.70` | Public IP only. |
| Operating system | `Ubuntu 24.04.4 LTS` | Non-secret. |
| CPU/RAM/Disk summary | `x86-64; RAM 1.9Gi; / disk 20G, 23% used; swap 0B` | Capacity summary only. |
| SSH user | `root` | Username only. |
| Application directory | `/opt/obrportal missing` | Must be created. |
| Backup directory | `/opt/obrportal-backups missing` | Must be created. |
| Reverse proxy | `missing` | Nginx/Caddy absent. |
| Production domain | `<pending>` | Not configured in this preflight. |
| HTTPS status | `not configured` | Reverse proxy is missing. |

### Required remediation before rollout

- Install Docker Compose plugin.
- Create application and backup directories.
- Choose/install reverse proxy.
- Create production `.env` securely on the server.
- Configure domain and HTTPS.
- Confirm existing `amnezia-awg` container/UDP `34503` must remain untouched.

## Remediation result snapshot - 2026-05-23

Source: local safe remediation output `tmp/stage_8_7_1_server_remediation.txt` (not committed).
Secret marker scan result: passed.

| Item | Before remediation | After remediation | Notes |
| --- | --- | --- | --- |
| Docker Compose plugin | `missing` | `installed` | Docker Compose `2.40.3+ds1-0ubuntu1~24.04.1`. |
| Application directory | `missing` | `exists` | `/opt/obrportal`. |
| Backup directory | `missing` | `exists` | `/opt/obrportal-backups`. |
| Backup subdirectories | `missing` | `created` | `env`, `postgres`, `storage`, `proxy`, `deployment`. |
| Backup env permissions | `missing` | `chmod 700` | `/opt/obrportal-backups/env`. |
| Production `.env` | `missing` | `missing` | Content not printed. |
| Reverse proxy | `missing` | `not installed yet` | Deferred. |
| Existing `amnezia-awg` container | `running` | `running` | Preserved. |
| Existing UDP `34503` | `active` | `active` | Preserved. |
| Secret marker scan | `not applicable` | `passed` | No secret-like markers found in remediation log. |

### Remaining remediation tasks

- Create production `.env` manually and securely.
- Decide reverse proxy: Caddy or Nginx.
- Install and configure selected reverse proxy.
- Clone repository into `/opt/obrportal`.
- Run deployment smoke checks.
