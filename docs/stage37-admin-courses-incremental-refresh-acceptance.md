# Stage 37 — Admin courses incremental refresh acceptance

Status: accepted
Branch: stage37-admin-courses-only-refresh-path
Baseline commit: f508fcf
Feature commit: 6ab5603
Previous stage: v0.1.0-stage36-admin-groups-incremental-refresh-complete
Scope: admin courses incremental refresh without full admin reload

## Goal

Stage 37 validates that the admin courses area can refresh course-related data after operations without forcing a full admin shell reload.

## Implemented behavior

- Added a courses-only refresh path in useAdminDataLoader.
- Added course filter normalization for courses-only refresh.
- Added course sorting helper to admin state utilities.
- Passed refreshAdminCourses from App to AdminPageRenderer.
- Passed onRefreshCourses into AdminCoursesPage.
- Course create, update, activate, deactivate and delete now use the courses fast path.
- Course module and lesson operations also refresh through the courses fast path so the local course structure stays current.
- Existing users, organizations and groups incremental refresh paths remain intact.
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

Local Windows npm build was not used as acceptance evidence because local frontend node_modules are not installed; the containerized frontend build is the accepted build gate.

## Decision

Stage 37 is accepted.

Next planned cycle:

```text
Stage 38 — admin enrollments incremental refresh cycle
```
