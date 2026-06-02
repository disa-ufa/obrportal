# Stage 41 — Admin incremental refresh final audit baseline

Status: planned
Base branch: develop
Base checkpoint: 4dac59b
Previous stage: v0.1.0-stage40-admin-rbac-audit-incremental-refresh-complete
Scope: final audit and cleanup for admin incremental refresh architecture

## Goal

Stage 41 performs a final audit of the admin incremental refresh architecture after stages 34-40 and prepares cleanup tasks if any full admin reload paths remain in section-level operations.

## Background

Stage 34 closed users-only incremental refresh.
Stage 35 closed organizations-only incremental refresh.
Stage 36 closed learning groups-only incremental refresh.
Stage 37 closed courses-only incremental refresh.
Stage 38 closed enrollments-only incremental refresh.
Stage 39 closed documents-only incremental refresh.
Stage 40 closed roles, permissions and audit incremental refresh.

Stage 41 is the final verification cycle for this admin refresh track.

## Target behavior

- Admin section-level refresh buttons use section-only refresh paths where available.
- Entity operations update only the affected collection or detail state where possible.
- Full admin reload remains available only as a fallback or dashboard/auth/bootstrap path.
- Existing admin shell state remains stable across section operations.
- Existing smoke, pytest and frontend build remain green.
- Architecture notes are updated if cleanup confirms the final refresh model.

## Audit focus

- Search for remaining onRefreshAdminData usages in section pages.
- Search for remaining direct loadAdminData usage outside bootstrap/dashboard/fallback paths.
- Verify App, AdminPageRenderer, useAdminDataLoader and entity action hooks are consistent.
- Verify users, organizations, groups, courses, enrollments, documents, roles, permissions and audit sections still pass guards.

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

- Final audit identifies no blocking full admin reload regressions.
- Any remaining full admin reload paths are intentional fallback/bootstrap/dashboard paths.
- Previous incremental refresh paths remain unaffected.
- Backend pytest passes.
- Frontend build passes.
- Smoke and guard scripts pass.
- No secrets are committed.
- Working tree is clean before final acceptance.
