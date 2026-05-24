# Production backup verification

Version: `v0.1.0-stage6`
Stage: `9.3`
Status: `inventory-precheck-recorded`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This document records production backup verification work for ObrPortal.

Current step:

- `9.3.1` - safe production backup inventory and backup coverage precheck.

This step did not perform restore, did not delete volumes, did not restart services and did not print secrets.

## 2. Source

Safe local log source:

- `tmp/stage_9_3_1_backup_inventory_precheck.txt` - not committed.

Secret marker scan result:

- `passed`.

## 3. Precheck decision

| Check | Result |
| --- | --- |
| Backup inventory precheck | `done` |
| Restore performed | `no` |
| Volume delete performed | `no` |
| Service restart performed | `no` |
| `.env` content printed | `no` |
| `.env` key names printed | `no` |
| Server-only file contents printed | `no` |
| Caddy preserved | `yes` |
| `amnezia-awg` preserved | `yes` |
| Localhost-only ports checked | `yes` |

## 4. Public health before backup verification

| Public route | Result |
| --- | --- |
| `https://portal.rcdo02.ru` | `200` |
| `https://portal.rcdo02.ru/health` | `200` |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` |

## 5. Local upstream health before backup verification

| Local route | Result |
| --- | --- |
| `http://127.0.0.1:8000/health` | `ok` |
| `http://127.0.0.1:8000/api/v1/ready` | `ok` |
| `http://127.0.0.1:5173` | `HTTP/1.1 200 OK` |

## 6. Server-only file status

| File | Status | Notes |
| --- | --- | --- |
| `/opt/obrportal/.env` | `exists` | permissions `600`, owner `root:root`, content not printed |
| `/opt/obrportal/docker-compose.override.yml` | `exists` | permissions `644`, content not printed |
| `/etc/caddy/Caddyfile` | `exists` | permissions `644`, content not printed |

Required handling:

- do not commit production `.env`;
- do not print production `.env`;
- do not commit server-only override;
- do not commit server-only Caddyfile;
- backup file contents only into protected server backup artifacts.

## 7. Backup root inventory

Backup root:

- `/opt/obrportal-backups`

Status:

- `backup_root_exists`.

Observed directories:

- `/opt/obrportal-backups/caddy`;
- `/opt/obrportal-backups/compose`;
- `/opt/obrportal-backups/deployment`;
- `/opt/obrportal-backups/env`;
- `/opt/obrportal-backups/postgres`;
- `/opt/obrportal-backups/proxy`;
- `/opt/obrportal-backups/storage`.

## 8. Runtime data inventory

Docker volumes requiring backup coverage:

| Volume | Purpose |
| --- | --- |
| `obrportal_postgres_data` | PostgreSQL data |
| `obrportal_minio_data` | MinIO object storage data |

Docker network observed:

- `obrportal_default`.

## 9. Running container inventory

| Container | Backup relevance |
| --- | --- |
| `obrportal-postgres` | database backup target |
| `obrportal-minio` | object storage backup target |
| `obrportal-backend` | application runtime health |
| `obrportal-frontend` | frontend runtime health |
| `obrportal-redis` | cache/runtime dependency |
| `amnezia-awg` | existing VPN container, preserved, not part of portal backup |

## 10. Port privacy result

Expected public ports:

- `80/tcp` - Caddy;
- `443/tcp` and `443/udp` - Caddy;
- `34503/udp` - existing `amnezia-awg`.

Expected private localhost-only ports:

- `127.0.0.1:8000` - backend;
- `127.0.0.1:5173` - frontend;
- `127.0.0.1:5432` - PostgreSQL;
- `127.0.0.1:6379` - Redis;
- `127.0.0.1:9000` - MinIO API;
- `127.0.0.1:9001` - MinIO console.

Result:

- localhost-only ports checked;
- app/service ports are not exposed directly to public network.

## 11. Backup coverage targets

| Target | Required | Secret handling |
| --- | --- | --- |
| PostgreSQL | `yes` | backup artifact only |
| MinIO | `yes` | backup artifact only |
| Production `.env` | `yes` | required without printing |
| `docker-compose.override.yml` | `yes` | required without printing |
| Caddyfile | `yes` | required without printing |
| Caddy backups | `yes` | backup artifact only |
| Deployment docs | `yes` | git-backed plus optional server copy |

