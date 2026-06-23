# Stage 72.24 - Production backup-before-deploy planning baseline acceptance

Status: accepted
Branch: stage72-production-backup-before-deploy-planning-baseline-acceptance
Base branch: develop
Previous stage: Stage 72.23 - Production backup-before-deploy planning baseline audit
Base develop checkpoint: d55561e
Backup planning baseline merge commit: af64961
Backup planning baseline audit merge commit: d55561e
Accepted fact collection result tag: v0.1.0-stage72-production-preflight-fact-collection-execution-result
Scope: production backup-before-deploy planning baseline acceptance only

## Goal

Stage 72.24 accepts the production backup-before-deploy planning baseline package.

This stage confirms that the backup-before-deploy plan is documented, audited, bounded, secret-safe and ready for a future separately authorized backup execution stage.

This stage does not execute SSH commands, does not create backups, does not deploy, and does not restart production services.

## Accepted documents

```text
docs/stage72-production-backup-before-deploy-planning-baseline.md
docs/stage72-production-backup-before-deploy-planning-baseline-audit.md
docs/stage72-production-backup-before-deploy-planning-baseline-acceptance.md
```

## Accepted guards

```text
scripts/check_stage72_production_backup_before_deploy_planning_baseline.py
scripts/check_stage72_production_backup_before_deploy_planning_baseline_audit.py
scripts/check_stage72_production_backup_before_deploy_planning_baseline_acceptance.py
```

## Accepted production facts

```text
host: 306733.fornex.cloud
ssh_target: root@89.127.203.70
project_dir: /opt/obrportal
production_git_head: 9f358cd
production_git_tag: v0.1.0-stage57-production-protected-backup-execution
```

## Accepted server-only preservation scope

```text
.env: yes
docker-compose.override.yml: yes
backups/: yes
/opt/obrportal/backups: 200K
```

These files and directories must be preserved and must not be overwritten by deployment.

## Accepted runtime facts

```text
caddy: active
obrportal-frontend: Up 28 hours, healthy
obrportal-backend: Up 28 hours
obrportal-postgres: Up 7 days, healthy
obrportal-redis: Up 7 days, healthy
obrportal-minio: Up 7 days, healthy
root filesystem: 20G total, 8.0G used, 11G available, 43% used
```

## Accepted storage facts

```text
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

## Accepted backup-before-deploy scope

Future backup-before-deploy execution must preserve:

- production `.env` file;
- production `docker-compose.override.yml` file;
- production local `backups/` directory;
- production PostgreSQL data;
- production MinIO data;
- production repository state;
- rollback metadata;
- Docker services and volume metadata;
- secret-safe evidence only.

## Accepted required backup categories

Future backup execution must include at minimum:

```text
1. Git state metadata backup
2. Server-only file backup
3. Database logical backup
4. MinIO object storage backup or volume-level backup plan
5. Docker compose/service state snapshot
6. Rollback metadata file
```

## Accepted backup destination

Preferred future backup destination:

```text
/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/
```

The exact timestamped directory must be generated only during a future explicitly authorized backup execution stage.

## Accepted secret-safety rules

- `.env` contents must not be printed.
- Production secrets must not be copied into the repository.
- Database dumps must not be stored in the Git working tree.
- Backup artifacts must remain server-local unless explicitly approved.
- Documentation must contain only metadata and verification evidence.
- Secret scans remain required before commit.

## Accepted deployment lock

Production deployment remains blocked.

The deployment phrase remains reserved only for a future deployment stage:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

Stage 72.24 does not authorize deployment.

Stage 72.24 does not authorize backup execution.

Stage 72.24 does not authorize SSH execution.

## Accepted backup no-go criteria

Future backup execution must remain blocked if:

- backup destination is unclear;
- available disk space is insufficient;
- database backup command is unclear;
- MinIO backup method is unclear;
- server-only file preservation is unclear;
- rollback metadata format is unclear;
- any command would print secrets;
- any command would restart services;
- any command would touch `amnezia-awg`.

## Decision

Stage 72 production backup-before-deploy planning baseline is accepted.

No production backup was executed.

No production deployment was executed.

No production service was restarted.

No production data was changed.

No production secrets were printed.

`amnezia-awg` was not touched.

## Required local acceptance checks

```text
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline.py
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline_audit.py
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline_acceptance.py
python .\scripts\check_stage72_production_preflight_fact_collection_execution_result.py
python .\scripts\check_stage72_production_preflight_fact_collection_execution_result_audit.py
python .\scripts\check_stage72_production_preflight_fact_collection_execution_result_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 72.25 - Production backup-before-deploy planning package tag
```

Stage 72.25 must tag the accepted backup-before-deploy planning package after all local checks pass.
