# Production server facts

## Purpose

This document records non-secret facts about the real production deployment target for ObrPortal.

It must not contain passwords, tokens, private keys, production `.env` values or any other secrets.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 rollout inventory baseline: `415f3dd`

## Server identity

| Item | Value | Notes |
| --- | --- | --- |
| Provider | `<pending>` | Cloud/VPS/provider name. |
| Server name | `<pending>` | Human-readable server name. |
| Server public IP | `<pending>` | Public IP only, no credentials. |
| Server private IP | `<pending>` | Optional internal IP. |
| Operating system | `<pending>` | Example: Ubuntu 22.04 LTS. |
| CPU/RAM/Disk | `<pending>` | Capacity summary. |
| SSH user | `<pending>` | Username only, no SSH keys. |
| SSH access policy | `<pending>` | Password disabled, key-only, restricted IPs, etc. |

## Deployment paths

| Item | Value | Notes |
| --- | --- | --- |
| Application directory | `/opt/obrportal` | Main application checkout. |
| Backup directory | `/opt/obrportal-backups` | Backups outside disposable container lifecycle. |
| Environment file | `/opt/obrportal/.env` | Must exist only on server. |
| Reverse proxy config path | `<pending>` | Example: `/etc/nginx` or `/etc/caddy`. |
| Docker Compose file | `/opt/obrportal/docker-compose.yml` | Main compose file. |
| Storage volume/path | `<pending>` | MinIO volume, S3 bucket or provider storage. |

## Domain and HTTPS facts

| Item | Value | Notes |
| --- | --- | --- |
| Primary domain | `<pending>` | Production public domain. |
| Frontend URL | `<pending>` | HTTPS frontend entrypoint. |
| Backend public URL | `<pending>` | Same domain or API subdomain. |
| API prefix | `/api/` | Backend route prefix. |
| Health URL | `<pending>/health` | Replace with real domain. |
| Readiness URL | `<pending>/api/v1/ready` | Replace with real domain. |
| HTTPS provider | `<pending>` | Let's Encrypt, provider certificate, etc. |
| Certificate auto-renewal | `<pending>` | Required before acceptance. |

## Reverse proxy facts

| Item | Value | Notes |
| --- | --- | --- |
| Reverse proxy | `<pending>` | Nginx or Caddy. |
| HTTP to HTTPS redirect | `<pending>` | Must be enabled. |
| SPA fallback configured | `<pending>` | Required for frontend routes. |
| `/health` proxy configured | `<pending>` | Must proxy to backend. |
| `/api/v1/ready` proxy configured | `<pending>` | Must proxy to backend. |
| `/api/` proxy configured | `<pending>` | Must proxy to backend. |
| Reverse proxy backup prepared | `<pending>` | Required before config changes. |

## Docker and runtime facts

| Item | Value | Notes |
| --- | --- | --- |
| Docker installed | `<pending>` | `docker --version`. |
| Docker Compose installed | `<pending>` | `docker compose version`. |
| Git installed | `<pending>` | `git --version`. |
| Deployment mode | `docker compose` | Current rollout mode. |
| Backend service | `backend` | FastAPI service. |
| Frontend service | `frontend` | Vite/frontend service. |
| PostgreSQL service | `postgres` | Database service. |
| Redis service | `redis` | Cache/session/support service. |
| Object storage service | `minio` | Or external S3-compatible storage. |

## Port exposure facts

| Port | Expected exposure | Actual status | Notes |
| --- | --- | --- | --- |
| `22` | restricted public | `<pending>` | SSH only. |
| `80` | public | `<pending>` | HTTP redirect to HTTPS. |
| `443` | public | `<pending>` | Main HTTPS entrypoint. |
| `8000` | private/reverse proxy only | `<pending>` | Backend should not be directly public. |
| `5173` | private/reverse proxy only | `<pending>` | Frontend should not be directly public. |
| `5432` | private only | `<pending>` | PostgreSQL must not be public. |
| `6379` | private only | `<pending>` | Redis must not be public. |
| `9000` | restricted/private | `<pending>` | MinIO API. |
| `9001` | restricted/private | `<pending>` | MinIO console. |

