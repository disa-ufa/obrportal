# Production deployment runbook

## Purpose

This runbook consolidates the production deployment process for ObrPortal after release `v0.1.0-stage6`.

It links together release baseline, environment preparation, server preparation, reverse proxy, backup, monitoring, deployment verification and rollback.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- GitHub Release: `https://github.com/disa-ufa/obrportal/releases/tag/v0.1.0-stage6`
- Production deployment must checkout the release tag, not a moving branch.

## Source documents

- `docs/production-deployment-plan.md`
- `docs/production-environment-template.md`
- `docs/production-server-checklist.md`
- `docs/production-reverse-proxy-checklist.md`
- `docs/production-backup-monitoring-checklist.md`
- `docs/release-handoff.md`
- `CHANGELOG.md`

## Local pre-deployment gate

Run locally before touching production:

```powershell
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_frontend_api_errors.py
python .\scripts\check_frontend_mojibake.py
python .\scripts\frontend_guard.py
python .\scripts\check_ci_local_gate.py
python .\scripts\check_release_readiness.py
python .\scripts\check_release_versioning.py
python .\scripts\check_release_candidate.py
python .\scripts\check_release_tag.py
python .\scripts\check_production_deployment_plan.py
python .\scripts\check_production_environment_template.py
python .\scripts\check_production_server_checklist.py
python .\scripts\check_production_reverse_proxy_checklist.py
python .\scripts\check_production_backup_monitoring_checklist.py
docker compose exec backend pytest app/tests -q
python .\scripts\smoke_auth_rbac.py
python .\scripts\smoke_document_generation_flow.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_public_pages.py
python .\scripts\smoke_account_page.py
python .\scripts\smoke_frontend_hooks_layout.py
python .\scripts\smoke_frontend_utils_routes.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_frontend_smoke_coverage.py
python .\scripts\check_backend_smoke_coverage.py
python .\scripts\check_no_todo_markers.py
docker compose exec frontend npm run build
python .\scripts\check_frontend_bundle_encoding.py
```

## Server preparation summary

Use `docs/production-server-checklist.md` as the detailed source.

Required baseline:

```bash
sudo mkdir -p /opt/obrportal
sudo mkdir -p /opt/obrportal-backups
sudo chown -R $USER:$USER /opt/obrportal /opt/obrportal-backups
cd /opt/obrportal
git clone https://github.com/disa-ufa/obrportal.git .
git fetch origin --tags
git checkout v0.1.0-stage6
git rev-list -n 1 v0.1.0-stage6
```

Expected commit:

```text
ac6f339d40567a107dd19f02ec778fbeb5e19971
```

## Production environment summary

Use `docs/production-environment-template.md` as the detailed source.

Required rules:

- Production `.env` is created manually on the server.
- Production `.env` is never committed to Git.
- `APP_ENV=production`.
- `APP_VERSION=0.1.0-stage6`.
- `SECRET_KEY` is production-specific.
- Database credentials are production-specific.
- Storage credentials are production-specific.
- CORS origins are restricted to production domains.

## Backup before deployment

Use `docs/production-backup-monitoring-checklist.md` as the detailed source.

Minimum backup commands:

```bash
cd /opt/obrportal
BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)
git rev-parse HEAD > /opt/obrportal-backups/deployment/commit-$BACKUP_TS.txt
git describe --tags --always > /opt/obrportal-backups/deployment/version-$BACKUP_TS.txt
cp .env /opt/obrportal-backups/env/env-$BACKUP_TS.backup
chmod 600 /opt/obrportal-backups/env/env-$BACKUP_TS.backup
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > /opt/obrportal-backups/postgres/postgres-$BACKUP_TS.sql
```

## Deployment order

```bash
cd /opt/obrportal
git fetch origin --tags
git checkout v0.1.0-stage6
git status --short
git rev-list -n 1 v0.1.0-stage6
docker compose build
docker compose up -d postgres redis minio
docker compose ps
docker compose exec -T backend alembic upgrade head
docker compose up -d backend frontend
docker compose ps
```

## Initial seed order

Run only for a new production installation:

```bash
cd /opt/obrportal
docker compose exec -T backend python -m app.db.seed
docker compose exec -T backend python -m app.db.seed_admin
docker compose exec -T backend python -m app.db.seed_org
```

