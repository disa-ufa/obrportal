# Production server preflight execution

## Purpose

This document describes the safe execution order for collecting non-secret production server facts before real ObrPortal deployment.

It must not contain passwords, tokens, private keys, production `.env` values or any other secrets.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Stage 7 documentation baseline: `c7cd9ac4763bfab9f905b311eaf1ef4df9f30381`
- Stage 8 rollout inventory checkpoint: `415f3dd`
- Stage 8 server facts checkpoint: `f2b1d13`

## Source documents

- `docs/production-rollout-inventory.md`
- `docs/production-server-facts.md`
- `docs/production-deployment-runbook.md`
- `docs/production-environment-template.md`
- `docs/production-server-checklist.md`
- `docs/production-reverse-proxy-checklist.md`
- `docs/production-backup-monitoring-checklist.md`

## Local preflight before server access

Run locally before connecting to the production server:

```powershell
git status --short
git branch -vv
git log --oneline --decorate -10
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

## Server access preflight

Run on the production server and record only non-secret results in `docs/production-server-facts.md`:

```bash
whoami
pwd
hostname
hostnamectl || true
uname -a
id
```

## Server capacity preflight

```bash
df -h
free -h
uptime
```

Record only capacity summary, not sensitive operational data.

## Docker and Git preflight

```bash
docker --version
docker compose version
git --version
docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' || true
```

## Directory preflight

```bash
test -d /opt/obrportal && echo '/opt/obrportal exists' || echo '/opt/obrportal missing'
test -d /opt/obrportal-backups && echo '/opt/obrportal-backups exists' || echo '/opt/obrportal-backups missing'
ls -ld /opt /opt/obrportal /opt/obrportal-backups 2>/dev/null || true
```

## Network and port preflight

```bash
ss -tulpen || true
curl -I http://127.0.0.1 2>/dev/null || true
curl -I http://127.0.0.1:8000/health 2>/dev/null || true
curl -I http://127.0.0.1:5173 2>/dev/null || true
```

Expected production exposure model:

- `22` restricted public SSH.
- `80` public HTTP redirect.
- `443` public HTTPS.
- `8000` private or reverse proxy only.
- `5173` private or reverse proxy only.
- `5432` private only.
- `6379` private only.
- `9000` restricted or private.
- `9001` restricted or private.

## Reverse proxy preflight

Run only commands that match the selected reverse proxy.

Nginx:

```bash
nginx -v 2>&1 || true
sudo nginx -t || true
systemctl status nginx --no-pager || true
```

Caddy:

```bash
caddy version || true
caddy validate --config /etc/caddy/Caddyfile || true
systemctl status caddy --no-pager || true
```

## Production `.env` preflight

Do not print `.env` content.

Allowed checks:

```bash
test -f /opt/obrportal/.env && echo '.env exists' || echo '.env missing'
ls -l /opt/obrportal/.env 2>/dev/null || true
```

Never run `cat /opt/obrportal/.env` in shared logs.

## Backup preflight

```bash
test -d /opt/obrportal-backups && echo 'backup root exists' || echo 'backup root missing'
find /opt/obrportal-backups -maxdepth 2 -type d 2>/dev/null | sort || true
```

## Fact update workflow

After collecting server facts:

- update only non-secret fields in `docs/production-server-facts.md`;
- keep `<pending>` for unknown facts;
- do not commit passwords, tokens, private keys or `.env` values;
- run the local guards again;
- commit the updated facts document in `develop`.

## Acceptance criteria

- Local preflight commands are documented.
- Server access preflight commands are documented.
- Server capacity preflight commands are documented.
- Docker and Git preflight commands are documented.
- Directory preflight commands are documented.
- Network and port preflight commands are documented.
- Reverse proxy preflight commands are documented.
- `.env` preflight avoids printing secret values.
- Backup preflight commands are documented.
- Fact update workflow is documented.
- No secrets are committed to Git.

## Preflight diagnostics

Required diagnostic command:

- `python .\scripts\check_production_server_preflight_execution.py`
