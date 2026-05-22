# Production deployment plan

## Release baseline

Release tag: `v0.1.0-stage6`.

Release commit:

`ac6f339d40567a107dd19f02ec778fbeb5e19971`

GitHub Release:

`https://github.com/disa-ufa/obrportal/releases/tag/v0.1.0-stage6`

This deployment plan starts after the published Stage 6 release and prepares production deployment without changing the release tag.

## Deployment goals

- Deploy the released application version to a production-like server.
- Keep secrets outside Git.
- Preserve database and storage data.
- Run migrations safely.
- Verify backend, frontend, documents, auth, admin panel and public pages after deployment.
- Keep a clear rollback path.

## Required production services

- Backend: FastAPI application.
- Frontend: React/Vite production build served behind a web server or reverse proxy.
- PostgreSQL database.
- Redis.
- MinIO or compatible object storage.
- Reverse proxy with HTTPS.
- Backup location for database dumps and persistent volumes.

## Required environment checks

- Production `.env` is created on the server and is not committed to Git.
- `SECRET_KEY` is unique for production.
- Admin seed credentials are changed after first login.
- Database credentials are production-specific.
- Redis URL points to production Redis.
- Storage credentials are production-specific.
- Public frontend URL and backend API URL are configured for the production domain.
- CORS settings allow only expected production origins.

## Pre-deployment local gate

Run before preparing production deployment:

- `python .\scripts\secret_scan.py`
- `python .\scripts\check_text_encoding.py`
- `python .\scripts\check_source_bom.py`
- `python .\scripts\check_frontend_api_errors.py`
- `python .\scripts\check_frontend_mojibake.py`
- `python .\scripts\frontend_guard.py`
- `python .\scripts\check_ci_local_gate.py`
- `python .\scripts\check_release_readiness.py`
- `python .\scripts\check_release_versioning.py`
- `python .\scripts\check_release_candidate.py`
- `python .\scripts\check_release_tag.py`
- `python .\scripts\check_production_deployment_plan.py`
- `docker compose exec backend pytest app/tests -q`
- `python .\scripts\smoke_auth_rbac.py`
- `python .\scripts\smoke_document_generation_flow.py`
- `python .\scripts\smoke_documents_page.py`
- `python .\scripts\smoke_admin_components.py`
- `python .\scripts\smoke_frontend_admin_pages.py`
- `python .\scripts\smoke_public_pages.py`
- `python .\scripts\smoke_account_page.py`
- `python .\scripts\smoke_frontend_hooks_layout.py`
- `python .\scripts\smoke_frontend_utils_routes.py`
- `python .\scripts\smoke_frontend_core.py`
- `python .\scripts\check_frontend_smoke_coverage.py`
- `python .\scripts\check_backend_smoke_coverage.py`
- `python .\scripts\check_no_todo_markers.py`
- `docker compose exec frontend npm run build`
- `python .\scripts\check_frontend_bundle_encoding.py`

## Server preparation order

- Create a dedicated application directory.
- Clone the repository.
- Checkout the release tag `v0.1.0-stage6` for production deployment.
- Create production `.env` from `.env.example` manually.
- Configure domain, HTTPS and reverse proxy.
- Configure persistent volumes for PostgreSQL, Redis and object storage.
- Configure backup destination.

## Backup order before deployment

- Save current production commit SHA or tag.
- Export PostgreSQL database dump.
- Save storage bucket data or volume snapshot.
- Save current production `.env` securely.
- Save reverse proxy configuration.
- Record the timestamp and backup location.

## Deployment order

- Pull repository updates.
- Checkout `v0.1.0-stage6`.
- Build backend and frontend containers.
- Start database, Redis and storage services.
- Run database migrations.
- Start backend and frontend services.
- Verify `/health`.
- Verify `/api/v1/ready`.
- Run post-deployment smoke checks.

## Post-deployment smoke

- `/health` returns status `ok` and version `0.1.0-stage6`.
- `/api/v1/ready` returns ready status for database, Redis and storage.
- Public home page opens.
- Public catalog opens.
- Public document verification opens.
- Login page opens.
- Account page opens after authentication.
- Admin panel opens for admin user.
- Documents registry opens for admin user.
- Document generation flow works.
- Public document verification works by number and code.

## Rollback order

- Stop application services.
- Restore previous application revision or previous tag.
- Restore database from the last valid backup if schema/data changes require it.
- Restore storage data if document artifacts changed incorrectly.
- Start services.
- Verify `/health` and `/api/v1/ready`.
- Verify auth, admin panel, public pages and document verification.
- Record rollback result.

## Production acceptance criteria

- Production services are running.
- HTTPS endpoint is reachable.
- Backend health and readiness are green.
- Frontend production build is served correctly.
- Authentication works.
- Admin panel works.
- Public catalog works.
- Document generation works.
- Public verification works.
- Rollback path is documented and tested on a staging or production-like environment.
