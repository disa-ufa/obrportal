# Production initialization runbook

Version: `v0.1.0-stage6-ops9`
Stage: `10.6`
Status: `drafted`
Base commit: `a821595`
Production domain: `portal.rcdo02.ru`
Public URL: `https://portal.rcdo02.ru`

## 1. Purpose

This runbook defines safe production initialization for ObrPortal.

It does not execute production changes. It only documents the controlled order for backup-before-init, migrations, seed, real admin creation, real organization creation, smoke checks and backup-after-init.

## 2. Current baseline

| Item | Value |
| --- | --- |
| Release checkpoint | `v0.1.0-stage6-ops9` |
| Current develop commit | `a821595` |
| Main checkpoint | `79c64c0` |
| Production URL | `https://portal.rcdo02.ru` |
| Stage 9 status | closed |
| Stage 10.1 | closed |
| Stage 10.2 | closed |
| Stage 10.3 | closed |
| Stage 10.4 | closed |
| Stage 10.5 | closed |

Current production note:

- Stage 9 restore dry-run documented that current production PostgreSQL public table count was `0`;
- current PostgreSQL dump was valid but minimal;
- Stage 10 initialization must create schema/tables through migrations;
- after initialization, backup must contain schema/table markers.

## 3. Non-negotiable safety rules

Do not:

- do not print production `.env`;
- do not print secret values;
- do not commit `.env`;
- do not run `docker compose down -v`;
- do not delete Docker volumes;
- do not restore production database during initialization;
- do not restore production MinIO data during initialization;
- do not expose private service ports publicly;
- do not touch `amnezia-awg`;
- do not run destructive SQL;
- do not run migrations without backup-before-init;
- do not create demo credentials in production.

## 4. Pre-initialization local checks

Run locally:

- `git fetch origin --tags`
- `git status --short`
- `git branch -vv`
- `git log --oneline --decorate -10`

Required result:

- working tree is clean;
- current branch is `develop`;
- `develop` is pushed to `origin/develop`;
- production secrets are not present in repository.

## 5. Pre-initialization diagnostics

Run local diagnostics:

- `python .\scripts\check_frontend_no_demo_credentials.py`
- `python .\scripts\check_frontend_api_base_config.py`
- `python .\scripts\check_ci_local_gate.py`
- `python .\scripts\check_readme_stage10_state.py`
- `python .\scripts\check_project_roadmap_after_stage9.py`
- `python .\scripts\check_production_stage9_final_gate.py`
- `python .\scripts\check_production_handover_package.py`
- `python .\scripts\check_production_maintenance_update_checklist.py`
- `python .\scripts\check_production_operational_runbook.py`
- `python .\scripts\check_production_backup_verification.py`
- `python .\scripts\check_production_monitoring_smoke.py`
- `python .\scripts\check_production_operations_baseline.py`
- `python .\scripts\check_release_readiness.py`
- `python .\scripts\smoke_frontend_core.py`
- `python .\scripts\check_frontend_smoke_coverage.py`
- `python .\scripts\check_no_todo_markers.py`
- `python .\scripts\check_source_bom.py`
- `python .\scripts\check_text_encoding.py`

## 6. Production connection safety

Expected production directory:

- `/opt/obrportal`

Before production actions:

- `cd /opt/obrportal`
- `pwd`
- `git status --short`
- `docker compose ps`

Required:

- directory is `/opt/obrportal`;
- git status is clean;
- Docker Compose stack is running;
- `.env` exists but is not printed;
- compose override preserves localhost-only ports;
- Caddy remains public HTTP/HTTPS entrypoint;
- `amnezia-awg` is untouched.

## 7. Backup before initialization

Before migrations or seed commands, create backup-before-init.

Backup must include:

- PostgreSQL dump;
- MinIO data archive;
- production `.env` copy without printing;
- server-only compose override copy without printing;
- Caddyfile copy without printing;
- SHA256 checksum;
- gzip/tar verification.

Required rule:

- if backup-before-init fails, initialization stops.

