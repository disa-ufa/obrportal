# Stage 40 — Admin RBAC and audit incremental refresh baseline

Status: planned
Base branch: develop
Base checkpoint: 83cacb6
Previous stage: v0.1.0-stage39-admin-documents-incremental-refresh-complete
Scope: admin roles, permissions and audit incremental refresh without full admin reload

## Goal

Stage 40 prepares the remaining admin RBAC and audit areas for incremental refresh after role, permission and audit-related operations without forcing a full admin shell reload.

## Background

Stage 34 closed users-only incremental refresh.
Stage 35 closed organizations-only incremental refresh.
Stage 36 closed learning groups-only incremental refresh.
Stage 37 closed courses-only incremental refresh.
Stage 38 closed enrollments-only incremental refresh.
Stage 39 closed documents-only incremental refresh.

Stage 40 continues the same pattern for the remaining admin roles, permissions and audit sections.

## Target behavior

- Role create/update/delete refreshes roles data only.
- Role permission assign/remove refreshes roles and permissions-related data without full admin reload.
- Permission-related admin views refresh permissions data only where applicable.
- Audit filters and audit details remain stable without forcing a full admin shell reload.
- Existing users, organizations, groups, courses, enrollments and documents incremental refresh behavior remains intact.
- Existing smoke, pytest and frontend build remain green.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\smoke_frontend_api_client.py
python .\scripts\frontend_guard.py
python .\scripts\smoke_frontend_admin_pages.py
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
git status --short
```

## Acceptance criteria

- Admin roles can be refreshed through a roles-only refresh path.
- Admin permissions can be refreshed through a permissions-only refresh path where applicable.
- Admin audit data can be refreshed through an audit-only refresh path where applicable.
- Admin shell does not perform a full reload after RBAC/audit operations.
- Previous incremental refresh paths remain unaffected.
- Backend pytest passes.
- Frontend build passes.
- Smoke and guard scripts pass.
- No secrets are committed.
- Working tree is clean before final acceptance.