After first login, rotate temporary administrator credentials.

## Reverse proxy and HTTPS

Use `docs/production-reverse-proxy-checklist.md` as the detailed source.

Required outcome:

- Production domain resolves to the server.
- HTTPS certificate is valid.
- HTTP redirects to HTTPS.
- Frontend SPA routes fallback to `index.html`.
- `/health` proxies to backend `/health`.
- `/api/v1/ready` proxies to backend `/api/v1/ready`.
- `/api/` proxies to backend API.

## Post-deployment verification

From the server:

```bash
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
```

Through the production domain:

```bash
curl -fsS https://example.org/health
curl -fsS https://example.org/api/v1/ready
curl -I https://example.org/
curl -I https://example.org/catalog
curl -I https://example.org/admin
curl -I https://example.org/verify-document
```

Replace `https://example.org` with the real production domain.

## Browser verification

- Home page opens through HTTPS.
- Catalog page opens through HTTPS.
- Login page opens through HTTPS.
- Account page opens after authentication.
- Admin panel opens for admin user.
- Document registry opens for admin user.
- Document generation works.
- Public document verification works.
- Page refresh works on nested frontend routes.
- Browser shows no mixed content warnings.

## Rollback order

Application rollback:

```bash
cd /opt/obrportal
docker compose down
git checkout $(cat /opt/obrportal-backups/deployment/commit-YYYYMMDDTHHMMSSZ.txt)
docker compose build
docker compose up -d
docker compose ps
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
```

Rollback to release tag:

```bash
cd /opt/obrportal
docker compose down
git fetch origin --tags
git checkout v0.1.0-stage6
docker compose build
docker compose up -d
docker compose ps
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
```

Database restore must be performed only when schema or data changes require it and only from a verified backup.

## Final acceptance criteria

- Release tag checkout is confirmed.
- Production `.env` exists only on the server.
- Backups are created before deployment.
- Migrations are applied.
- Containers are running.
- Backend health is green.
- Backend readiness is green.
- HTTPS works.
- Frontend routes work.
- Backend API routes work.
- Admin panel works.
- Document workflows work.
- Monitoring commands are documented.
- Rollback path is documented.

## Runbook diagnostics

Required diagnostic command:

- `python .\scripts\check_production_deployment_runbook.py`

## Repository workspace preparation result - 2026-05-24

Repository workspace has been prepared on the production server.

| Item | Result | Notes |
| --- | --- | --- |
| Application directory | `/opt/obrportal` | Repository cloned into this directory. |
| Repository branch | `develop` | Checked out on server. |
| Server HEAD | `61867f063f82c8f2c3ed2553b64b535eeaf74e90` | Matches `origin/develop` at the time of preparation. |
| Release tag | `v0.1.0-stage6` | Available. |
| Release tag commit | `ac6f339d40567a107dd19f02ec778fbeb5e19971` | Verified. |
| Production `.env` | `missing` | Must be created in the next stage. |
| Docker Compose | `not started` | No application containers were started. |
| Caddy | `active` | Temporary HTTPS placeholder preserved. |
| Existing `amnezia-awg` | `preserved` | Container remains running. |

Next runbook action:

- create production `.env` manually and securely;
- verify `.env` presence and permissions without printing values;
- start application stack only after safe `.env` checks.

## Production environment preparation result - 2026-05-24

Production `.env` is prepared and safe-audited.

| Item | Result | Notes |
| --- | --- | --- |
| `.env` | `exists` | Created on production server. |
| Permissions | `600` | Verified. |
| Owner | `root:root` | Verified. |
| Key coverage | `42/42` | No key names printed. |
| Missing keys | `0` | Safe count only. |
| Extra keys | `0` | Safe count only. |
| Empty values | `0` | Safe count only. |
| Placeholder values | `0` | Safe count only. |
| Docker Compose | `not started` | Start only in next controlled step. |
| Caddy placeholder | `preserved` | HTTPS still returns placeholder. |
| Existing `amnezia-awg` | `preserved` | Not touched. |

Next runbook action:

- run final pre-compose safety check;
- start app stack with Docker Compose;
- verify local service health before changing Caddy routes.
