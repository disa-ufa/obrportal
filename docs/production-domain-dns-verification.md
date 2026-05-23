# Production domain DNS verification

## Purpose

This document defines the safe production domain selection and DNS A-record verification workflow before reverse proxy installation and HTTPS entrypoint setup.

It must not contain DNS account credentials, tokens, passwords, private keys, production `.env` values or any other secrets.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 current checkpoint: `289add8`

## Source documents

- `docs/production-domain-reverse-proxy-decision.md`
- `docs/production-server-facts.md`
- `docs/production-fact-collection-result.md`
- `docs/production-server-remediation-plan.md`
- `docs/production-reverse-proxy-checklist.md`

## Current server state

| Item | State | Notes |
| --- | --- | --- |
| Server | `306733.fornex.cloud` | Current hostname. |
| Public IPv4 | `89.127.203.70` | Target DNS A-record value. |
| Docker Compose | `installed` | Compose `2.40.3+ds1-0ubuntu1~24.04.1`. |
| Application directory | `exists` | `/opt/obrportal`. |
| Backup directory | `exists` | `/opt/obrportal-backups`. |
| Production `.env` | `missing` | Must be created later, not in this step. |
| Reverse proxy | `not installed yet` | Must wait until domain/DNS decision is complete. |
| Existing container | `amnezia-awg running` | Must not be broken. |
| Existing UDP port | `34503/udp active` | Must remain untouched. |

## Production domain decision

| Item | Value | Notes |
| --- | --- | --- |
| Production domain | `<pending>` | Example: `portal.example.org`. |
| DNS provider/account | `<pending>` | Do not store credentials here. |
| DNS A-record target | `89.127.203.70` | Required IPv4 target. |
| DNS AAAA-record | `<deferred>` | Use only if IPv6 rollout is intentionally configured. |
| Frontend public URL | `<pending>` | Expected: `https://<production-domain>`. |
| Backend public model | `same-domain /api/` | Preferred model from 8.8. |
| Health URL | `https://<production-domain>/health` | After reverse proxy. |
| Readiness URL | `https://<production-domain>/api/v1/ready` | After reverse proxy. |

## DNS setup requirement

Required DNS record:

| Type | Name | Value | TTL | Notes |
| --- | --- | --- | --- | --- |
| A | `<production-domain>` | `89.127.203.70` | provider default or `300` | Required before HTTPS validation. |

Do not configure secrets in this document.

## Local DNS verification commands

PowerShell:

```powershell
$PRODUCTION_DOMAIN = "<production-domain>"

Resolve-DnsName $PRODUCTION_DOMAIN -Type A
Resolve-DnsName $PRODUCTION_DOMAIN -Type AAAA -ErrorAction SilentlyContinue
Test-NetConnection $PRODUCTION_DOMAIN -Port 80
Test-NetConnection $PRODUCTION_DOMAIN -Port 443
```

Expected before reverse proxy installation:

- A-record resolves to `89.127.203.70`.
- Port `80` may be closed until reverse proxy is installed.
- Port `443` may be closed until reverse proxy is installed.
- AAAA may be absent unless IPv6 is intentionally configured.

## Server-side DNS verification commands

Run on server only after domain is selected:

```bash
DOMAIN='<production-domain>'
getent hosts "$DOMAIN" || true
dig +short A "$DOMAIN" || true
dig +short AAAA "$DOMAIN" || true
curl -I "http://$DOMAIN" || true
```

## Decision gate before reverse proxy installation

| Gate | Status | Notes |
| --- | --- | --- |
| Production domain selected | `<pending>` | Required. |
| DNS A-record created | `<pending>` | Must point to `89.127.203.70`. |
| DNS A-record verified locally | `<pending>` | `Resolve-DnsName`. |
| DNS A-record verified on server | `<pending>` | `getent` or `dig`. |
| Reverse proxy choice confirmed | `Caddy recommended` | From 8.8. |
| HTTPS entrypoint can be configured | `<pending>` | Only after DNS verification. |
| Existing `amnezia-awg` preserved | `required` | Must remain untouched. |

## Acceptance criteria

- Production domain placeholder is documented.
- DNS A-record target `89.127.203.70` is documented.
- Same-domain `/api/` backend model is documented.
- Local DNS verification commands are documented.
- Server-side DNS verification commands are documented.
- Reverse proxy installation is blocked until DNS is verified.
- Existing `amnezia-awg` and UDP `34503` preservation is documented.
- No secrets are committed to Git.

## DNS verification diagnostics

Required diagnostic command:

- `python .\scripts\check_production_domain_dns_verification.py`

## Real DNS verification result - 2026-05-23

Production domain selected:

| Item | Value | Notes |
| --- | --- | --- |
| Production domain | `portal.rcdo02.ru` | Real production domain selected. |
| DNS A-record target | `89.127.203.70` | Expected production server IP. |
| Local DNS verification | `passed` | `Resolve-DnsName portal.rcdo02.ru -Type A` returned `89.127.203.70`. |
| Server-side DNS verification | `passed` | `getent hosts` and `dig +short A` returned `89.127.203.70`. |
| DNS AAAA-record | `absent/deferred` | IPv6 rollout is not configured in this step. |
| Port 80 before proxy | `closed/connection failed` | Expected because reverse proxy is not installed yet. |
| Port 443 before proxy | `closed/connection failed` | Expected because HTTPS is not configured yet. |
| Reverse proxy status | `not installed yet` | Next stage: Caddy installation/configuration. |
| Secret marker scan | `passed` | Local DNS verification log contains no secret-like markers. |

Safe verification sources:

- local command output: `Resolve-DnsName portal.rcdo02.ru -Type A`;
- server command output: `getent hosts portal.rcdo02.ru`;
- server command output: `dig +short A portal.rcdo02.ru`;
- temporary local log: `tmp/stage_8_10_1_dns_verification.txt` (not committed).

Decision result:

- DNS gate is passed.
- Reverse proxy installation can proceed.
- Caddy remains the recommended reverse proxy for the first production rollout.
- Existing `amnezia-awg` and UDP `34503` must remain untouched.
