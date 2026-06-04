# Stage 72.22 - Production backup-before-deploy planning baseline

Status: baseline
Branch: stage72-production-backup-before-deploy-planning-baseline
Base branch: develop
Previous accepted stage: Stage 72.21 - Production preflight fact collection execution result acceptance
Base develop checkpoint: c263f31
Accepted fact collection result tag: v0.1.0-stage72-production-preflight-fact-collection-execution-result
Scope: production backup-before-deploy planning baseline only

## Goal

Stage 72.22 starts the backup-before-deploy planning block.

This stage defines what must be backed up before any future production deployment.

This stage does not execute SSH commands, does not create backups, does not deploy, and does not restart production services.

## Production facts used

```text
host: 306733.fornex.cloud
ssh_target: root@89.127.203.70
project_dir: /opt/obrportal
production_git_head: 9f358cd
production_git_tag: v0.1.0-stage57-production-protected-backup-execution
```

## Server-only files and directories

```text
.env: yes
docker-compose.override.yml: yes
backups/: yes
/opt/obrportal/backups: 200K
```

These files and directories must be preserved and must not be overwritten by deployment.

## Runtime facts

```text
caddy: active
obrportal-frontend: Up 28 hours, healthy
obrportal-backend: Up 28 hours
obrportal-postgres: Up 7 days, healthy
obrportal-redis: Up 7 days, healthy
obrportal-minio: Up 7 days, healthy
root filesystem: 20G total, 8.0G used, 11G available, 43% used
```

## Storage facts

```text
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

## Backup-before-deploy planning scope

The future backup-before-deploy execution must preserve:

- production `.env` file;
- production `docker-compose.override.yml` file;
- production local `backups/` directory;
- production PostgreSQL data;
- production MinIO data;
- production repository state;
- enough metadata to identify the rollback point;
- enough metadata to identify Docker services and volumes;
- no production secrets in committed docs or chat output.

## Required backup categories

Future backup execution must include at minimum:

```text
1. Git state metadata backup
2. Server-only file backup
3. Database logical backup
4. MinIO object storage backup or volume-level backup plan
5. Docker compose/service state snapshot
6. Rollback metadata file
```

## Forbidden backup actions in this stage

Stage 72.22 must not:

- connect to production;
- execute SSH commands;
- create backup archives;
- read `.env` contents;
- print secrets;
- copy production secrets into the repository;
- stop containers;
- restart containers;
- run migrations;
- run deployment commands;
- prune Docker resources;
- remove Docker volumes;
- touch `amnezia-awg`.

## Future backup execution constraints

Future backup execution must be separately authorized.

It must be read-only with respect to application data except for writing backup artifacts into an approved backup directory.

It must not print secret contents.

It must not commit backup artifacts to the repository.

It must not store database dumps in the Git working tree.

It must not include `.env` contents in documentation.

It must preserve `docker-compose.override.yml` as server-only configuration.

## Proposed backup destination

Preferred production backup destination:

```text
/opt/obrportal/backups/stage72-before-deploy-YYYYMMDD-HHMMSS/
```

The exact timestamped directory must be generated only during a future explicitly authorized backup execution stage.

## Deployment lock

Production deployment remains blocked.

The deployment phrase remains reserved only for a future deployment stage:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

Backup execution also remains blocked until a separate explicit backup execution confirmation is provided.

## Backup no-go criteria

Future backup execution must not proceed if:

- backup destination is unclear;
- available disk space is insufficient;
- database backup command is unclear;
- MinIO backup method is unclear;
- server-only file preservation is unclear;
- rollback metadata format is unclear;
- any command would print secrets;
- any command would restart services;
- any command would touch `amnezia-awg`.

## Baseline decision

Stage 72.22 establishes the backup-before-deploy planning baseline.

No production backup was executed.

No production deployment was executed.

No production service was restarted.

No production data was changed.

No production secrets were printed.

`amnezia-awg` was not touched.

## Required local baseline checks

```text
python .\scripts\check_stage72_production_backup_before_deploy_planning_baseline.py
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
Stage 72.23 - Production backup-before-deploy planning baseline audit
```
