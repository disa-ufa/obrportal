# Stage 38 — Admin enrollments incremental refresh baseline

Status: planned
Base branch: develop
Base checkpoint: 1e18039
Previous stage: v0.1.0-stage37-admin-courses-incremental-refresh-complete
Scope: admin enrollments incremental refresh without full admin reload

## Goal

Stage 38 prepares the admin enrollments area for incremental refresh after enrollment-related operations without forcing a full admin shell reload.

## Background

Stage 34 closed users-only incremental refresh.
Stage 35 closed organizations-only incremental refresh.
Stage 36 closed learning groups-only incremental refresh.
Stage 37 closed courses-only incremental refresh.

Stage 38 continues the same pattern for admin enrollments.

## Target behavior

- Enrollment create refreshes the enrollments collection only.
- Enrollment update/status changes refresh affected enrollments data without full admin reload.
- Bulk grouped enrollment operations refresh enrollments data only.
- Existing admin shell state remains stable.
- Existing users, organizations, groups and courses incremental refresh behavior remains intact.
- Existing enrollments filters and enrollment operations remain intact.
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

- Admin enrollments can be refreshed through an enrollments-only refresh path.
- Admin shell does not perform a full reload after enrollment operations.
- Users, organizations, groups and courses incremental refresh paths remain unaffected.
- Backend pytest passes.
- Frontend build passes.
- Smoke and guard scripts pass.
- No secrets are committed.
- Working tree is clean before final acceptance.