## Production environment facts

| Item | Value | Notes |
| --- | --- | --- |
| `.env` exists on server | `<pending>` | Do not commit it. |
| `APP_ENV` | `production` | Required value. |
| `APP_VERSION` | `0.1.0-stage6` | Required value. |
| `SECRET_KEY` generated | `<pending>` | Do not record the value here. |
| PostgreSQL credentials generated | `<pending>` | Do not record the values here. |
| Storage credentials generated | `<pending>` | Do not record the values here. |
| CORS production origins configured | `<pending>` | Production origins only. |

## Backup and rollback facts

| Item | Value | Notes |
| --- | --- | --- |
| Backup root exists | `<pending>` | `/opt/obrportal-backups`. |
| PostgreSQL backup tested | `<pending>` | Required before rollout acceptance. |
| Object storage backup selected | `<pending>` | Volume snapshot, S3 sync or provider backup. |
| `.env` backup prepared | `<pending>` | Secure permissions required. |
| Reverse proxy backup prepared | `<pending>` | Required before proxy changes. |
| Rollback commit recorded | `<pending>` | Required before deployment. |
| Rollback tag recorded | `v0.1.0-stage6` | Release fallback tag. |

## Server preflight commands

Run on the production server and record only non-secret results:

```bash
docker --version
docker compose version
git --version
df -h
free -h
uname -a
```

## Production acceptance criteria

- Real production server identity is recorded.
- Real production domain is recorded.
- Reverse proxy choice is recorded.
- Docker and Docker Compose availability is recorded.
- Required directories are recorded.
- Required port exposure model is recorded.
- Production `.env` status is recorded without secrets.
- Backup readiness is recorded.
- Rollback readiness is recorded.
- No secrets are committed to Git.

## Facts diagnostics

Required diagnostic command:

- `python .\scripts\check_production_server_facts.py`

## Collected safe facts - 2026-05-23

Source: local safe preflight output `tmp/stage_8_5_2_server_preflight.txt` (not committed).
Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Provider | `Fornex / inferred from hostname` | Hostname uses `fornex.cloud`. |
| Server name | `306733.fornex.cloud` | From `hostname`. |
| Server public IP | `89.127.203.70` | SSH target used for preflight. |
| Operating system | `Ubuntu 24.04.4 LTS` | From `hostnamectl`. |
| Kernel | `Linux 6.8.0-110-generic` | From `uname -a`. |
| Virtualization | `kvm / QEMU` | From `hostnamectl`. |
| SSH user | `root` | Username only; no credentials recorded. |
| SSH access policy | `interactive root SSH login works` | Harden to key-only/restricted IP before production acceptance. |
| CPU/RAM/Disk summary | `x86-64; RAM 1.9Gi; / disk 20G, 23% used; swap 0B` | Capacity summary only. |
| Uptime/load | `30 days 7:04; load 0.00, 0.00, 0.00` | From safe preflight. |
| Docker installed | `yes, Docker 29.1.3` | Docker engine exists. |
| Docker Compose installed | `no / unavailable` | `docker compose` returned unknown command. |
| Git installed | `yes, Git 2.43.0` | Git exists. |
| Existing container | `amnezia-awg` | Existing container must not be broken by rollout. |
| Existing public UDP port | `34503/udp` | Used by `amnezia-awg`. |
| Application directory | `/opt/obrportal missing` | Must be created before rollout. |
| Backup directory | `/opt/obrportal-backups missing` | Must be created before rollout. |
| Reverse proxy | `not installed` | Nginx and Caddy are both missing. |
| Production `.env` | `missing` | Do not print or commit real `.env` values. |
| Backup root | `missing` | Must be prepared before deployment. |
| Observed TCP ports | `22 public; 45289 localhost containerd` | No 80/443/8000/5173/5432/6379 listeners observed. |
| Observed UDP ports | `34503 public` | Existing Docker proxy for `amnezia-awg`. |

### Immediate rollout blockers

- Install or enable Docker Compose plugin.
- Create `/opt/obrportal`.
- Create `/opt/obrportal-backups`.
- Choose and install reverse proxy: Nginx or Caddy.
- Create production `.env` on server without committing it.
- Prepare backup directories before deployment.
- Preserve or explicitly account for existing `amnezia-awg` container and UDP `34503`.

