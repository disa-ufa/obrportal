# Production release runbook

Status: accepted
Stage: 11.4
Production domain: portal.rcdo02.ru
Production server: 89.127.203.70
Production hardened tag: v0.1.0-stage10-production-hardened

## 1. Purpose

This runbook defines a safe production release procedure for ObrPortal.

A production release must update the server only after local checks, CI checks, repository synchronization and production smoke checks.

## 2. Release safety rules

Release operations must be controlled and reversible.

Forbidden release actions:

- do not force push to main;
- do not deploy from an uncommitted working tree;
- do not deploy if CI is red;
- do not print .env;
- do not print passwords;
- do not print tokens;
- do not commit server-only docker-compose.override.yml;
- do not run docker compose down -v;
- do not delete production volumes;
- do not restore database dumps over production without a separate approved maintenance window;
- do not expose internal service ports publicly.

## 3. Local pre-release checklist

Before release, local workstation must pass:

- python scripts/check_production_monitoring_runbook.py;
- python scripts/check_production_restore_drill_runbook.py;
- python scripts/check_production_operations_runbook.py;
- python scripts/check_frontend_static_serving.py;
- python scripts/check_production_frontend_static_runbook.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py;
- docker compose exec frontend npm run build;
- docker compose exec backend pytest app/tests -q.

Required git state:

- working tree is clean;
- develop is pushed;
- main is fast-forwarded from develop;
- origin/main equals main;
- origin/develop equals develop.

## 4. CI gate

CI must be green before production sync.

Required CI expectations:

- production monitoring runbook guard passes;
- production restore drill runbook guard passes;
- production operations runbook guard passes;
- production static frontend runbook guard passes;
- frontend static serving guard passes;
- CI/local gate consistency guard passes;
- backend tests pass;
- frontend build passes.

If CI is red, release must stop.

## 5. Server preflight

Before applying release on server:

- cd /opt/obrportal;
- verify current branch is develop;
- verify git status only contains allowed server-only files;
- allowed server-only files include docker-compose.override.yml, tmp/ and backups/;
- run git fetch origin main develop --tags;
- run git pull --ff-only origin develop;
- verify git head equals target release commit;
- run repository guards on server.

## 6. Database migration policy

Before migrations:

- check alembic current;
- check alembic heads;
- verify expected head;
- create or verify a recent backup when release includes migrations.

Allowed migration command:

- docker compose exec -T backend alembic upgrade head.

After migrations:

- run alembic current;
- run local /api/v1/ready;
- run public /api/v1/ready.

Forbidden database actions:

- manual schema edits;
- dropping production database;
- deleting production volumes;
- restoring backup over production without approved maintenance window.

## 7. Runtime update policy

For backend-only or frontend-only release:

- prefer targeted docker compose up -d --build backend frontend;
- do not recreate postgres, redis or minio unless required;
- preserve docker-compose.override.yml;
- verify frontend remains obrportal-frontend-static:prod;
- verify frontend command remains nginx -g daemon off;
- verify ports remain bound to 127.0.0.1 only.

For documentation-only release:

- sync repository;
- run guards;
- do not rebuild containers unless runtime files changed.

## 8. Post-release smoke

Required local server checks:

- http://127.0.0.1:5173/healthz returns ok;
- http://127.0.0.1:8000/api/v1/ready returns database=ok, redis=ok, storage=ok;
- frontend health is healthy;
- postgres, redis and minio are healthy;
- backend is running.

Required public checks:

- https://portal.rcdo02.ru/ returns HTTP 200;
- https://portal.rcdo02.ru/login returns HTTP 200;
- https://portal.rcdo02.ru/admin returns HTTP 200;
- https://portal.rcdo02.ru/api/v1/ready returns database=ok, redis=ok, storage=ok.

## 9. Rollback policy

Rollback must be planned before risky release.

Allowed rollback options:

- git reset --hard to previous accepted commit only after explicit decision;
- restore previous docker-compose.override.yml backup if override was changed;
- rebuild previous known-good image if runtime image was changed;
- restore database backup only in a separate approved maintenance window.

Rollback safety rules:

- do not delete production volumes;
- do not run docker compose down -v;
- do not overwrite production database without approved maintenance window;
- do not hide failed release evidence.

## 10. Release evidence

Each production release must create a report in:

- /opt/obrportal/tmp

The report must include:

- target commit;
- previous commit;
- branch;
- local guard result;
- CI status confirmation;
- server sync result;
- migration result if applicable;
- frontend image and command;
- local smoke result;
- public smoke result;
- rollback backup path if applicable;
- secrets_printed=no.

## 11. Acceptance criteria

Production release is accepted when:

- target commit is deployed or documentation is synced;
- repository guards pass on server;
- migrations are current if applicable;
- frontend remains static nginx;
- internal ports remain bound to 127.0.0.1 only;
- public /, /login and /admin return HTTP 200;
- public /api/v1/ready returns database=ok, redis=ok, storage=ok;
- no secrets are printed;
- release report is created.

## 12. Server release runbook check result - 2026-05-27

Status: accepted

Production release runbook was checked on the production server and accepted.

Accepted evidence:

- production git head after sync: 6971ec7;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- server git status contained only allowed server-only files;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- alembic current: 6421_org_doc_profile (head);
- alembic heads: 6421_org_doc_profile (head);
- local /healthz returned ok;
- local /api/v1/ready returned database=ok, redis=ok, storage=ok;
- public / returned HTTP 200;
- public /login returned HTTP 200;
- public /admin returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- internal ports 5173, 8000, 5432, 6379, 9000 and 9001 were bound to 127.0.0.1;
- Docker service was enabled and active;
- Caddy service was enabled and active;
- secrets_printed=no;
- release_runbook_server_check=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_11_4_1_release_runbook_server_check_20260527145103.txt