## 8. Migration procedure

After backup-before-init passes:

- `docker compose exec backend alembic upgrade head`
- `docker compose exec backend alembic current`
- `docker compose exec backend alembic heads`

Expected:

- current revision equals head revision;
- no migration errors;
- application containers remain running.

## 9. Database structure verification

After migrations, verify that public tables exist.

Allowed verification:

- `docker compose exec postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt public.*"`

Expected:

- public table count is greater than `0`;
- core application tables exist;
- alembic version table exists;
- table data is not printed.

## 10. Seed roles and permissions

After migrations:

- `docker compose exec backend python -m app.db.seed`

Expected:

- system roles created or updated;
- permissions created or updated;
- role-permission links created or updated;
- command is idempotent.

## 11. Create real production admin

Production admin must not use demo credentials.

Forbidden production credentials:

- `admin@obrportal.local`;
- `Admin123Local2026!`;
- `learner@obrportal.local`;
- `Learner123Local2026!`.

Expected:

- one real admin exists;
- admin role is assigned;
- admin can log in;
- `/api/v1/auth/me` returns admin roles;
- real password is not printed.

## 12. Create real organization profile

Create or update the real organization profile.

Required fields:

- organization name;
- INN;
- KPP;
- OGRN;
- legal address;
- actual address;
- document issuer name;
- document signer position;
- document signer name;
- document basis;
- document place.

## 13. Post-initialization public smoke

After migrations and seed:

- `curl -fsS https://portal.rcdo02.ru >/dev/null`
- `curl -fsS https://portal.rcdo02.ru/health`
- `curl -fsS https://portal.rcdo02.ru/api/v1/ready`

Expected:

| Route | Expected |
| --- | --- |
| `/` | `200` |
| `/health` | `status=ok` |
| `/api/v1/ready` | `database=ok`, `redis=ok`, `storage=ok` |

## 14. Post-initialization auth smoke

Required auth smoke:

- login as real admin;
- call `/api/v1/auth/me`;
- call admin RBAC check;
- open admin dashboard route;
- verify admin API is not public without token;
- do not use demo credentials;
- do not print real password.

## 15. Post-initialization backup

After successful initialization, create backup-after-init.

Required difference from Stage 9 backup:

- PostgreSQL dump must include schema/table markers;
- public table count must be greater than `0`;
- backup SHA256 must be recorded;
- restore metadata dry-run must be repeated.

Expected output:

- backup-after-init artifact path;
- SHA256;
- dump line count;
- CREATE TABLE count;
- restore dry-run result.

## 16. Rollback boundaries

Allowed rollback during initialization planning:

- stop before migrations if backup fails;
- stop before seed if migrations fail;
- stop before admin creation if seed fails;
- document failure and keep production running if health remains green.

Forbidden rollback actions without separate plan:

- do not run `docker compose down -v`;
- do not delete volumes;
- do not restore database without explicit restore plan;
- do not restore MinIO without explicit restore plan;
- do not overwrite `.env`;
- do not expose private ports.

## 17. Acceptance criteria

Production initialization is accepted when:

- backup-before-init exists and is verified;
- migrations are applied;
- public table count is greater than `0`;
- roles and permissions are seeded;
- real admin exists;
- demo credentials are not used;
- real organization profile exists;
- public health is green;
- readiness is green;
- auth smoke passes;
- admin RBAC smoke passes;
- backup-after-init exists and is verified;
- restore metadata dry-run after initialization passes;
- no secrets were printed;
- no server-only files were committed.

## 18. Pre-init server check result - 2026-05-24

Source:

- local safe report `tmp/stage_10_11_1_pre_init_server_check.txt` was reviewed locally and is not committed.

Secret scan:

- result: `passed`;
- production `.env` content was not printed;
- secret values were not printed.

Confirmed production facts:

