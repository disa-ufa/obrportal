# Stage 40 — Admin RBAC and audit incremental refresh acceptance

Status: accepted
Branch: stage40-admin-rbac-audit-only-refresh-path
Baseline commit: 163082e
Feature commit: b6afc08
Previous stage: v0.1.0-stage39-admin-documents-incremental-refresh-complete
Scope: admin roles, permissions and audit incremental refresh without full admin reload

## Goal

Stage 40 validates that the remaining admin RBAC and audit areas can refresh role, permission and audit-related data without forcing a full admin shell reload.

## Implemented behavior

- Added roles-only refresh path in useAdminDataLoader.
- Added permissions-only refresh path in useAdminDataLoader.
- Added audit-events-only refresh path in useAdminDataLoader.
- Added sorting helpers for permissions and audit events.
- Full admin data load now normalizes roles, permissions and audit events through shared sort helpers.
- Roles page toolbar now uses roles-only refresh where available.
- Permissions page toolbar now uses permissions-only refresh where available.
- Audit page filter application now uses audit-events-only refresh where available.
- Role permission assign/remove now keeps the roles collection in sync, not only the selected role detail.
- Existing users, organizations, groups, courses, enrollments and documents incremental refresh paths remain intact.
- No backend schema or production-only files were changed.
- No secrets were committed.

## Local acceptance evidence

The following checks were completed successfully on 2026-06-02:

```text
python .\scripts\secret_scan.py
python .\scripts\smoke_frontend_api_client.py
python .\scripts\frontend_guard.py
python .\scripts\smoke_frontend_admin_pages.py
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
git status --short
```

Accepted results:

```text
Secret scan passed. No obvious secrets found.
Frontend API client behavior smoke passed.
Frontend guard passed. No forbidden frontend patterns found.
Frontend admin pages behavior smoke passed.
Frontend production build completed successfully.
Backend pytest: 215 passed, 4 warnings.
Git working tree clean after feature commit.
```

## Non-blocking notes

The frontend production build still reports the known Vite/Rolldown chunk-size warning for the main index bundle. This remains accepted as non-blocking and should be addressed later as a frontend optimization task.

## Decision

Stage 40 is accepted.

Next planned cycle:

```text
Stage 41 — admin incremental refresh final audit and cleanup cycle
```
