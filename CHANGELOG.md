# Changelog

Все значимые изменения проекта фиксируются в этом файле.

Формат ведения: версия, дата подготовки, краткое описание изменений, качество, инструкции релиза и rollback.

---

## 0.1.0-stage6

Дата подготовки: текущий stage-6 checkpoint.

### Added

- DevOps foundation: Docker Compose, PostgreSQL, Redis, MinIO, backend, frontend.
- Backend FastAPI foundation with health, readiness, auth, RBAC, admin API, public API and document workflows.
- Frontend public portal, admin panel, account area, course catalog, document verification and operational dashboard.
- CI/local gate diagnostics, production readiness diagnostics and release readiness guard.
- Smoke coverage for admin, public, account, frontend core, frontend routes and document workflows.

### Quality gate

- Secret scan.
- Text encoding and source BOM guards.
- Frontend API error guard, mojibake guard and forbidden pattern guard.
- CI/local gate guard.
- Release readiness guard.
- Backend pytest.
- Smoke scripts.
- Frontend smoke/backend coverage guards.
- Frontend production build.
- Bundle encoding guard.

### Deployment handoff

- Update `develop`.
- Run the full local gate.
- Fast-forward merge `develop` to `main`.
- Push `main`.
- Create an annotated release tag after green CI.
- Verify `/health`, `/api/v1/ready`, public pages, account, admin panel and document verification.

### Rollback

- Keep the previous tag and commit SHA before deployment.
- Restore the previous application revision.
- Re-run migrations only according to the release notes.
- Keep persistent volumes and database backups outside disposable container lifecycle.
