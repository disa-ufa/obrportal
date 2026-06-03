# Stage 55 - Production override and backup preservation preflight baseline

Status: planned
Base branch: develop
Base checkpoint: b3874d2
Previous stage: v0.1.0-stage54-production-repository-state-preflight
Scope: production override and backup preservation preflight without deployment

## Goal

Stage 55 inspects production-only untracked files and backup directories before any future repository update or deployment stage is opened.

## Background

Stage 54 found that the production repository working tree is not clean because backups/ and docker-compose.override.yml are untracked.

These artifacts may contain production-specific deployment settings or backup data and must be preserved before any future git operation.

## Safety rule

Stage 55 is read-only inspection. It must not edit files, remove files, move backups, read production .env contents, pull code, rebuild images, restart services or run migrations.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Target behavior

- Inspect docker-compose.override.yml metadata and safe non-secret structure.
- Inspect backups/ and /opt/obrportal-backups directory listings.
- Do not print .env contents.
- Do not print secrets.
- Do not modify production files.
- Do not execute production deployment.

## Server read-only commands planned

```bash
cd /opt/obrportal
pwd
git status --short
ls -la docker-compose.override.yml || true
sed -n "1,220p" docker-compose.override.yml | sed -E "s#(PASSWORD|SECRET|TOKEN|KEY|ACCESS|CREDENTIAL)([^:=]*[:=]).*#\1\2 ***MASKED***#Ig" || true
find backups -maxdepth 2 -type f -printf "%TY-%Tm-%Td %TH:%TM %s %p\n" 2>/dev/null | sort | tail -50
find /opt/obrportal-backups -maxdepth 2 -type f -printf "%TY-%Tm-%Td %TH:%TM %s %p\n" 2>/dev/null | sort | tail -50
docker compose config --services
docker compose ps
```

## Forbidden commands in this stage

```text
cat .env
printenv
git pull
git fetch
git checkout
rm
mv
cp
nano
vim
docker compose up
docker compose down
docker compose restart
docker compose exec backend alembic upgrade head
```

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_server_preflight_execution.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production override and backup preservation facts are documented.
- No production secrets are printed or committed.
- No live production deployment is executed.
- No server modification commands are executed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.

