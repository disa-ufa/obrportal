# Stage 42 — Frontend bundle optimization baseline

Status: planned
Base branch: develop
Base checkpoint: 3f7e01a
Previous stage: v0.1.0-stage41-admin-incremental-refresh-final-audit-complete
Scope: frontend production bundle optimization and admin shell code splitting

## Goal

Stage 42 prepares frontend bundle optimization after the admin incremental refresh cycle.

## Background

Stages 34-41 closed the admin incremental refresh architecture.

Frontend production build remains green, but Vite/Rolldown reports a non-blocking chunk-size warning for the main index bundle.

Stage 42 focuses on reducing the main frontend bundle without changing backend behavior or admin data flow semantics.

## Target behavior

- Frontend production build remains green.
- Backend pytest remains green.
- Existing smoke and guard scripts remain green.
- Public routes remain available.
- Admin routes remain available.
- Admin shell navigation remains stable.
- Main bundle size warning is reduced or documented with an accepted follow-up plan.

## Audit focus

- Identify large frontend imports included in the main app bundle.
- Evaluate route-level dynamic imports for public/admin pages.
- Keep existing smoke coverage intact.
- Avoid changing backend schema or API contracts.
- Avoid changing production-only files.

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

- Bundle optimization audit is documented.
- Any implemented code splitting keeps frontend build green.
- Existing admin incremental refresh behavior remains unaffected.
- Backend pytest passes.
- No secrets are committed.
- Working tree is clean before final acceptance.
