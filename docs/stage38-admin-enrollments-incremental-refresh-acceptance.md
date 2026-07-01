# Stage 38 — Admin enrollments incremental refresh acceptance

Status: accepted
Branch: stage38-admin-enrollments-only-refresh-path
Baseline commit: 85b51f0
Feature commit: 8ca247c
Previous stage: v0.1.0-stage37-admin-courses-incremental-refresh-complete
Scope: admin enrollments incremental refresh without full admin reload

## Goal

Stage 38 validates that the admin enrollments area can refresh enrollment-related data after operations without forcing a full admin shell reload.

## Implemented behavior

- Added an enrollments-only refresh path in useAdminDataLoader.
- Added enrollment filter normalization for enrollments-only refresh.
- Added enrollment sorting helper to admin state utilities.
- Passed refreshAdminEnrollments from App to AdminPageRenderer.
- Passed onRefreshEnrollments into AdminEnrollmentsPage.
- Enrollment create, update, complete and delete now use the enrollments fast path.
- Same-route enrollment filter refresh uses the enrollments fast path.
- Existing users, organizations, groups and courses incremental refresh paths remain intact.
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

The frontend production build may still report the known Vite/Rolldown chunk-size warning for the main index bundle. This remains accepted as non-blocking and should be addressed later as a frontend optimization task.

## Decision

Stage 38 is accepted.

Next planned cycle:

```text
Stage 39 — admin documents incremental refresh cycle
```
