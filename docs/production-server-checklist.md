# Production server checklist

## Purpose

This checklist describes the server-side preparation, deployment commands, verification commands and rollback commands for ObrPortal production deployment after release `v0.1.0-stage6`.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- GitHub Release: `https://github.com/disa-ufa/obrportal/releases/tag/v0.1.0-stage6`
- Production deployment must checkout the release tag, not a moving development branch.

## Server prerequisites

- Linux server with SSH access.
- Dedicated deployment user or root-managed deployment directory.
- Docker installed.
- Docker Compose plugin installed.
- Git installed.
- HTTPS-capable reverse proxy installed or planned.
- Firewall rules prepared for HTTP/HTTPS and SSH.
- Persistent disk space prepared for PostgreSQL and object storage.
- Backup destination prepared outside disposable container lifecycle.

## Recommended directories

- Application directory: `/opt/obrportal`
- Environment file: `/opt/obrportal/.env`
- Backup directory: `/opt/obrportal-backups`
- Reverse proxy config backup directory: `/opt/obrportal-backups/reverse-proxy`

## First server preparation commands

```bash
sudo mkdir -p /opt/obrportal
sudo mkdir -p /opt/obrportal-backups
sudo mkdir -p /opt/obrportal-backups/reverse-proxy
sudo chown -R $USER:$USER /opt/obrportal /opt/obrportal-backups
cd /opt/obrportal
git clone https://github.com/disa-ufa/obrportal.git .
git fetch origin --tags
git checkout v0.1.0-stage6
git status --short
git rev-list -n 1 v0.1.0-stage6
```

Expected release commit:

```text
ac6f339d40567a107dd19f02ec778fbeb5e19971
```

## Production environment preparation

- Create `.env` manually on the server.
- Use `docs/production-environment-template.md` as the reference.
- Do not copy local demo credentials into production.
- Generate a unique production `SECRET_KEY`.
- Use production-specific PostgreSQL credentials.
- Use production-specific storage credentials.
- Restrict `CORS_ORIGINS` to production domains.
- Set `APP_ENV=production`.
- Set `APP_VERSION=0.1.0-stage6`.

## Environment file permissions

```bash
cd /opt/obrportal
chmod 600 .env
ls -la .env
```

## Pre-deployment backup commands

Run before replacing or restarting an existing production deployment:

```bash
cd /opt/obrportal
date -u +%Y%m%dT%H%M%SZ
git rev-parse HEAD > /opt/obrportal-backups/previous-commit.txt
git describe --tags --always > /opt/obrportal-backups/previous-version.txt
cp .env /opt/obrportal-backups/env.backup
```

If PostgreSQL is already running through Docker Compose:

```bash
cd /opt/obrportal
docker compose ps
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > /opt/obrportal-backups/postgres-before-deploy.sql
```

If object storage is stored in a local persistent volume, create a provider-specific snapshot or filesystem backup before deployment.

## Deployment commands

```bash
cd /opt/obrportal
git fetch origin --tags
git checkout v0.1.0-stage6
git status --short
git rev-list -n 1 v0.1.0-stage6
docker compose pull || true
docker compose build
docker compose up -d postgres redis minio
docker compose ps
docker compose up -d backend frontend
docker compose ps
```

## Migration commands

Run migrations after infrastructure services are healthy and before accepting traffic:

```bash
cd /opt/obrportal
docker compose exec -T backend alembic upgrade head
```

## Initial seed commands

Run only when preparing a new production installation:

```bash
cd /opt/obrportal
docker compose exec -T backend python -m app.db.seed
docker compose exec -T backend python -m app.db.seed_admin
docker compose exec -T backend python -m app.db.seed_org
```

After first login, rotate temporary administrator credentials.

## Health verification commands

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
```

Replace `https://example.org` with the real production domain.

## Post-deployment smoke checklist

- `/health` returns status `ok` and version `0.1.0-stage6`.
- `/api/v1/ready` returns ready status for database, Redis and storage.
- Public home page opens.
- Public catalog opens.
- Public document verification page opens.
- Login page opens.
- Account page opens after authentication.
- Admin panel opens for admin user.
- Documents registry opens for admin user.
- Document generation flow works.
- Public verification works by document number.
- Public verification works by verification code.

## Rollback commands

Rollback to the previous saved revision:

```bash
cd /opt/obrportal
docker compose down
git checkout $(cat /opt/obrportal-backups/previous-commit.txt)
docker compose build
docker compose up -d
docker compose ps
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
```

Rollback to the published release tag:

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

## Production acceptance criteria

- Release tag checkout is confirmed.
- `.env` exists only on the server.
- Secrets are production-specific.
- Containers are running.
- Migrations are applied.
- Backend health is green.
- Backend readiness is green.
- Frontend is reachable through HTTPS.
- Public pages work.
- Admin panel works.
- Document workflows work.
- Backup and rollback path are verified.

## Checklist diagnostics

Required diagnostic command:

- `python .\scripts\check_production_server_checklist.py`
