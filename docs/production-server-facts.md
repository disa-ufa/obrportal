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
