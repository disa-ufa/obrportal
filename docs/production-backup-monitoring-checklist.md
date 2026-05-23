# Production backup monitoring checklist

## Purpose

This checklist describes production backup, monitoring, maintenance and incident response requirements for ObrPortal after release `v0.1.0-stage6`.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Production deployment must keep backups and monitoring outside disposable container lifecycle.

## Backup goals

- Keep recoverable PostgreSQL backups.
- Keep recoverable object storage backups.
- Keep production `.env` backup in a secure location.
- Keep reverse proxy configuration backup.
- Keep release commit/tag records for rollback.
- Verify backup restore procedure on a staging or production-like environment.

## Backup scope

- PostgreSQL database.
- Object storage bucket or persistent volume.
- Production `.env` file.
- Reverse proxy configuration.
- Docker Compose configuration.
- Current deployment commit SHA and release tag.

## Backup directories

- Backup root: `/opt/obrportal-backups`
- Database backups: `/opt/obrportal-backups/postgres`
- Storage backups: `/opt/obrportal-backups/storage`
- Environment backups: `/opt/obrportal-backups/env`
- Reverse proxy backups: `/opt/obrportal-backups/reverse-proxy`
- Deployment metadata: `/opt/obrportal-backups/deployment`

## Backup preparation commands

```bash
sudo mkdir -p /opt/obrportal-backups/postgres
sudo mkdir -p /opt/obrportal-backups/storage
sudo mkdir -p /opt/obrportal-backups/env
sudo mkdir -p /opt/obrportal-backups/reverse-proxy
sudo mkdir -p /opt/obrportal-backups/deployment
sudo chown -R $USER:$USER /opt/obrportal-backups
```

## PostgreSQL backup commands

```bash
cd /opt/obrportal
BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > /opt/obrportal-backups/postgres/postgres-$BACKUP_TS.sql
ls -lh /opt/obrportal-backups/postgres/postgres-$BACKUP_TS.sql
```

## PostgreSQL restore commands

Restore only from a verified backup and only after stopping application traffic:

```bash
cd /opt/obrportal
docker compose stop backend frontend
cat /opt/obrportal-backups/postgres/postgres-YYYYMMDDTHHMMSSZ.sql | docker compose exec -T postgres psql -U "$POSTGRES_USER" "$POSTGRES_DB"
docker compose start backend frontend
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
```

## Object storage backup checklist

- Identify whether storage is MinIO volume, S3 bucket or provider-managed object storage.
- Back up generated documents and artifacts.
- Keep storage backup outside disposable container lifecycle.
- Verify at least one document artifact after restore.

## Environment backup commands

```bash
cd /opt/obrportal
BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)
cp .env /opt/obrportal-backups/env/env-$BACKUP_TS.backup
chmod 600 /opt/obrportal-backups/env/env-$BACKUP_TS.backup
```

## Deployment metadata commands

```bash
cd /opt/obrportal
BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)
git rev-parse HEAD > /opt/obrportal-backups/deployment/commit-$BACKUP_TS.txt
git describe --tags --always > /opt/obrportal-backups/deployment/version-$BACKUP_TS.txt
docker compose ps > /opt/obrportal-backups/deployment/compose-ps-$BACKUP_TS.txt
```

## Reverse proxy backup commands

```bash
BACKUP_TS=$(date -u +%Y%m%dT%H%M%SZ)
sudo cp -a /etc/nginx /opt/obrportal-backups/reverse-proxy/nginx-$BACKUP_TS || true
sudo cp -a /etc/caddy /opt/obrportal-backups/reverse-proxy/caddy-$BACKUP_TS || true
```

## Monitoring checklist

- Monitor backend health endpoint `/health`.
- Monitor readiness endpoint `/api/v1/ready`.
- Monitor frontend HTTPS availability.
- Monitor PostgreSQL container status.
- Monitor Redis container status.
- Monitor object storage availability.
- Monitor disk usage.
- Monitor certificate expiration.
- Monitor backend logs for errors.
- Monitor reverse proxy logs for 4xx/5xx spikes.

## Monitoring commands

```bash
cd /opt/obrportal
curl -fsS http://localhost:8000/health
curl -fsS http://localhost:8000/api/v1/ready
docker compose ps
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
df -h
```

## Maintenance checklist

- Review backups regularly.
- Test restore procedure on staging or production-like environment.
- Rotate temporary administrator credentials.
- Rotate production secrets according to security policy.
- Review logs after deployment.
- Review disk usage.
- Review certificate expiration.
- Keep Docker images and base OS updated according to maintenance window.
- Document all production changes.

## Incident response checklist

- Record incident timestamp.
- Check `/health`.
- Check `/api/v1/ready`.
- Check `docker compose ps`.
- Check backend logs.
- Check frontend logs.
- Check reverse proxy logs.
- Check disk usage.
- Check recent deployment commit.
- Decide whether rollback is required.
- Record resolution and follow-up actions.

## Rollback readiness checklist

- Previous commit SHA is recorded.
- Previous tag is recorded.
- PostgreSQL backup is available.
- Storage backup is available.
- `.env` backup is available.
- Reverse proxy config backup is available.
- Rollback commands are documented in `docs/production-server-checklist.md`.

## Acceptance criteria

- Backup directories exist.
- PostgreSQL backup command is documented.
- PostgreSQL restore command is documented.
- Environment backup command is documented.
- Deployment metadata command is documented.
- Reverse proxy backup command is documented.
- Health/readiness monitoring is documented.
- Incident response checklist is documented.
- Rollback readiness checklist is documented.

## Checklist diagnostics

Required diagnostic command:

- `python .\scripts\check_production_backup_monitoring_checklist.py`
