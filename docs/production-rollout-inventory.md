# Production rollout inventory

## Purpose

This document fixes the target production rollout inventory for ObrPortal before executing real server deployment.

It must not contain secrets. Real passwords, tokens, private keys and production `.env` values must never be committed to Git.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Current post-release preparation commit: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Main branch contains Stage 7 production documentation and guards.

## Deployment target

| Item | Value | Notes |
| --- | --- | --- |
| Production server provider | `<provider>` | Example: Timeweb Cloud, internal VPS, dedicated server. |
| Server name | `<server-name>` | Human-readable server name. |
| Server OS | `<os-version>` | Example: Ubuntu 22.04 LTS. |
| SSH user | `<ssh-user>` | Do not store SSH private keys here. |
| Application directory | `/opt/obrportal` | Recommended production app path. |
| Backup directory | `/opt/obrportal-backups` | Must be outside disposable container lifecycle. |
| Reverse proxy | `<nginx-or-caddy>` | Choose one real reverse proxy. |
| Deployment mode | `docker compose` | Current supported rollout mode. |

## Domain inventory

| Item | Value | Notes |
| --- | --- | --- |
| Public frontend domain | `https://example.org` | Replace with real domain before rollout. |
| Public backend URL | `https://example.org` | Same-domain API mode or dedicated API domain. |
| API route prefix | `/api/` | Proxies to backend service. |
| Health endpoint | `/health` | Must be reachable through production domain. |
| Readiness endpoint | `/api/v1/ready` | Must be reachable through production domain. |
| HTTPS status | `<planned-or-enabled>` | Must be enabled before production acceptance. |

## Required production services

- `postgres`
- `redis`
- `minio` or external S3-compatible storage
- `backend`
- `frontend`
- reverse proxy

## Required server ports

| Port | Purpose | Public | Notes |
| --- | --- | --- | --- |
| `22` | SSH | restricted | Restrict by firewall if possible. |
| `80` | HTTP redirect | yes | Redirect to HTTPS. |
| `443` | HTTPS | yes | Main public entrypoint. |
| `8000` | Backend internal/public local check | no | Should be protected behind reverse proxy in production. |
| `5173` | Frontend internal/public local check | no | Should be protected behind reverse proxy in production. |
| `5432` | PostgreSQL | no | Must not be publicly exposed. |
| `6379` | Redis | no | Must not be publicly exposed. |
| `9000` | MinIO API | restricted | Public only if explicitly required and secured. |
| `9001` | MinIO console | restricted | Admin-only access. |

## Production environment status

| Item | Status | Notes |
| --- | --- | --- |
| `.env` created on server | `<pending>` | Must be created manually. |
| `APP_ENV=production` | `<pending>` | Must not be `local`. |
| `APP_VERSION=0.1.0-stage6` | `<pending>` | Must match release baseline. |
| `SECRET_KEY` generated | `<pending>` | Must be production-specific. |
| PostgreSQL credentials generated | `<pending>` | Must be production-specific. |
| Storage credentials generated | `<pending>` | Must be production-specific. |
| CORS origins configured | `<pending>` | Must contain only production origins. |

## Backup readiness

| Item | Status | Notes |
| --- | --- | --- |
| Backup directory exists | `<pending>` | `/opt/obrportal-backups`. |
| PostgreSQL backup command tested | `<pending>` | Required before production acceptance. |
| Object storage backup strategy selected | `<pending>` | MinIO volume, S3 sync or provider snapshot. |
| `.env` backup path prepared | `<pending>` | Secure permissions required. |
| Reverse proxy config backup path prepared | `<pending>` | Required before proxy changes. |
| Rollback commit/tag recorded | `<pending>` | Required before deployment. |

## Preflight commands

Run locally before real server rollout:

```powershell
git status --short
git branch -vv
git log --oneline --decorate -10
python .\scripts\check_ci_local_gate.py
python .\scripts\check_release_readiness.py
python .\scripts\check_production_deployment_runbook.py
python .\scripts\check_production_backup_monitoring_checklist.py
python .\scripts\check_production_reverse_proxy_checklist.py
python .\scripts\check_production_server_checklist.py
python .\scripts\check_production_environment_template.py
python .\scripts\check_production_deployment_plan.py
python .\scripts\check_no_todo_markers.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
```

Run on the server before deployment:

```bash
docker --version
docker compose version
git --version
df -h
free -h
uname -a
```

## Rollout acceptance criteria

- Deployment target is known.
- Production domain is known.
- Reverse proxy choice is known.
- `.env` creation plan is known.
- Backup path is known.
- Public ports are known.
- Private service ports are not publicly exposed.
- Preflight commands are documented.
- No secrets are committed to Git.

## Inventory diagnostics

Required diagnostic command:

- `python .\scripts\check_production_rollout_inventory.py`

## Repository workspace rollout inventory result - 2026-05-24

| Item | Value | Status |
| --- | --- | --- |
| Deployment path | `/opt/obrportal` | prepared |
| Repository | `https://github.com/disa-ufa/obrportal.git` | cloned |
| Branch | `develop` | checked out |
| HEAD | `61867f063f82c8f2c3ed2553b64b535eeaf74e90` | verified |
| Release tag | `v0.1.0-stage6` | available |
| Production `.env` | `missing` | next stage |
| Compose stack | `not started` | intentional |
| Caddy HTTPS placeholder | `active` | preserved |
| Existing `amnezia-awg` | `running` | preserved |
| Existing UDP `34503` | `active` | preserved |

Workspace files verified:

- `docker-compose.yml`;
- `.env.example`;
- `backend`;
- `frontend`;
- `docs`;
- `scripts`.

## Production environment rollout inventory result - 2026-05-24

| Item | Value | Status |
| --- | --- | --- |
| Production `.env` | `exists` | prepared |
| Permissions | `600` | verified |
| Owner | `root:root` | verified |
| Key coverage | `42/42` | verified without printing names |
| Missing keys | `0` | verified |
| Extra keys | `0` | verified |
| Empty values | `0` | verified |
| Placeholder values | `0` | verified |
| Compose stack | `not started` | intentional |
| Caddy HTTPS placeholder | `active` | preserved |
| Existing `amnezia-awg` | `running` | preserved |
| Existing UDP `34503` | `active` | preserved |

Safe audit guarantees:

- `.env` values were not printed;
- `.env` key names were not printed;
- local audit log was not committed.

## Docker Compose startup rollout inventory result - 2026-05-24

| Item | Value | Status |
| --- | --- | --- |
| Workspace HEAD | `4686cf5b58701be138582ae5fe5fe6a616965a12` | verified |
| Compose config | `valid` | verified |
| Compose stack | `started` | verified |
| Backend health | `ok` | local |
| Backend readiness | `ok` | local |
| Frontend | `HTTP/1.1 200 OK` | local |
| Backend bind | `127.0.0.1:8000` | private |
| Frontend bind | `127.0.0.1:5173` | private |
| PostgreSQL bind | `127.0.0.1:5432` | private |
| Redis bind | `127.0.0.1:6379` | private |
| MinIO API bind | `127.0.0.1:9000` | private |
| MinIO console bind | `127.0.0.1:9001` | private |
| Public HTTP/HTTPS | `Caddy only` | `80/443` |
| Existing VPN container | `amnezia-awg` | preserved |
| Existing VPN UDP port | `34503` | preserved |

Inventory decision:

- app services are ready for Caddy reverse proxy configuration;
- direct public access to backend/frontend/database/cache/storage is not used;
- Caddy remains the only public HTTP/HTTPS entrypoint.
