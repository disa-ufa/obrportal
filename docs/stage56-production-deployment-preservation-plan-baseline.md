# Stage 56 - Production deployment preservation plan baseline

Status: planned
Base branch: develop
Base checkpoint: e6cb609
Previous stage: v0.1.0-stage55-production-override-backup-preservation
Scope: production deployment preservation planning without live deployment

## Goal

Stage 56 prepares a preservation plan for production-specific files, backups and rollback data before any future production repository update or deployment stage is opened.

## Background

Stage 54 found that the production repository is on Stage 30 while local develop is on a later checkpoint.
Stage 55 confirmed that docker-compose.override.yml, /opt/obrportal/backups/ and /opt/obrportal-backups/ are production-specific artifacts that must be preserved.

Stage 56 does not execute deployment. It documents what must be saved, how to verify it, and what remains blocked before a real deployment.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Preservation targets

```text
/opt/obrportal/.env
/opt/obrportal/docker-compose.override.yml
/opt/obrportal/docker-compose.yml
/opt/obrportal/backups/
/opt/obrportal-backups/
Current production git HEAD
Current production docker compose ps output
Current production docker images list
Current production database dump
```

## Safety rule

Stage 56 is planning-only. It must not print production .env contents, copy files, create backups, pull code, checkout branches, rebuild images, restart services, run migrations or change server configuration.

## Target behavior

- Define what must be preserved before future deployment.
- Define safe backup evidence to capture in a later explicit backup stage.
- Define rollback target selection rules.
- Define deployment blocker checklist.
- Keep production secrets outside git.
- Keep application code unchanged.
- Do not run live production deployment.

## Planned future backup evidence

```text
git rev-parse HEAD
git log --oneline --decorate -5
git status --short
docker compose ps
docker images
postgres dump with sha256
copy of docker-compose.yml
copy of docker-compose.override.yml
copy of .env into protected server-local backup only, never into git
```

## Forbidden commands in this stage

```text
cat .env
printenv
git pull
git fetch
git checkout
cp
mv
rm
tar
pg_dump
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
python .\scripts\check_production_release_runbook.py
python .\scripts\check_production_server_preflight_execution.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production preservation plan is documented.
- Backup targets are listed without exposing secrets.
- Rollback selection rules are documented.
- No production secrets are printed or committed.
- No live production deployment is executed.
- No server modification commands are executed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