| Item | Result |
| --- | --- |
| Production directory | `/opt/obrportal` |
| Server git HEAD | `4686cf5` |
| Server git branch | `develop` |
| Required pre-init tag | `v0.1.0-stage10-pre-init` |
| Required pre-init commit | `f0f98f9` |
| Tag fetched on server | `yes` |
| Production `.env` | exists |
| Production `.env` permissions | `600` |
| Production `.env` owner | `root:root` |
| Server-only compose override | exists |
| Caddyfile | exists |
| Caddy status | `active` |
| Docker Compose stack | running |
| App/service ports | localhost-only |
| Public frontend smoke | passed |
| Public health smoke | passed |
| Public readiness smoke | passed |
| Secret marker scan | passed |

Blocker before migrations:

- production workspace is behind the required pre-init checkpoint;
- `/opt/obrportal` currently runs code from `4686cf5`;
- local/repository pre-init checkpoint is `f0f98f9`;
- migrations must not be executed until a controlled production workspace sync is completed.

Decision:

- do not run `alembic upgrade head` yet;
- do not run seed commands yet;
- first create backup-before-init of the current live state;
- then perform controlled production workspace sync to `v0.1.0-stage10-pre-init`;
- preserve server-only `docker-compose.override.yml`;
- preserve production `.env`;
- preserve Caddy;
- preserve `amnezia-awg`.

## 19. Backup-before-init result - 2026-05-24

Source:

- local safe report `tmp/stage_10_11_5_backup_before_init_20260524190057.txt` was reviewed locally and is not committed;
- local safe validation report `tmp/stage_10_11_5b_backup_before_init_validation.txt` was reviewed locally and is not committed.

First attempt:

- result: `failed / superseded`;
- PostgreSQL dump was created;
- PostgreSQL restore list was not created;
- MinIO archive was not valid because `tar` was not available inside the MinIO container;
- protected tar existed but was not accepted as complete backup-before-init.

Retry and validation:

| Item | Result |
| --- | --- |
| Accepted backup directory | `/opt/obrportal-backups/protected/stage_10_11_5a_pre_init_retry_20260524190539` |
| Accepted backup tar | `/opt/obrportal-backups/protected/stage_10_11_5a_pre_init_retry_20260524190539.tar.gz` |
| Backup tar SHA256 | `5dcfaaf495bd3200ecf9af8fe00618ebec40563cce3b7c7e38188ae6e2f479be` |
| Backup tar exists | `yes` |
| Backup tar SHA256 check | `yes` |
| Backup tar valid | `yes` |
| PostgreSQL dump exists | `yes` |
| PostgreSQL dump SHA256 check | `yes` |
| PostgreSQL restore list exists | `yes` |
| PostgreSQL restore list SHA256 check | `yes` |
| PostgreSQL restore list lines | `15` |
| PostgreSQL table marker count | `0` |
| MinIO archive exists | `yes` |
| MinIO archive SHA256 check | `yes` |
| MinIO archive valid | `yes` |
| Production `.env` backup exists | `yes` |
| Production `.env` SHA256 check | `yes` |
| Compose override backup exists | `yes` |
| Compose override SHA256 check | `yes` |
| Caddyfile backup exists | `yes` |
| Caddyfile SHA256 check | `yes` |
| Secret marker scan | `passed` |
| Production `.env` content printed | `no` |
| Secret values printed | `no` |
| Migration executed | `no` |
| Seed executed | `no` |
| Workspace sync executed | `no` |

Important note:

- `postgres_table_marker_count=0` is expected for the current pre-initialization production database;
- Stage 9 already documented the production database as empty/minimal before migrations;
- this backup is accepted as backup-before-init for the current live state before workspace sync and before migrations.

Decision:

- backup-before-init is accepted;
- migrations are still blocked until controlled production workspace sync is completed;
- next step is controlled sync of `/opt/obrportal` to `v0.1.0-stage10-pre-init`;
- preserve `/opt/obrportal/.env`;
- preserve `/opt/obrportal/docker-compose.override.yml`;
- preserve `/etc/caddy/Caddyfile`;
- preserve `amnezia-awg`.

## 20. Controlled production workspace sync result - 2026-05-24

Source:

