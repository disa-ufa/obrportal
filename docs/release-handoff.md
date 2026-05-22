# Release handoff

## Release version

Current release line: 0.1.0-stage6.

Version sources:

- backend/app/main.py
- frontend/package.json
- /health
- CHANGELOG.md

## Pre-release checklist

Run before release:

- git status --short
- git branch -vv
- git log --oneline --decorate -5
- python .\scripts\secret_scan.py
- python .\scripts\check_text_encoding.py
- python .\scripts\check_source_bom.py
- python .\scripts\check_frontend_api_errors.py
- python .\scripts\check_frontend_mojibake.py
- python .\scripts\frontend_guard.py
- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_release_versioning.py
- docker compose exec backend pytest app/tests -q
- python .\scripts\smoke_auth_rbac.py
- python .\scripts\smoke_document_generation_flow.py
- python .\scripts\smoke_documents_page.py
- python .\scripts\smoke_admin_components.py
- python .\scripts\smoke_frontend_admin_pages.py
- python .\scripts\smoke_public_pages.py
- python .\scripts\smoke_account_page.py
- python .\scripts\smoke_frontend_hooks_layout.py
- python .\scripts\smoke_frontend_utils_routes.py
- python .\scripts\smoke_frontend_core.py
- python .\scripts\check_frontend_smoke_coverage.py
- python .\scripts\check_backend_smoke_coverage.py
- python .\scripts\check_no_todo_markers.py
- docker compose exec frontend npm run build
- python .\scripts\check_frontend_bundle_encoding.py

## Deployment order

- git switch develop
- git pull --ff-only origin develop
- git switch main
- git pull --ff-only origin main
- git merge --ff-only develop
- git push origin main
- git switch develop

## Release tag order

- git switch main
- git pull --ff-only origin main
- git tag -a v0.1.0-stage6 -m "Release v0.1.0-stage6"
- git push origin v0.1.0-stage6
- git switch develop

## Post-release verification

- /health returns version 0.1.0-stage6.
- /api/v1/ready returns ready status for database, redis and storage.
- Public home page opens.
- Public catalog opens.
- Public document verification opens.
- Account page opens.
- Admin panel opens.
- Document generation and verification smoke passes.
- CI workflow is green for the release commit.

## Rollback order

- git switch main
- git fetch --tags origin
- git checkout v0.1.0-stage6

For production infrastructure, keep database backups and persistent volumes outside disposable container lifecycle.
