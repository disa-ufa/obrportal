# Stage 72.25 - Production backup-before-deploy execution preparation

Status: preparation
Branch: stage72-production-backup-before-deploy-execution-preparation
Base branch: develop
Previous accepted package: v0.1.0-stage72-production-backup-before-deploy-planning
Base develop checkpoint: d957bf6
Scope: production backup-before-deploy execution preparation only

## Goal

Stage 72.25 prepares the future production backup-before-deploy execution.

This stage defines the exact backup execution boundary, expected backup artifacts, verification requirements and safety rules.

This stage does not execute SSH commands, does not create backups, does not deploy, and does not restart production services.

## Production facts

```text
host: 306733.fornex.cloud
ssh_target: root@89.127.203.70
project_dir: /opt/obrportal
production_git_head: 9f358cd
production_git_tag: v0.1.0-stage57-production-protected-backup-execution
```

## Server-only preservation targets

```text
.env: yes
docker-compose.override.yml: yes
backups/: yes
/opt/obrportal/backups: 200K
```

These files and directories must be preserved.

## Runtime and storage targets

```text
caddy: active
obrportal-frontend: Up 28 hours, healthy
obrportal-backend: Up 28 hours
obrportal-postgres: Up 7 days, healthy
obrportal-redis: Up 7 days, healthy
obrportal-minio: Up 7 days, healthy
named volumes:
  obrportal_minio_data
  obrportal_postgres_data
anonymous volumes present: yes
```

## Amnezia boundary

```text
amnezia-awg systemd unit: no
amnezia docker marker: yes
amnezia-awg container: present
```

`amnezia-awg` must not be touched by backup, deploy, cleanup or Docker commands.

## Future backup execution destination

The future backup execution must create a timestamped server-local directory:

```text
/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/
```

The exact timestamp must be generated only during the future explicitly authorized execution stage.

## Required future backup artifacts

The future backup directory must contain at minimum:

```text
metadata.txt
git-head.txt
git-branch.txt
git-status.txt
git-log.txt
docker-compose-ps.txt
docker-ps.txt
docker-images.txt
docker-volumes.txt
disk-usage.txt
docker-compose.yml
docker-compose.override.yml
.env
postgres.dump
minio-backup-method.txt
rollback-target.txt
sha256sums.txt
verification.txt
```

## Secret safety requirements

- `.env` may be copied server-locally into the backup directory.
- `.env` contents must not be printed.
- `.env` contents must not be committed.
- Database dump must not be copied into the Git working tree.
- Backup artifacts must remain server-local.
- Logs committed to the repository must contain metadata only.
- No token values, passwords, database URLs, private keys or authorization headers may be printed.

## Allowed future backup execution actions

Only after separate explicit authorization, the future backup execution may:

```text
create timestamped backup directory under /opt/obrportal/backups/
write metadata files
copy .env into backup directory without printing it
copy docker-compose.yml
copy docker-compose.override.yml
write git state metadata
write docker state metadata
create Postgres logical dump
write MinIO backup method evidence
write rollback metadata
create sha256 checksums
verify required backup files exist
```

## Forbidden actions

The future backup execution must not:

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
docker system prune
docker volume rm
docker compose down -v
touch amnezia-awg
```

## Backup execution confirmation gate

Backup execution remains blocked until the user sends the exact phrase:

```text
CONFIRM PRODUCTION BACKUP BEFORE DEPLOY
```

This phrase authorizes backup execution only.

It does not authorize production deployment.

Production deployment remains blocked until the separate future phrase:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

## Preparation decision

Stage 72.25 prepares the backup-before-deploy execution stage.

No production backup was executed.

No production deployment was executed.

No production service was restarted.

No production data was changed.

No production secrets were printed.

`amnezia-awg` was not touched.

## Required local checks

```text
python .\scripts\check_stage72_production_backup_before_deploy_execution_preparation.py
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline.py
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline_audit.py
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 72.26 - Production backup-before-deploy execution preparation audit
```
