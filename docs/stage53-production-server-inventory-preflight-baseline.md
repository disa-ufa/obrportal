# Stage 53 - Production server inventory preflight baseline

Status: planned
Base branch: develop
Base checkpoint: 71758e2
Previous stage: v0.1.0-stage52-production-target-dns-alignment
Scope: production server inventory preflight without live production deployment

## Goal

Stage 53 collects read-only production server inventory facts before any real deployment stage is opened.

## Confirmed production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
```

## Safety rule

Stage 53 is read-only inventory collection. It must not deploy, modify services, edit env files, run migrations, restart containers or change firewall/reverse proxy settings.

## Target behavior

- Verify SSH login works.
- Record hostname, current directory and basic OS information.
- Record Docker and Docker Compose availability.
- Record current Docker containers if any.
- Record disk and memory facts.
- Check whether /opt/obrportal or another project path exists.
- Keep secrets outside git.
- Keep application code unchanged.
- Do not run live production deployment.

## Server read-only commands planned

```bash
hostname
pwd
whoami
uname -a
cat /etc/os-release || true
df -h
free -h
docker --version || true
docker compose version || true
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" || true
ls -la /opt || true
ls -la /opt/obrportal || true
```

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_server_facts.py
python .\scripts\check_production_server_preflight_execution.py
docker compose ps
git status --short
```

## Acceptance criteria

- Server inventory results are documented.
- No secrets are committed.
- No live production deployment is executed.
- No application code changes are made.
- No server modification commands are executed.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
