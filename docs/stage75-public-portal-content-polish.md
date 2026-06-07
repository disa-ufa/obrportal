# Stage 75 - Public portal official content polish

Status: implementation ready
Project: ObrPortal
Process: development-process-v2
Base production checkpoint: Stage 74 deployed on `develop` at `865aaa8`

## 1. Goal

Stage 75 packages visitor-facing content improvements into one product stage.

The goal is to make the public portal look consistent and official across the main public routes while keeping backend, database, auth and RBAC unchanged.

## 2. Implemented scope

Frontend public pages updated:

- `/` - home page wording aligned with ГБОУ РЦДО context;
- `/contacts` - official contact page with phone, e-mail, address and support scenarios;
- `/organization-info` - Stage 74 page polished to use stable official wording;
- `/faq` - public FAQ rewritten for the actual portal workflows;
- `/privacy` - privacy page rewritten with operator information and user rights;
- `/offer` - page reframed as portal usage terms instead of an unverified commercial offer.

Documentation and guards updated:

- `docs/release-manifest.json` records Stage 75 implementation-ready state;
- `scripts/check_release_manifest.py` accepts Stage 75 implementation state;
- `scripts/check_stage75_public_content_polish.py` validates public content markers and blocks obsolete placeholder fragments.

## 3. Content rules

Stage 75 keeps these public content rules:

- use official ГБОУ РЦДО context;
- keep contacts consistent with Stage 73;
- keep organization information consistent with Stage 74;
- do not publish unverified license numbers or document details;
- do not expose internal implementation details on public pages;
- do not use demo contact placeholders.

## 4. Out of scope

Stage 75 does not include:

- backend API contract changes;
- database schema changes;
- migrations;
- RBAC changes;
- authentication changes;
- document upload workflow changes;
- publishing unverified legal document numbers;
- production secret changes;
- Caddy or Nginx configuration changes.

## 5. Local acceptance

```powershell
python .\scripts\check_release_manifest.py
python .\scripts\check_stage75_public_content_polish.py
python .\scripts\check_stage74_organization_info_public_page.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\check_no_todo_markers.py
python .\scripts\smoke_public_pages.py
docker compose exec frontend npm run build
git diff --check
```

## 6. Production acceptance for frontend-only deployment

```bash
git rev-parse --short HEAD
docker compose ps frontend
curl -sS http://127.0.0.1:8000/health
curl -sS http://127.0.0.1:8000/api/v1/ready
curl -I https://portal.rcdo02.ru/
curl -I https://portal.rcdo02.ru/contacts
curl -I https://portal.rcdo02.ru/organization-info
curl -I https://portal.rcdo02.ru/faq
curl -I https://portal.rcdo02.ru/privacy
curl -I https://portal.rcdo02.ru/offer
```

## 7. Safety notes

Stage 75 is frontend-only if the implementation touches only public page source files, docs and guard scripts.

Safety markers:

```text
stage75_status=implementation_ready
stage75_expected_deployment_type=frontend-only
stage75_backend_runtime_changed=no
stage75_database_migration_expected=no
stage75_public_routes_smoke_required=yes
stage75_release_manifest_required=yes
stage75_public_content_guard_required=yes
```
