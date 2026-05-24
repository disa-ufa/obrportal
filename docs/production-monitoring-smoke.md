# Production monitoring smoke

Version: `v0.1.0-stage6`
Stage: `9.2`
Status: `drafted`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This document describes the repeatable production monitoring smoke check for ObrPortal.

The smoke check verifies public HTTPS availability without touching:

- production `.env`;
- Docker Compose state;
- Caddyfile;
- server-only override files;
- `amnezia-awg`;
- production volumes.

## 2. Smoke script

Script:

- `scripts/smoke_production_monitoring.py`

Run command:

- `python .\scripts\smoke_production_monitoring.py`

## 3. Checked public routes

| Route | Expected | Purpose |
| --- | --- | --- |
| `https://portal.rcdo02.ru` | `200` | frontend root |
| `https://portal.rcdo02.ru/login` | `200` | frontend SPA route |
| `https://portal.rcdo02.ru/admin` | `200` | frontend SPA route |
| `https://portal.rcdo02.ru/catalog` | `200` | frontend SPA route |
| `https://portal.rcdo02.ru/health` | `200` | backend health |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` | backend readiness |

## 4. Backend response expectations

`/health` must return JSON fields:

| Field | Expected |
| --- | --- |
| `status` | `ok` |
| `app` | `ObrPortal` |
| `version` | `0.1.0-stage6` |

`/api/v1/ready` must return JSON fields:

| Field | Expected |
| --- | --- |
| `status` | `ok` |
| `database` | `ok` |
| `redis` | `ok` |
| `storage` | `ok` |

## 5. Safety rules

The monitoring smoke script:

- does not read production `.env`;
- does not print secrets;
- does not connect over SSH;
- does not restart services;
- does not modify Caddy;
- does not modify Docker Compose;
- does not touch volumes;
- does not touch `amnezia-awg`.

## 6. Expected success output

Expected markers:

- `production monitoring smoke started`
- `[ok] frontend route / -> 200`
- `[ok] frontend route /login -> 200`
- `[ok] frontend route /admin -> 200`
- `[ok] frontend route /catalog -> 200`
- `[ok] backend health /health -> 200`
- `[ok] backend readiness /api/v1/ready -> 200`
- `production monitoring smoke passed`

## 7. Failure handling

If the smoke fails:

1. Do not restart services immediately.
2. Check which route failed.
3. Check whether DNS resolves.
4. Check public HTTPS with browser or `curl`.
5. Check Caddy status on server.
6. Check backend local health on server.
7. Check Docker Compose status on server.
8. Do not print `.env`.
9. Do not run `docker compose down -v`.
10. Do not expose private ports publicly.

## 8. Recommended frequency

Manual checks:

- after deployments;
- after Caddy changes;
- after server updates;
- after DNS changes;
- before planned maintenance;
- during incident response.

## 9. Acceptance criteria

Production monitoring smoke is accepted when:

- all public frontend routes return `200`;
- backend health returns expected JSON;
- backend readiness returns expected JSON;
- script exits with code `0`;
- no secrets are printed;
- no server state is modified.
