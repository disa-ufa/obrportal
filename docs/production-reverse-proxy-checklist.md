# Production reverse proxy checklist

## Purpose

This checklist describes the production reverse proxy, HTTPS, domain, routing and verification requirements for ObrPortal deployment after release `v0.1.0-stage6`.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Production deployment must checkout the release tag, not a moving development branch.

## Reverse proxy goals

- Serve the frontend through HTTPS.
- Proxy backend API requests to the backend service.
- Keep `/health` and `/api/v1/ready` reachable through the production domain.
- Support SPA fallback to `index.html` for frontend routes.
- Redirect HTTP to HTTPS.
- Preserve client headers for backend logging and security checks.
- Keep reverse proxy configuration backed up before each change.

## Domain and DNS checklist

- Production domain is selected.
- DNS `A` or `AAAA` record points to the production server.
- Optional `www` record is configured or explicitly disabled.
- API subdomain is selected if backend is separated from frontend.
- DNS propagation is checked before enabling HTTPS.
- Old DNS records are documented before changes.

## HTTPS checklist

- HTTPS certificate is issued for the production domain.
- Certificate auto-renewal is enabled.
- HTTP redirects to HTTPS.
- TLS configuration is checked after deployment.
- Certificate expiration monitoring is planned.

## Frontend routing requirements

- `/` serves the frontend application.
- `/catalog` serves the frontend application.
- `/account` serves the frontend application.
- `/verify-document` serves the frontend application.
- `/admin` serves the frontend application.
- Unknown frontend routes fallback to `index.html`.
- Static assets are served with safe cache headers.

## Backend routing requirements

- `/health` proxies to backend `/health`.
- `/api/v1/ready` proxies to backend `/api/v1/ready`.
- `/api/` proxies to the backend API service.
- Request headers `Host`, `X-Real-IP`, `X-Forwarded-For` and `X-Forwarded-Proto` are preserved.
- Request body size is large enough for document workflows if uploads are enabled.
- Backend upstream timeout is documented.

## Recommended upstreams

- Frontend upstream: `http://frontend:5173` for compose-based deployment or static build directory when served directly.
- Backend upstream: `http://backend:8000`.
- Public HTTPS endpoint: `https://example.org`.

Replace `https://example.org` with the real production domain.

## Nginx checklist

- Server block for port `80` redirects to HTTPS.
- Server block for port `443` enables SSL.
- Frontend location supports SPA fallback.
- Backend API location proxies to backend upstream.
- Health and readiness locations proxy to backend upstream.
- Reverse proxy config is tested before reload.
- Reverse proxy config is backed up before changes.

Required Nginx verification commands:

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl status nginx --no-pager
```

## Caddy checklist

- Production domain is configured in `Caddyfile`.
- Frontend route is configured.
- Backend API reverse proxy is configured.
- Health and readiness reverse proxy routes are configured.
- Caddy config is validated before reload.
- Caddy config is backed up before changes.

Required Caddy verification commands:

```bash
caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

## Reverse proxy backup commands

```bash
sudo mkdir -p /opt/obrportal-backups/reverse-proxy
date -u +%Y%m%dT%H%M%SZ
sudo cp -a /etc/nginx /opt/obrportal-backups/reverse-proxy/nginx-backup || true
sudo cp -a /etc/caddy /opt/obrportal-backups/reverse-proxy/caddy-backup || true
```

## Production verification commands

From the server:

```bash
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
docker compose ps
```

Through the production domain:

```bash
curl -fsS https://example.org/health
curl -fsS https://example.org/api/v1/ready
curl -I https://example.org/
curl -I https://example.org/catalog
curl -I https://example.org/admin
curl -I https://example.org/verify-document
```

Replace `https://example.org` with the real production domain.

## Post-deployment browser verification

- Home page opens through HTTPS.
- Catalog page opens through HTTPS.
- Account page opens through HTTPS.
- Admin page opens through HTTPS.
- Verify document page opens through HTTPS.
- Browser does not show mixed content warnings.
- API requests use HTTPS.
- Page refresh works on nested frontend routes.

## Rollback checklist

- Restore previous reverse proxy configuration from backup.
- Reload reverse proxy.
- Verify `/health`.
- Verify `/api/v1/ready`.
- Verify frontend routes.
- Record rollback result.

## Acceptance criteria

- Production domain resolves to the server.
- HTTPS certificate is valid.
- HTTP redirects to HTTPS.
- Frontend routes work.
- Backend API routes work.
- Health and readiness endpoints work through the domain.
- Reverse proxy config is backed up.
- Rollback path is documented.

## Checklist diagnostics

Required diagnostic command:

- `python .\scripts\check_production_reverse_proxy_checklist.py`

## Caddy installation result - 2026-05-23

| Item | Result | Notes |
| --- | --- | --- |
| Caddy installed | `yes` | Version `v2.11.3`. |
| Caddy service | `active/running` | Enabled via systemd. |
| Domain | `portal.rcdo02.ru` | DNS A-record points to `89.127.203.70`. |
| HTTP port | `open` | Port `80` is listening. |
| HTTPS port | `open` | Port `443` is listening. |
| HTTP behavior | `308 Permanent Redirect` | HTTP redirects to HTTPS. |
| HTTPS behavior | `200 OK` | Temporary placeholder response. |
| Placeholder body | `ObrPortal HTTPS entrypoint is ready. Backend/frontend deployment is pending.` | Expected until app deployment. |
| Existing `amnezia-awg` | `preserved` | Running after Caddy installation. |
| Existing UDP `34503` | `preserved` | Not changed. |
| Secret marker scan | `passed` | Local Caddy installation log contains no secret-like markers. |

Next reverse proxy action:

- after backend/frontend deployment, replace placeholder response with routes:
  - `/` -> frontend service;
  - `/assets/*` -> frontend service;
  - `/api/*` -> backend service;
  - `/health` -> backend service;
  - `/api/v1/ready` -> backend service.

## Pre-route application stack result - 2026-05-24

Before replacing the Caddy placeholder, the application stack was started and verified locally.

| Route target | Local upstream | Status |
| --- | --- | --- |
| Frontend | `127.0.0.1:5173` | `HTTP/1.1 200 OK` |
| Backend health | `127.0.0.1:8000/health` | `ok` |
| Backend readiness | `127.0.0.1:8000/api/v1/ready` | `ok` |

Security result:

- backend/frontend/database/cache/storage ports are bound to `127.0.0.1`;
- public HTTP/HTTPS remains owned by Caddy;
- temporary Caddy placeholder is still active;
- next reverse proxy step can safely route public HTTPS traffic to local app upstreams.
