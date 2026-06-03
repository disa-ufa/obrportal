# Stage 57 - Production protected backup execution baseline

Status: planned
Base branch: develop
Base checkpoint: 1ec9d1d
Previous stage: v0.1.0-stage56-production-deployment-preservation-plan
Scope: production protected backup execution without deployment

## Goal

Stage 57 creates a protected server-local production backup before any future repository update or deployment stage.

## Background

Stage 56 defined the preservation plan for production-specific files, backups and rollback data.

Stage 57 executes only the protected backup portion of that plan. It does not update code or deploy.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Backup target

```text
/opt/obrportal-backups/protected/stage57-YYYYMMDD-HHMMSS/
```

## Backup contents

```text
git-head.txt
git-log.txt
git-status.txt
docker-compose-ps.txt
docker-images.txt
docker-compose.yml
docker-compose.override.yml
.env
postgres.dump
sha256sums.txt
metadata.txt
```

## Safety rule

Stage 57 may create backup files on the production server, but it must not print production .env contents, pull code, checkout branches, rebuild images, restart services, run migrations or change runtime configuration.

## Allowed server actions

```text
mkdir backup directory
write metadata files
copy .env into protected server-local backup without printing it
copy docker-compose.yml
copy docker-compose.override.yml
create Postgres dump
create sha256 checksums
verify backup files exist and have non-zero size
```

## Forbidden commands in this stage

```text
cat .env
printenv
git pull
git fetch
git checkout
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
python .\scripts\check_production_backup_verification.py
python .\scripts\check_production_restore_drill_runbook.py
python .\scripts\check_production_server_preflight_execution.py
docker compose ps
git status --short
```

## Acceptance criteria

- Protected backup path is documented.
- Protected backup is created on the production server.
- Backup evidence is documented without exposing secrets.
- .env is backed up server-locally but not printed or committed.
- Postgres dump and sha256 checksums are created.
- No live production deployment is executed.
- No services are restarted.
- No migrations are executed.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