## Post-remediation safe facts - 2026-05-23

Source: local safe remediation output `tmp/stage_8_7_1_server_remediation.txt` (not committed).
Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Docker Compose installed | `yes, Docker Compose 2.40.3+ds1-0ubuntu1~24.04.1` | Installed via `docker-compose-v2`. |
| Application directory | `/opt/obrportal exists` | Created during remediation. |
| Backup directory | `/opt/obrportal-backups exists` | Created during remediation. |
| Backup env directory | `/opt/obrportal-backups/env exists, chmod 700` | Restricted backup directory. |
| Backup postgres directory | `/opt/obrportal-backups/postgres exists` | Created. |
| Backup storage directory | `/opt/obrportal-backups/storage exists` | Created. |
| Backup proxy directory | `/opt/obrportal-backups/proxy exists` | Created. |
| Backup deployment directory | `/opt/obrportal-backups/deployment exists` | Created. |
| Production `.env` | `missing` | Content was not printed. |
| Reverse proxy | `not installed yet` | Deferred until domain/proxy decision. |
| Existing container | `amnezia-awg running` | Preserved after remediation. |
| Existing public UDP port | `34503/udp` | Preserved after remediation. |
| Observed TCP ports | `22 public; 45289 localhost containerd` | No 80/443 listeners yet. |

### Remaining rollout blockers after remediation

- Create production `.env` manually on server.
- Choose production domain.
- Choose and install reverse proxy: Nginx or Caddy.
- Clone repository into `/opt/obrportal`.
- Configure deployment commit/tag.
- Configure HTTPS after domain decision.

## Caddy HTTPS entrypoint safe facts - 2026-05-23

Source: local Caddy installation output `tmp/stage_8_11_1_caddy_install.txt` (not committed) and local HTTPS checks.
Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Reverse proxy | `Caddy installed` | Version `v2.11.3`. |
| Caddy service | `active/running` | `systemctl status caddy` confirmed service is running. |
| Production domain | `portal.rcdo02.ru` | DNS already points to `89.127.203.70`. |
| HTTP port | `80 open` | Local `Test-NetConnection` passed. |
| HTTPS port | `443 open` | Local `Test-NetConnection` passed. |
| HTTP behavior | `308 Permanent Redirect` | Redirects to HTTPS. |
| HTTPS behavior | `200 OK` | Temporary entrypoint returns placeholder response. |
| HTTPS response body | `ObrPortal HTTPS entrypoint is ready. Backend/frontend deployment is pending.` | Temporary placeholder before backend/frontend deployment. |
| Security headers | `X-Content-Type-Options`, `Referrer-Policy` | Present in HTTPS response. |
| Existing container | `amnezia-awg running` | Preserved after Caddy installation. |
| Existing UDP port | `34503/udp active` | Preserved after Caddy installation. |
| Production `.env` | `not printed` | No `.env` content was exposed. |

### Remaining rollout blockers after HTTPS entrypoint

- Clone repository into `/opt/obrportal`.
- Create production `.env` securely on the server.
- Deploy backend/frontend services.
- Replace temporary Caddy placeholder with reverse proxy routes to frontend/backend.
- Run deployment smoke checks for `/`, `/health`, `/api/v1/ready`.

## Repository workspace safe facts - 2026-05-24

Source: local repository workspace output `tmp/stage_8_12_1_repository_workspace.txt` (not committed).
Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Application directory | `/opt/obrportal` | Repository workspace prepared. |
| Repository URL | `https://github.com/disa-ufa/obrportal.git` | Public repository. |
| Server branch | `develop` | Deployment workspace branch. |
| Server HEAD | `61867f063f82c8f2c3ed2553b64b535eeaf74e90` | Stage 8.11 checkpoint. |
| Server origin/develop | `61867f063f82c8f2c3ed2553b64b535eeaf74e90` | Matches server HEAD. |
| Release tag | `v0.1.0-stage6` | Available on server. |
| Release tag commit | `ac6f339d40567a107dd19f02ec778fbeb5e19971` | Stage 6 release baseline. |
| Production `.env` | `missing` | Content was not printed. |
| Compose status | `not started` | `docker compose` was not run. |
| Caddy placeholder | `preserved` | HTTPS placeholder still returns `200 OK`. |
| Existing `amnezia-awg` | `preserved` | Container remains running. |
| Existing UDP `34503` | `preserved` | Port remains active. |
| `docker-compose.yml` | `exists` | Key deployment file present. |
| `.env.example` | `exists` | Template file present. |
| `backend` | `exists` | Backend directory present. |
| `frontend` | `exists` | Frontend directory present. |
| `docs` | `exists` | Docs directory present. |
| `scripts` | `exists` | Scripts directory present. |

