# Stage 43 - Frontend route smoke hardening baseline

Status: planned
Base branch: develop
Base checkpoint: 502c31e
Previous stage: v0.1.0-stage42-frontend-bundle-optimization-complete
Scope: frontend route smoke hardening after lazy route code splitting

## Goal

Stage 43 strengthens frontend route smoke coverage after Stage 42 route-level lazy imports and bundle optimization.

## Background

Stage 42 reduced the main frontend index bundle by converting admin and public route rendering to lazy route chunks.

The production build is green and the previous main chunk-size warning is removed.

Stage 43 verifies that direct public/admin URLs, redirects, fallbacks and lazy route chunks remain covered by smoke checks.

## Target behavior

- Public direct routes remain covered by smoke scripts.
- Admin direct routes remain covered by smoke scripts.
- Public fallback route remains covered.
- Admin fallback route remains covered.
- Auth redirect behavior remains covered.
- Lazy route loading does not reduce route smoke confidence.
- Frontend build remains green.
- Backend pytest remains green.

## Audit focus

- Inspect existing frontend route smoke scripts.
- Identify public/admin routes that are not explicitly covered after lazy loading.
- Add or document route smoke coverage without changing backend API contracts.
- Keep existing admin incremental refresh behavior unchanged.

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

- Route smoke coverage audit is documented.
- Any route smoke script changes keep all frontend guards green.
- Lazy route chunks remain compatible with direct URL smoke checks.
- Frontend build passes.
- Backend pytest passes.
- No secrets are committed.
- Working tree is clean before final acceptance.
