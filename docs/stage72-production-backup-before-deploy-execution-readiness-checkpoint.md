# Stage 72.32 - Production backup-before-deploy execution readiness checkpoint

Status: readiness-checkpoint
Branch: stage72-production-backup-before-deploy-execution-readiness-checkpoint
Base branch: develop
Previous accepted package: v0.1.0-stage72-production-backup-before-deploy-execution-authorization
Base develop checkpoint: 8909f6b
Scope: production backup-before-deploy execution readiness checkpoint only

## Goal

Stage 72.32 records the final readiness checkpoint before future production backup-before-deploy execution.

This stage confirms that backup execution is still blocked until the explicit backup confirmation phrase is provided.

This stage does not execute SSH commands, does not create backups, does not deploy, and does not restart production services.

## Confirmed accepted packages

```text
v0.1.0-stage72-production-backup-before-deploy-planning
v0.1.0-stage72-production-backup-before-deploy-execution-preparation
v0.1.0-stage72-production-backup-before-deploy-execution-authorization
```

## Production facts to use for future backup execution

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

## Backup execution remains blocked

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

## Deployment remains separately blocked

Production deployment remains blocked until the separate future phrase:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

Backup authorization and deployment authorization are separate gates.

## Future backup destination

After explicit backup authorization, backup execution may create a timestamped server-local directory:

```text
/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/
```

## Required future backup artifacts

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

## Allowed future backup-only actions

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

## Readiness decision

Stage 72.32 confirms readiness to proceed to a future explicit backup execution request.

No production backup was executed.

No production deployment was executed.

No production service was restarted.

No production data was changed.

No production secrets were printed.

`amnezia-awg` was not touched.

## Required local checks

```text
python .\scripts\check_stage72_production_backup_before_deploy_execution_readiness_checkpoint.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_authorization.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_authorization_audit.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_authorization_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 72.33 - Production backup-before-deploy execution readiness checkpoint audit
```
