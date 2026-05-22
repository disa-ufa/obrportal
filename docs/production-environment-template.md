# Production environment template

## Purpose

This document describes the production environment variables and server-side configuration required for deploying ObrPortal after release `v0.1.0-stage6`.

The real production `.env` file must be created manually on the server and must never be committed to Git.

## Release baseline

- Release tag: `v0.1.0-stage6`
- Release commit: `ac6f339d40567a107dd19f02ec778fbeb5e19971`
- Main branch is kept on the published release.
- Stage 7 work continues in `develop`.

## Environment file location

Recommended server-side location:

- `/opt/obrportal/.env`

Alternative local deployment location:

- project root `.env`

The file must be readable only by the deployment user and must not be copied into public artifacts.

## Application settings

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `APP_NAME` | yes | `ObrPortal` | Application display/name marker. |
| `APP_ENV` | yes | `production` | Must not be `local` in production. |
| `APP_VERSION` | yes | `0.1.0-stage6` | Must match release baseline. |
| `SECRET_KEY` | yes | `<generate-strong-secret>` | Unique production secret, never reuse local/dev value. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | yes | `60` | Token lifetime policy. |

## Backend URLs and CORS

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `BACKEND_PUBLIC_URL` | yes | `https://api.example.org` | Public backend URL. |
| `FRONTEND_PUBLIC_URL` | yes | `https://example.org` | Public frontend URL. |
| `CORS_ORIGINS` | yes | `https://example.org` | Only production origins, comma-separated if needed. |

## PostgreSQL

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `POSTGRES_DB` | yes | `obrportal` | Production database name. |
| `POSTGRES_USER` | yes | `obrportal_user` | Production database user. |
| `POSTGRES_PASSWORD` | yes | `<strong-db-password>` | Strong secret, stored only in server `.env`. |
| `DATABASE_URL` | yes | `postgresql+asyncpg://obrportal_user:<password>@postgres:5432/obrportal` | Backend DB URL. |

## Redis

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `REDIS_URL` | yes | `redis://redis:6379/0` | Production Redis URL. |

## Object storage

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `S3_ENDPOINT_URL` | yes | `https://s3.example.org` | MinIO/S3 endpoint. |
| `S3_ACCESS_KEY` | yes | `<storage-access-key>` | Storage access key. |
| `S3_SECRET_KEY` | yes | `<storage-secret-key>` | Storage secret key. |
| `S3_BUCKET_NAME` | yes | `obrportal-documents` | Bucket for generated documents and artifacts. |
| `S3_REGION` | optional | `us-east-1` | Region value if required by provider. |

## Initial administrator

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `ADMIN_EMAIL` | yes for first seed | `admin@example.org` | Must be changed to the real production admin. |
| `ADMIN_PASSWORD` | yes for first seed | `<temporary-strong-password>` | Temporary value, rotate after first login. |
| `ADMIN_FULL_NAME` | optional | `System Administrator` | Display name for initial admin. |

## Organization seed placeholders

| Variable | Required | Example placeholder | Notes |
| --- | --- | --- | --- |
| `ORG_NAME` | optional | `<organization-name>` | Used only when running organization seed. |
| `ORG_INN` | optional | `<inn>` | Organization tax identifier placeholder. |
| `ORG_KPP` | optional | `<kpp>` | Organization KPP placeholder. |
| `ORG_ADDRESS` | optional | `<address>` | Organization address placeholder. |

## Reverse proxy requirements

- HTTPS must be enabled.
- HTTP must redirect to HTTPS.
- Frontend routes must fallback to `index.html`.
- Backend API must be proxied to the backend service.
- `/health` and `/api/v1/ready` must be reachable through the production domain.
- Request body size must allow document workflows if uploads are enabled.

## Files and permissions

- Production `.env` must not be committed.
- Backups must be stored outside disposable container lifecycle.
- PostgreSQL volume must be persistent.
- Object storage volume or bucket must be persistent.
- Reverse proxy config must be backed up before changes.

## Production environment acceptance checklist

- `.env` exists on the server.
- `.env` contains no local/demo secrets.
- `APP_ENV=production`.
- `APP_VERSION=0.1.0-stage6`.
- `SECRET_KEY` is production-specific.
- Database credentials are production-specific.
- Storage credentials are production-specific.
- CORS origins are restricted to production domains.
- HTTPS is configured.
- Persistent volumes are configured.
- Backup destination is configured.
