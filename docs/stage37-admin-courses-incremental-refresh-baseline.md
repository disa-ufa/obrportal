# Stage 37 — Admin courses incremental refresh baseline

Status: planned
Base branch: develop
Base checkpoint: f9adc14
Previous stage: v0.1.0-stage36-admin-groups-incremental-refresh-complete
Scope: admin courses incremental refresh without full admin reload

## Goal

Stage 37 prepares the admin courses area for incremental refresh after course-related operations without forcing a full admin shell reload.

## Background

Stage 34 closed users-only incremental refresh.
Stage 35 closed organizations-only incremental refresh.
Stage 36 closed learning groups-only incremental refresh.

Stage 37 continues the same pattern for admin courses.

## Target behavior

- Course create refreshes the courses collection only.
- Course update refreshes the affected course data without full admin reload.
- Course activate/deactivate refreshes courses data only.
- Course delete refreshes courses data only.
- Existing admin shell state remains stable.
- Existing users, organizations and groups incremental refresh behavior remains intact.
- Existing courses filters and course detail behavior remain intact.
- Existing smoke, pytest and frontend build remain green.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\smoke_frontend_api_client.py
python .\scripts\frontend_guard.py
python .\scripts\smoke_frontend_admin_pages.py
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
docker compose exec frontend npm run build
git status --short
```

## Acceptance criteria

- Admin courses can be refreshed through a courses-only refresh path.
- Admin shell does not perform a full reload after course operations.
- Users, organizations and groups incremental refresh paths remain unaffected.
- Backend pytest passes.
- Frontend build passes.
- Smoke and guard scripts pass.
- No secrets are committed.
- Working tree is clean before final acceptance.
