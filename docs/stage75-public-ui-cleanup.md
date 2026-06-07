# Stage 75.1 - Public UI technical labels cleanup

## Status

stage75_1_status=implementation_ready
stage75_1_release_manifest_required=yes
stage75_1_public_ui_cleanup_guard_required=yes

## Base checkpoint

Stage 75 is deployed on production at `e0049ab`.

Production evidence from the previous deploy:

- `obrportal-frontend` is healthy.
- `/`, `/contacts`, `/faq`, `/privacy`, `/offer`, `/organization-info` return HTTP 200.
- Backend `/health` is OK.
- Backend `/api/v1/ready` reports database, Redis and storage as OK.
- Backend, database and migrations were not changed during Stage 75 deploy.

## Goal

Remove development-stage labels and remaining legal-page naming inconsistencies from the visible UI.

## Scope

Frontend-only changes:

- `frontend/src/components/layout/PublicShell.jsx`
- `frontend/src/components/layout/AppShell.jsx`
- `frontend/src/utils/publicRoutes.js`
- `docs/release-manifest.json`
- `scripts/check_release_manifest.py`
- `scripts/check_stage75_public_ui_cleanup.py`

## Changes

- Public shell label changes from `ObrPortal · Stage 7` to `ГБОУ РЦДО`.
- Public shell subtitle changes from `Публичный контур` to `Образовательный портал`.
- Footer link changes from `Оферта` to `Условия использования`.
- Admin shell label changes from `ObrPortal · Stage 6` to `Административный контур`.
- `/offer` meta title changes from commercial-offer wording to `Условия использования портала — ObrPortal`.
- `/offer` meta description changes to neutral portal usage terms.
- Stage 75.1 guard prevents the removed public technical labels from returning.

## Safety

- Backend is not changed.
- Database is not changed.
- Migrations are not added.
- Auth/RBAC is not changed.
- Production config is not changed.
- No secrets are touched.

## Required checks

```powershell
python .\scripts\check_release_manifest.py
python .\scripts\check_stage75_public_ui_cleanup.py
python .\scripts\check_stage75_public_content_polish.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\check_no_todo_markers.py
python .\scripts\smoke_public_pages.py
docker compose exec frontend npm run build
git diff --check
```

## Deploy type

Frontend-only deploy after merge to `develop`.
