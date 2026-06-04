# Stage 72.28 - Production backup-before-deploy execution authorization

Status: authorization
Branch: stage72-production-backup-before-deploy-execution-authorization
Base branch: develop
Previous accepted package: v0.1.0-stage72-production-backup-before-deploy-execution-preparation
Base develop checkpoint: 6cad2d6
Scope: production backup-before-deploy execution authorization only

## Goal

Stage 72.28 prepares the authorization gate for the future production backup-before-deploy execution.

This stage confirms that backup execution is not automatic and remains blocked until the explicit confirmation phrase is provided.

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

## Backup execution authorization gate

Production backup-before-deploy execution remains blocked until the exact phrase is provided:

```text
CONFIRM PRODUCTION BACKUP BEFORE DEPLOY
```

This phrase authorizes backup execution only.

It does not authorize production deployment.

It does not authorize service restart.

It does not authorize migrations.

It does not authorize Docker cleanup.

It does not authorize touching `amnezia-awg`.

## Deployment gate remains separate

Production deployment remains blocked until the separate future phrase:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

Backup authorization and deployment authorization are separate gates.

## Future authorized backup destination

After explicit backup authorization, backup execution may create a timestamped server-local directory:

```text
/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/
```

## Future authorized backup artifacts

After explicit backup authorization, the backup directory must contain at minimum:

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

## Future authorized backup-only actions

After explicit backup authorization, only the following backup-only actions may be performed:

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

## Forbidden actions remain blocked

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

## Secret-safety requirements

- `.env` may only be copied server-locally into the backup directory.
- `.env` contents must not be printed.
- `.env` contents must not be committed.
- Database dump must not be copied into the Git working tree.
- Backup artifacts must remain server-local.
- Logs committed to the repository must contain metadata only.
- Token values, passwords, database URLs, private keys and authorization headers must not be printed.

## Authorization decision

Stage 72.28 establishes the explicit authorization gate for future backup-before-deploy execution.

No production backup was executed.

No production deployment was executed.

No production service was restarted.

No production data was changed.

No production secrets were printed.

`amnezia-awg` was not touched.

## Required local checks

```text
python .\scripts\check_stage72_production_backup_before_deploy_execution_authorization.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_preparation.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_preparation_audit.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_preparation_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 72.29 - Production backup-before-deploy execution authorization audit
```
