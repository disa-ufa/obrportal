# Stage 49 - Production server facts refresh audit

Status: draft
Branch: stage49-production-server-facts-refresh-audit
Baseline commit: ea26eb4
Base develop checkpoint: 48aead3
Previous stage: v0.1.0-stage48-production-deployment-dry-run-complete

## Summary

Stage 49 refreshes production server facts before any real production deployment stage is opened.

## Safety rule

This stage is facts-only. It does not execute a live production deployment and does not store secrets in git.

## Facts matrix

| Area | Status | Current fact | Follow-up |
| --- | --- | --- | --- |
| Repository | confirmed | https://github.com/disa-ufa/obrportal | Use develop or an explicit release tag for future deployment. |
| Current stable local checkpoint | confirmed | 48aead3 / v0.1.0-stage48-production-deployment-dry-run-complete | Use newer tag only after Stage 49 acceptance. |
| Local development path | confirmed | C:\root\obrportal | Local-only path, not production path. |
| Local Docker services | confirmed | backend, frontend, postgres, redis, minio | Keep service names aligned with docker compose. |
| Backend local port | confirmed | 8000 | Production exposure should go through reverse proxy. |
| Frontend local port | confirmed | 5173 | Production exposure should go through reverse proxy/static serving decision. |
| MinIO local ports | confirmed | 9000, 9001 | Production exposure must be restricted. |
| Postgres local port | confirmed | 5432 | Production exposure must not be public. |
| Redis local port | confirmed | 6379 | Production exposure must not be public. |
| Production server host | pending | not selected in this stage | Confirm hostname/IP before deployment stage. |
| Production project path | pending | placeholder /opt/obrportal | Confirm real server path before deployment. |
| Production domain | pending | not selected in this stage | Confirm domain and DNS target. |
| TLS/HTTPS | pending | not configured in this stage | Confirm certificate method, likely reverse proxy. |
| Reverse proxy | pending | decision required | Confirm nginx/caddy/traefik or platform proxy. |
| Production .env | pending | not committed by design | Create manually on server from .env.example. |
| Secrets | confirmed | must stay outside git | Use server-local .env or secret manager. |
| Backup location | pending | not selected in this stage | Confirm storage path and retention policy. |
| Rollback target | pending | previous known-good tag/commit | Select explicit rollback tag before real deployment. |
| Live deployment | not applicable | not executed in Stage 49 | Open separate deployment stage before production changes. |

## Confirmed local facts

- Local repository path: C:\root\obrportal.
- Current develop checkpoint before Stage 49: 48aead3.
- Current previous stable tag: v0.1.0-stage48-production-deployment-dry-run-complete.
- Local Docker Compose stack uses backend, frontend, postgres, redis and minio services.
- Local health endpoint target remains http://127.0.0.1:8000/health.
- Local readiness endpoint target remains http://127.0.0.1:8000/api/v1/ready.

## Pending production facts

- Production server host or IP.
- Production project directory.
- Production domain.
- Reverse proxy choice.
- TLS/certificate process.
- Production backup directory.
- Production backup retention policy.
- Production rollback target tag.
- Production .env values.

## Blockers for real production deployment

- Real server path is not confirmed.
- Real domain/DNS target is not confirmed.
- Production .env values are not confirmed.
- Backup storage and retention are not confirmed.
- Rollback target is not selected.

## Non-blocking notes

- These are blockers only for a real production deployment, not for this facts refresh stage.
- No application code changes are required.
- No live production deployment is executed.
