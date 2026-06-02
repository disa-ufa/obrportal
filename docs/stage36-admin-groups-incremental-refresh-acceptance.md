# Stage 36 — Admin groups incremental refresh acceptance

Status: accepted
Branch: develop
Feature commit: d9c8248
Scope: admin groups incremental refresh without full admin reload

## Goal

Stage 36 validates that the admin learning groups area can refresh its own data after group-related operations without forcing a full admin shell reload.

## Implemented behavior

- Admin groups can be refreshed through the groups-only refresh path.
- Admin shell remains stable during group operations.
- Admin users incremental refresh from Stage 34 remains intact.
- Admin organizations incremental refresh from Stage 35 remains intact.
- Existing admin routes, filters, RBAC checks, learning group members, grouped enrollments, documents, courses and audit flows remain green.
- No production or server-only files were changed.
- No secrets were committed.

## Local acceptance evidence

The following local checks were completed successfully on 2026-06-02:

```text
.\scripts\local_bootstrap.ps1 -NoBuild -WithDemoLearning
.\scripts\local_bootstrap.ps1 -WithDemoLearning
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
docker compose exec frontend npm run build
git status --short
```

Accepted results:

```text
Local bootstrap completed successfully.
Smoke auth/RBAC/admin/org API passed.
Frontend smoke/check coverage guard passed.
Backend pytest/smoke/check coverage guard passed.
No TODO/stub/not-implemented markers guard passed.
215 passed, 4 warnings.
Frontend build completed successfully.
Git working tree clean.
```

## Non-blocking notes

The frontend production build still reports a Vite/Rolldown chunk-size warning for the main index bundle. This is accepted as non-blocking for Stage 36 and should be handled later as a frontend optimization task.

## Decision

Stage 36 is accepted.

Next planned cycle:

```text
Stage 37 — next admin area incremental refresh cycle
```
