# Stage 39 — Admin documents incremental refresh baseline

Status: planned
Base branch: develop
Base checkpoint: bcd7a36
Previous stage: v0.1.0-stage38-admin-enrollments-incremental-refresh-complete
Scope: admin documents incremental refresh without full admin reload

## Goal

Stage 39 prepares the admin documents area for incremental refresh after document-related operations without forcing a full admin shell reload.

## Background

Stage 34 closed users-only incremental refresh.
Stage 35 closed organizations-only incremental refresh.
Stage 36 closed learning groups-only incremental refresh.
Stage 37 closed courses-only incremental refresh.
Stage 38 closed enrollments-only incremental refresh.

Stage 39 continues the same pattern for admin documents.

## Target behavior

- Document publish/revoke/restore/delete operations refresh the documents collection only.
- Document generation/regeneration operations refresh affected documents data without full admin reload.
- Existing admin shell state remains stable.
- Existing users, organizations, groups, courses and enrollments incremental refresh behavior remains intact.
- Existing documents filters and document registry behavior remain intact.
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

- Admin documents can be refreshed through a documents-only refresh path.
- Admin shell does not perform a full reload after document operations.
- Users, organizations, groups, courses and enrollments incremental refresh paths remain unaffected.
- Backend pytest passes.
- Frontend build passes.
- Smoke and guard scripts pass.
- No secrets are committed.
- Working tree is clean before final acceptance.