### Remaining rollout blockers after repository workspace preparation

- Create production `.env` securely on the server.
- Run safe production `.env` presence/permissions checks without printing values.
- Start Docker Compose only after `.env` is prepared.
- Replace temporary Caddy placeholder with reverse proxy routes after app services are healthy.
- Run deployment smoke checks for `/`, `/health`, `/api/v1/ready`.

## Production environment safe facts - 2026-05-24

Source: local safe environment audit output `tmp/stage_8_13_1_env_safe_audit.txt` (not committed).
Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Production `.env` | `exists` | Created on server from `.env.example` and filled manually. |
| `.env.example` | `exists` | Used as baseline. |
| `.env` permissions | `600` | Owner-only read/write. |
| `.env` owner | `root:root` | Verified by safe audit. |
| Example key count | `42` | Values were not printed. |
| Environment key count | `42` | Values were not printed. |
| Missing key count | `0` | `.env` matches `.env.example` key set. |
| Extra key count | `0` | No unexpected keys versus `.env.example`. |
| Empty value count | `0` | No empty values detected. |
| Placeholder value count | `0` | No placeholder-like values detected. |
| Environment values | `not printed` | Safe audit did not expose values. |
| Environment key names | `not printed` | Safe audit did not expose key names. |
| Docker Compose | `not started` | App stack still not started. |
| Caddy placeholder | `preserved` | HTTPS placeholder still returns `200 OK`. |
| Existing `amnezia-awg` | `preserved` | Container remains running. |
| Existing UDP `34503` | `preserved` | Port remains active. |

### Remaining rollout blockers after production `.env` preparation

- Run final pre-compose safety check.
- Start Docker Compose stack.
- Verify backend health/readiness locally on server.
- Replace temporary Caddy placeholder with reverse proxy routes after app services are healthy.
- Run public deployment smoke checks for `/`, `/health`, `/api/v1/ready`.

## Docker Compose startup and localhost port bind safe facts - 2026-05-24

Sources:

- `tmp/stage_8_14_1_pre_compose_safety.txt` (not committed);
- `tmp/stage_8_14_2_compose_startup.txt` (not committed);
- `tmp/stage_8_14_2a_localhost_port_bind_override.txt` (not committed, failed first override attempt);
- `tmp/stage_8_14_2a_localhost_port_bind_override_fix.txt` (not committed, final successful result).

Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Workspace HEAD | `4686cf5b58701be138582ae5fe5fe6a616965a12` | Matches `origin/develop` at startup. |
| Pre-compose safety check | `passed` | `.env`, workspace, Caddy and `amnezia-awg` checked before startup. |
| Compose config | `valid` | Validated before startup. |
| First compose startup | `compose_exit_code=0` | App stack started successfully. |
| Initial security finding | `external service ports exposed` | `8000`, `5173`, `5432`, `6379`, `9000`, `9001` were exposed on `0.0.0.0` by base compose config. |
| Remediation | `docker-compose.override.yml` | Added production localhost-only port bindings. |
| First override attempt | `failed` | Lists were merged; Redis bind conflict occurred. |
| Override fix | `ports: !override` | Replaced base port lists instead of merging them. |
| Fixed compose startup | `compose_exit_code=0` | Stack recreated successfully. |
| Backend local health | `ok` | `http://127.0.0.1:8000/health` returned OK. |
| Backend local readiness | `ok` | `http://127.0.0.1:8000/api/v1/ready` returned OK. |
| Frontend local check | `HTTP/1.1 200 OK` | `http://127.0.0.1:5173` responded. |
| Backend bind | `127.0.0.1:8000` | Not exposed directly to public network. |
| Frontend bind | `127.0.0.1:5173` | Not exposed directly to public network. |
| PostgreSQL bind | `127.0.0.1:5432` | Not exposed directly to public network. |
| Redis bind | `127.0.0.1:6379` | Not exposed directly to public network. |
| MinIO API bind | `127.0.0.1:9000` | Not exposed directly to public network. |
| MinIO console bind | `127.0.0.1:9001` | Not exposed directly to public network. |
| Caddy placeholder | `preserved` | Still returns `HTTP/2 200`. |
| Existing `amnezia-awg` | `preserved` | Container remains running. |
| Existing UDP `34503` | `preserved` | Port remains active. |
| Environment values | `not printed` | `.env` content was not exposed. |
| Environment key names | `not printed` | `.env` key names were not exposed. |