Source precheck markers:

- `backup_target_postgres=required`;
- `backup_target_minio=required`;
- `backup_target_env=required_without_printing`;
- `backup_target_compose_override=required_without_printing`;
- `backup_target_caddyfile=required_without_printing`;
- `backup_target_caddy_backups=required`;
- `backup_target_deployment_docs=required`.

## 12. Safety rules for next backup steps

Do not:

- print production `.env`;
- print production secret values;
- run `docker compose down -v`;
- delete Docker volumes;
- restart services unless explicitly required;
- modify Caddy;
- touch `amnezia-awg`;
- expose private ports publicly.

Additional explicit safety markers:

- do not upload backup artifacts to public storage;
- do not copy backup artifacts outside protected server backup directories;
- do not include production secrets in documentation.

Allowed next step:

- create a protected backup artifact on the server;
- verify artifact metadata without printing sensitive contents;
- record artifact paths, sizes and checksums only.

## 13. Acceptance criteria for inventory precheck

Accepted because:

- public health checks returned `200`;
- local health checks passed;
- backup root exists;
- server-only file presence was verified safely;
- PostgreSQL and MinIO data volumes were identified;
- coverage targets were listed;
- no restore was performed;
- no destructive action was performed;
- secret marker scan passed.

## 14. Protected backup artifact creation result

Step:

- `9.4.1b` - protected backup artifact creation retry.

Result:

| Check | Result |
| --- | --- |
| Protected backup artifact creation | `done` |
| Retry marker | `protected_backup_artifact_creation_retry_done` |
| Restore performed | `no` |
| Volume delete performed | `no` |
| Service restart performed | `no` |
| PostgreSQL dump | `postgres_dump_exit_code=0` |
| PostgreSQL dump non-empty | `postgres_dump_nonempty` |
| PostgreSQL dump header | `postgres_dump_header_valid` |
| PostgreSQL gzip | `postgres_gzip_exit_code=0` |
| PostgreSQL backup | `postgres_backup_created` |
| MinIO copy | `minio_copy_exit_code=0` |
| MinIO tar | `minio_tar_exit_code=0` |
| MinIO gzip | `minio_gzip_exit_code=0` |
| MinIO backup | `minio_backup_created` |
| Final artifact tar | `backup_artifact_tar_exit_code=0` |
| Final artifact | `backup_artifact_created` |
| Artifact gzip test | `backup_artifact_gzip_test_exit_code=0` |
| Artifact tar list test | `backup_artifact_tar_list_exit_code=0` |
| Artifact metadata | `backup_artifact_metadata_verified` |
| Secret marker scan | `passed` |
| Caddy | `preserved` |
| `amnezia-awg` | `preserved` |
| Public health after backup | `preserved` |

Artifact metadata:

| Field | Value |
| --- | --- |
| Run directory | `/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807` |
| Artifact path | `/opt/obrportal-backups/protected/stage_9_4_1b_20260524103807/obrportal_protected_backup_stage_9_4_1b_20260524103807.tar.gz` |
| Artifact size | `12425 bytes` |
| Artifact permissions | `600` |
| Artifact SHA256 | `ea110112a1eef82c2ef048dbb8e0d03102442e9f695f6d5aa27c8a1a0d9eacad` |

Artifact contents verified by metadata only:

- PostgreSQL dump archive: `postgres/postgres_dump.sql.gz`;
- MinIO data archive: `storage/minio_data.tar.gz`;
- server-only files copied without printing contents;
- metadata files created without secrets;
- final `.tar.gz` passed gzip test;
- final `.tar.gz` passed tar list test.

Public health after backup:

| Public route | Result |
| --- | --- |
| `https://portal.rcdo02.ru` | `200` |
| `https://portal.rcdo02.ru/health` | `200` |
| `https://portal.rcdo02.ru/api/v1/ready` | `200` |

Safety result:

- production `.env` content was not printed;
- production `.env` key names were not printed;
- server-only file contents were not printed;
- restore was not performed;
- Docker volumes were not deleted;
- services were not restarted;
- Caddy was preserved;
- `amnezia-awg` was preserved.
