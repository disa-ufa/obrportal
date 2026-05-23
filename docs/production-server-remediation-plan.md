# Production server remediation plan

## Purpose

This document defines the safe remediation plan required before real ObrPortal rollout to the production server.

It is based on sanitized server facts collected on 2026-05-23 and must not contain passwords, tokens, private keys, production `.env` values or any other secrets.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 current checkpoint: `861886c`

## Source documents

- `docs/production-server-facts.md`
- `docs/production-fact-collection-result.md`
- `docs/production-server-preflight-execution.md`
- `docs/production-deployment-runbook.md`
- `docs/production-environment-template.md`

## Current sanitized server state

| Item | State | Notes |
| --- | --- | --- |
| Server | `306733.fornex.cloud` | Public IP: `89.127.203.70`. |
| OS | `Ubuntu 24.04.4 LTS` | Kernel `6.8.0-110-generic`. |
| Docker Engine | `installed` | Docker `29.1.3`. |
| Docker Compose plugin | `missing` | `docker compose` unavailable. |
| Git | `installed` | Git `2.43.0`. |
| Application directory | `missing` | `/opt/obrportal` must be created. |
| Backup directory | `missing` | `/opt/obrportal-backups` must be created. |
| Production `.env` | `missing` | Must be created manually on server. |
| Reverse proxy | `missing` | Nginx and Caddy are absent. |
| Existing container | `amnezia-awg` | Must not be removed or broken. |
| Existing UDP port | `34503/udp` | Used by `amnezia-awg`. |
| Public HTTP/HTTPS | `not configured` | Ports `80` and `443` not observed as listeners. |

## Remediation order

Recommended order:

1. Confirm existing `amnezia-awg` container must remain untouched.
2. Install Docker Compose plugin.
3. Create application and backup directories.
4. Create backup subdirectories.
5. Choose reverse proxy: Nginx or Caddy.
6. Install selected reverse proxy.
7. Create production `.env` manually on the server.
8. Clone repository into `/opt/obrportal`.
9. Checkout the required release tag or approved deployment commit.
10. Run safe verification commands.

## Step 1 - preserve existing container

Before changing Docker or network configuration, record current container state:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
docker inspect amnezia-awg --format '{{.Name}} {{.State.Status}} {{json .NetworkSettings.Ports}}' || true
```

Acceptance:

- `amnezia-awg` remains running after remediation.
- UDP `34503` remains untouched unless explicitly migrated outside this plan.

## Step 2 - install Docker Compose plugin

Ubuntu package approach:

```bash
apt-get update
apt-get install -y docker-compose-v2
docker compose version
```

Alternative package name if needed:

```bash
apt-cache search docker-compose
apt-get install -y docker-compose-plugin
docker compose version
```

Acceptance:

- `docker compose version` returns a valid version.
- Existing `amnezia-awg` container remains running.

## Step 3 - create directories

```bash
mkdir -p /opt/obrportal
mkdir -p /opt/obrportal-backups
mkdir -p /opt/obrportal-backups/env
mkdir -p /opt/obrportal-backups/postgres
mkdir -p /opt/obrportal-backups/storage
mkdir -p /opt/obrportal-backups/proxy
mkdir -p /opt/obrportal-backups/deployment
chmod 700 /opt/obrportal-backups/env
ls -ld /opt/obrportal /opt/obrportal-backups /opt/obrportal-backups/env
```

Acceptance:

- `/opt/obrportal` exists.
- `/opt/obrportal-backups` exists.
- `/opt/obrportal-backups/env` is restricted.

## Step 4 - choose reverse proxy

Choose one option before installation:

| Option | Status | Notes |
| --- | --- | --- |
| Nginx | `<pending>` | Traditional reverse proxy. |
| Caddy | `<pending>` | Simpler HTTPS automation. |

Recommended for faster rollout:

- Caddy, if automatic HTTPS and simple config are preferred.
- Nginx, if the server already has standard Nginx operations or required custom config.

## Step 5A - install Caddy

Use only if Caddy is selected:

```bash
apt-get update
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update
apt-get install -y caddy
caddy version
systemctl status caddy --no-pager
```

## Step 5B - install Nginx

Use only if Nginx is selected:

```bash
apt-get update
apt-get install -y nginx
nginx -v
nginx -t
systemctl status nginx --no-pager
```

## Step 6 - clone repository

```bash
cd /opt/obrportal
git clone https://github.com/disa-ufa/obrportal.git .
git fetch origin --tags
git status --short
git branch -vv || true
git tag --list v0.1.0-stage6
```

Acceptance:

- Repository exists in `/opt/obrportal`.
- Release tag `v0.1.0-stage6` is available.

## Step 7 - production `.env` creation

Production `.env` must be created manually on the server.

Rules:

- Do not commit `.env`.
- Do not paste `.env` into chat or logs.
- Do not print `.env` with `cat` in shared output.
- Use `docs/production-environment-template.md` as the source checklist.

Allowed safe checks:

```bash
test -f /opt/obrportal/.env && echo '.env exists' || echo '.env missing'
ls -l /opt/obrportal/.env
```

## Step 8 - post-remediation verification

Run on server:

```bash
docker --version
docker compose version
git --version
test -d /opt/obrportal && echo '/opt/obrportal exists'
test -d /opt/obrportal-backups && echo '/opt/obrportal-backups exists'
test -f /opt/obrportal/.env && echo '.env exists' || echo '.env missing'
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ss -tulpen || true
```

Run locally after updating sanitized docs:

```powershell
python .\scripts\check_production_fact_collection_result.py
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

