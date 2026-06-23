# Stage 72.34 - Production backup-before-deploy execution readiness checkpoint acceptance

Status: accepted
Branch: stage72-production-backup-before-deploy-execution-readiness-checkpoint-acceptance
Base branch: develop
Previous stage: Stage 72.33 - Production backup-before-deploy execution readiness checkpoint audit
Base develop checkpoint: f5f62a0
Backup execution readiness checkpoint merge commit: 56a80d2
Backup execution readiness checkpoint audit merge commit: f5f62a0
Previous accepted package: v0.1.0-stage72-production-backup-before-deploy-execution-authorization
Scope: production backup-before-deploy execution readiness checkpoint acceptance only

## Goal

Stage 72.34 accepts the production backup-before-deploy execution readiness checkpoint package.

This stage confirms that the readiness checkpoint is documented, audited, bounded, secret-safe and still blocks backup execution until the explicit confirmation phrase is provided.

This stage does not execute SSH commands, does not create backups, does not deploy, and does not restart production services.

## Accepted documents

```text
docs/stage72-production-backup-before-deploy-execution-readiness-checkpoint.md
docs/stage72-production-backup-before-deploy-execution-readiness-checkpoint-audit.md
docs/stage72-production-backup-before-deploy-execution-readiness-checkpoint-acceptance.md
```

## Accepted guards

```text
scripts/check_stage72_production_backup_before_deploy_execution_readiness_checkpoint.py
scripts/check_stage72_production_backup_before_deploy_execution_readiness_checkpoint_audit.py
scripts/check_stage72_production_backup_before_deploy_execution_readiness_checkpoint_acceptance.py
```

## Accepted packages

```text
v0.1.0-stage72-production-backup-before-deploy-planning
v0.1.0-stage72-production-backup-before-deploy-execution-preparation
v0.1.0-stage72-production-backup-before-deploy-execution-authorization
```

## Accepted production facts

```text
host: 306733.fornex.cloud
ssh_target: root@89.127.203.70
project_dir: /opt/obrportal
production_git_head: 9f358cd
production_git_tag: v0.1.0-stage57-production-protected-backup-execution
```

## Accepted server-only preservation targets

```text
.env: yes
docker-compose.override.yml: yes
backups/: yes
/opt/obrportal/backups: 200K
```

## Accepted runtime and storage targets

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

## Accepted amnezia boundary

```text
amnezia-awg systemd unit: no
amnezia docker marker: yes
amnezia-awg container: present
```

`amnezia-awg` must not be touched by backup, deploy, cleanup or Docker commands.

## Accepted backup execution gate

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

## Accepted deployment gate

Production deployment remains blocked until the separate future phrase:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

Backup authorization and deployment authorization are separate gates.

## Accepted future backup destination

After explicit backup authorization, backup execution may create a timestamped server-local directory:

```text
/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/
```

## Accepted required future backup artifacts

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

## Accepted future backup-only actions

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

## Accepted forbidden actions

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

## Decision

Stage 72 production backup-before-deploy execution readiness checkpoint is accepted.

No production backup was executed.

No production deployment was executed.

No production service was restarted.

No production data was changed.

No production secrets were printed.

`amnezia-awg` was not touched.

## Required local acceptance checks

```text
python .\scripts\check_stage72_production_backup_before_deploy_execution_readiness_checkpoint.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_readiness_checkpoint_audit.py
python .\scripts\check_stage72_production_backup_before_deploy_execution_readiness_checkpoint_acceptance.py
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
Stage 72.35 - Production backup-before-deploy execution readiness checkpoint package tag
```

Stage 72.35 must tag the accepted backup-before-deploy execution readiness checkpoint package after all local checks pass.