### Remaining rollout blockers after Docker Compose startup

- Replace temporary Caddy placeholder with reverse proxy routes.
- Verify public URLs through Caddy: `/`, `/health`, `/api/v1/ready`.
- Run public smoke checks through `https://portal.rcdo02.ru`.
- Record reverse proxy route result in documentation.

## Caddy reverse proxy route activation safe facts - 2026-05-24

Sources:

- `tmp/stage_8_15_1_caddy_routes_activation.txt` (not committed, first activation with frontend `403`);
- `tmp/stage_8_15_1a_caddy_frontend_host_fix.txt` (not committed, final successful result).

Secret marker scan result: passed.

| Fact | Value | Notes |
| --- | --- | --- |
| Domain | `portal.rcdo02.ru` | Production domain. |
| Caddyfile backup | `created` | Existing `/etc/caddy/Caddyfile` was backed up before replacement. |
| Caddy validation | `caddy_validate_exit_code=0` | Configuration valid. |
| Caddy reload | `caddy_reload_exit_code=0` | Reload successful. |
| Initial frontend route | `HTTP/2 403` | Vite frontend rejected public Host header. |
| Frontend route fix | `header_up Host 127.0.0.1:5173` | Applied for frontend upstream. |
| Public frontend | `200` | `https://portal.rcdo02.ru` returns frontend HTML. |
| Public health | `200` | `https://portal.rcdo02.ru/health` returns backend health. |
| Public readiness | `200` | `https://portal.rcdo02.ru/api/v1/ready` returns backend readiness. |
| Backend local health | `ok` | Local backend remained healthy. |
| Backend local readiness | `ok` | Local backend readiness remained healthy. |
| Frontend local check | `HTTP/1.1 200 OK` | Local frontend remained healthy. |
| Backend bind | `127.0.0.1:8000` | Private localhost-only. |
| Frontend bind | `127.0.0.1:5173` | Private localhost-only. |
| PostgreSQL bind | `127.0.0.1:5432` | Private localhost-only. |
| Redis bind | `127.0.0.1:6379` | Private localhost-only. |
| MinIO API bind | `127.0.0.1:9000` | Private localhost-only. |
| MinIO console bind | `127.0.0.1:9001` | Private localhost-only. |
| Public HTTP/HTTPS | `Caddy only` | Caddy remains the public HTTP/HTTPS entrypoint. |
| Existing `amnezia-awg` | `preserved` | Container remains running. |
| Existing UDP `34503` | `preserved` | Port remains active. |
| Environment values | `not printed` | `.env` content was not exposed. |
| Environment key names | `not printed` | `.env` key names were not exposed. |

### Active Caddy route model

- `/health` -> `127.0.0.1:8000`;
- `/api/*` -> `127.0.0.1:8000`;
- `/` and frontend assets -> `127.0.0.1:5173`;
- frontend upstream receives `Host: 127.0.0.1:5173`;
- public entrypoint remains `https://portal.rcdo02.ru`.

### Remaining rollout blockers after Caddy route activation

- Record README checkpoint for Stage 8.15.
- Run final production public smoke/checkpoint if needed.
- Keep server-only overrides and Caddyfile backups out of git.