- Existing `amnezia-awg` container is preserved.
- Docker Compose plugin is available.
- `/opt/obrportal` exists.
- `/opt/obrportal-backups` exists.
- Backup subdirectories exist.
- Reverse proxy decision is made.
- Selected reverse proxy is installed or explicitly deferred.
- Production `.env` creation procedure is documented.
- Production `.env` is not committed.
- Safe verification commands are documented.
- No secrets are committed to Git.

## Remediation diagnostics

Required diagnostic command:

- `python .\scripts\check_production_server_remediation_plan.py`

## Remediation execution result - 2026-05-23

Source: local safe remediation output `tmp/stage_8_7_1_server_remediation.txt` (not committed).
Secret marker scan result: passed.

Completed:

- Docker Compose plugin installed.
- `/opt/obrportal` created.
- `/opt/obrportal-backups` created.
- Backup subdirectories created: `env`, `postgres`, `storage`, `proxy`, `deployment`.
- `/opt/obrportal-backups/env` restricted with `chmod 700`.
- Existing `amnezia-awg` container preserved.
- Existing UDP `34503` preserved.
- Production `.env` content was not printed.
- Reverse proxy installation intentionally deferred.

Verified safe post-remediation state:

| Check | Result |
| --- | --- |
| `docker compose version` | `Docker Compose version 2.40.3+ds1-0ubuntu1~24.04.1` |
| `/opt/obrportal` | `exists` |
| `/opt/obrportal-backups` | `exists` |
| `/opt/obrportal-backups/env` | `exists, chmod 700` |
| `/opt/obrportal/.env` | `missing` |
| `amnezia-awg` | `running` |
| UDP `34503` | `active` |
| reverse proxy | `not installed yet` |

Remaining blockers:

- production `.env` must be created manually;
- production domain must be selected/configured;
- reverse proxy must be selected and installed;
- repository must be cloned into `/opt/obrportal`;
- rollout deployment must be executed only after another safe verification.

## Repository workspace remediation result - 2026-05-24

Completed:

- `/opt/obrportal` prepared as deployment workspace;
- repository cloned from `https://github.com/disa-ufa/obrportal.git`;
- branch `develop` checked out;
- server HEAD verified: `61867f063f82c8f2c3ed2553b64b535eeaf74e90`;
- release tag `v0.1.0-stage6` verified;
- key files and directories verified: `docker-compose.yml`, `.env.example`, `backend`, `frontend`, `docs`, `scripts`;
- production `.env` remained missing and was not printed;
- Docker Compose was not started;
- Caddy placeholder remained active;
- existing `amnezia-awg` and UDP `34503` remained preserved.

Remaining remediation:

- create production `.env`;
- deploy app stack;
- replace placeholder Caddy response with production reverse proxy routes.
