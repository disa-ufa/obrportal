# Production domain and reverse proxy decision

## Purpose

This document defines the production domain, reverse proxy and HTTPS entrypoint decision before real ObrPortal rollout.

It must not contain passwords, tokens, private keys, production `.env` values, DNS account credentials or any other secrets.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 current checkpoint: `27b8588`

## Source documents

- `docs/production-server-facts.md`
- `docs/production-fact-collection-result.md`
- `docs/production-server-remediation-plan.md`
- `docs/production-reverse-proxy-checklist.md`
- `docs/production-deployment-runbook.md`
- `docs/production-environment-template.md`

## Current server state

| Item | State | Notes |
| --- | --- | --- |
| Server | `306733.fornex.cloud` | Public IP: `89.127.203.70`. |
| Docker Engine | `installed` | Docker `29.1.3`. |
| Docker Compose | `installed` | Compose `2.40.3+ds1-0ubuntu1~24.04.1`. |
| Application directory | `exists` | `/opt/obrportal`. |
| Backup directory | `exists` | `/opt/obrportal-backups`. |
| Production `.env` | `missing` | Must be created manually later. |
| Reverse proxy | `not installed yet` | Decision required before installation. |
| Existing container | `amnezia-awg running` | Must not be broken. |
| Existing UDP port | `34503/udp active` | Must not be changed without separate decision. |
| Public HTTP/HTTPS listeners | `not configured` | Ports `80` and `443` are not yet active. |

## Domain decision

| Item | Decision | Notes |
| --- | --- | --- |
| Production domain | `<pending>` | Must point to `89.127.203.70`. |
| Frontend public URL | `<pending>` | Example: `https://portal.example.org`. |
| Backend public URL | `<pending>` | Same-domain `/api/` is preferred for this rollout. |
| API prefix | `/api/` | Reverse proxy routes API to backend service. |
| Health URL | `<pending>/health` | Must proxy to backend. |
| Readiness URL | `<pending>/api/v1/ready` | Must proxy to backend. |
| DNS A record | `<pending>` | Domain must resolve to `89.127.203.70`. |
| DNS AAAA record | `<deferred>` | Use only if IPv6 deployment is intentionally configured. |

## Reverse proxy options

| Option | Decision status | Strengths | Risks / Notes |
| --- | --- | --- | --- |
| Caddy | `<recommended>` | Simpler HTTPS automation and compact config. | Requires Caddy installation from package repository. |
| Nginx | `<alternative>` | Common production reverse proxy. | HTTPS automation requires Certbot or provider-specific certificate flow. |

Recommended decision:

- Use Caddy for first production rollout unless there is an existing operational requirement for Nginx.
- Keep same-domain routing: frontend at `/`, backend under `/api/`, health at `/health`, readiness at `/api/v1/ready`.
- Do not expose backend, PostgreSQL, Redis or MinIO ports publicly.

## Target routing model

| Public route | Target | Notes |
| --- | --- | --- |
| `/` | frontend service | SPA frontend. |
| `/assets/*` | frontend service | Static frontend assets. |
| `/api/*` | backend service | FastAPI routes. |
| `/health` | backend service | Backend health endpoint. |
| `/api/v1/ready` | backend service | Backend readiness endpoint. |
| unknown frontend route | frontend SPA fallback | Required for client-side routes. |

## Port exposure model

| Port | Expected exposure | Notes |
| --- | --- | --- |
| `22` | restricted public | SSH only. |
| `80` | public | HTTP redirect to HTTPS. |
| `443` | public | HTTPS entrypoint. |
| `8000` | private/reverse proxy only | Backend must not be directly public. |
| `5173` | private/reverse proxy only | Frontend must not be directly public. |
| `5432` | private only | PostgreSQL must not be public. |
| `6379` | private only | Redis must not be public. |
| `9000` | restricted/private | MinIO API. |
| `9001` | restricted/private | MinIO console. |
| `34503/udp` | existing public UDP | Existing `amnezia-awg`; must be preserved. |

## Caddy target configuration outline

Use only after the production domain is selected and DNS points to the server.

```caddyfile
<production-domain> {
    encode gzip zstd

    handle_path /api/* {
        reverse_proxy 127.0.0.1:8000
    }

    handle /health {
        reverse_proxy 127.0.0.1:8000
    }

    handle /api/v1/ready {
        reverse_proxy 127.0.0.1:8000
    }

    handle {
        reverse_proxy 127.0.0.1:5173
    }
}
```

## Nginx target configuration outline

Use only if Nginx is selected.

```nginx
server {
    listen 80;
    server_name <production-domain>;

    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
    }

    location = /health {
        proxy_pass http://127.0.0.1:8000/health;
    }

    location = /api/v1/ready {
        proxy_pass http://127.0.0.1:8000/api/v1/ready;
    }

    location / {
        proxy_pass http://127.0.0.1:5173;
    }
}
```

## Required decisions before installation

| Decision | Status | Notes |
| --- | --- | --- |
| Production domain selected | `<pending>` | Required before HTTPS. |
| DNS A record points to `89.127.203.70` | `<pending>` | Required before HTTPS validation. |
| Reverse proxy selected | `<pending>` | Caddy recommended unless Nginx is required. |
| HTTPS strategy selected | `<pending>` | Automatic HTTPS for Caddy or certificate flow for Nginx. |
| Backend public model selected | `same-domain /api/` | Preferred. |
| Existing `amnezia-awg` preserved | `required` | Must remain untouched. |

## Safe verification commands

After DNS is configured, run locally:

```powershell
Resolve-DnsName <production-domain>
Test-NetConnection <production-domain> -Port 80
Test-NetConnection <production-domain> -Port 443
```

Run on server after reverse proxy installation:

```bash
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
ss -tulpen || true
curl -I http://127.0.0.1 || true
curl -I http://127.0.0.1:8000/health || true
curl -I http://127.0.0.1:5173 || true
```

## Acceptance criteria

- Production domain decision is documented.
- DNS A record requirement is documented.
- Reverse proxy decision is documented.
- HTTPS strategy is documented.
- Same-domain API routing model is documented.
- Public/private port exposure model is documented.
- Existing `amnezia-awg` and UDP `34503` preservation is documented.
- No secrets are committed to Git.