- local safe report `tmp/stage_10_11_6_workspace_sync_result.txt` was reviewed locally and is not committed.

Sync target:

| Item | Result |
| --- | --- |
| Target tag | `v0.1.0-stage10-pre-init` |
| Target commit | `f0f98f9` |
| Production git HEAD after sync | `f0f98f9` |
| Production git branch | `develop` |

Preserved server-only files:

| Item | Result |
| --- | --- |
| Production `.env` | exists |
| Server-only compose override | exists |
| Caddyfile | exists |
| Caddy status | `active` |

Runtime result:

| Item | Result |
| --- | --- |
| Docker Compose rebuild | completed |
| Backend container | running |
| Frontend container | running |
| PostgreSQL container | running / healthy |
| Redis container | running / healthy |
| MinIO container | running / healthy |
| Public frontend smoke | passed |
| Public health smoke | passed |
| Public readiness smoke | passed |
| App/service ports | localhost-only |
| Secret marker scan | passed |
| Production `.env` content printed | `no` |
| Secret values printed | `no` |
| Migration executed | `no` |
| Seed executed | `no` |

Decision:

- controlled production workspace sync is accepted;
- production code is now at `v0.1.0-stage10-pre-init`;
- backup-before-init was completed before sync;
- migrations can be planned as the next controlled step;
- seed commands are still blocked until migrations are completed;
- production `.env` remains server-only;
- `docker-compose.override.yml` remains server-only;
- Caddy remains the public HTTP/HTTPS entrypoint;
- `amnezia-awg` remains untouched.

## 21. Production initialization execution result - 2026-05-26

Status: `passed`

Accepted production state:

| Item | Result |
| --- | --- |
| Production git checkpoint | `f0f98f9` during controlled initialization |
| Repository checkpoint after CI smoke fix | `6f6e37a` |
| Production directory | `/opt/obrportal` |
| Public domain | `portal.rcdo02.ru` |
| Public IP | `89.127.203.70` |
| DNS A record | `portal.rcdo02.ru -> 89.127.203.70` |
| HTTPS reverse proxy | Caddy active |
| Docker Compose stack | backend, frontend, postgres, redis, minio running |
| Alembic revision | `6421_org_doc_profile (head)` |
| Roles and permissions seed | passed |
| Production admin | one real active admin exists |
| Bad admin seed attempt | disabled and admin role removed |
| Demo credentials in production | not created |
| Local ready smoke | passed |
| Public health smoke | passed |
| Public ready smoke | passed |
| CORS preflight for login | passed |
| Browser admin login | passed |
| Admin API loading | passed |
| Secrets printed | no |
| Real password printed | no |

Accepted smoke evidence:

- `https://portal.rcdo02.ru/health` returned `status=ok`;
- `https://portal.rcdo02.ru/api/v1/ready` returned `database=ok`, `redis=ok`, `storage=ok`;
- `OPTIONS /api/v1/auth/login` returned successful CORS preflight for `https://portal.rcdo02.ru`;
- browser login opened `/admin`;
- admin UI showed `health: ok`, `ready: ok`, `authenticated`, `admin api: loaded`.

Known non-blocking follow-up items:

- unify visible UI labels where public page shows `STAGE 7` and admin page shows `STAGE 6`;
- replace production frontend Vite dev server with a static production build served by Caddy or a lightweight static container;
- keep monitoring GitHub Actions until latest `main` workflow is green.

## 22. Local post-fix gate result - 2026-05-26

Status: `passed`

Local verification after commit `6f6e37a`:

| Check | Result |
| --- | --- |
| `python scripts/check_frontend_api_base_config.py` | passed |
| `python scripts/smoke_frontend_api_client.py` | passed |
| `python scripts/frontend_guard.py` | passed |
| `python scripts/smoke_frontend_admin_pages.py` | passed |
| `docker compose exec frontend npm run build` | passed |
| `docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q` | `214 passed, 4 warnings` |

The Vite chunk-size warning is accepted as non-blocking for this checkpoint.
