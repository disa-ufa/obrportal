# Stage 75 - Public portal official content polish

Status: planned
Project: ObrPortal
Process: development-process-v2
Base production checkpoint: Stage 74 deployed on `develop` at `865aaa8`

## 1. Goal

Stage 75 packages public portal content improvements into one product stage instead of many micro-stages.

The goal is to make the public portal look consistent and official across the visitor-facing routes while keeping backend, database, auth and RBAC unchanged unless a separate checkpoint explicitly changes that boundary.

## 2. Scope

Candidate public routes:

- `/`;
- `/catalog`;
- `/contacts`;
- `/organization-info`;
- `/faq`;
- `/privacy`;
- `/offer`;
- `/verify-document`;
- `/verify/:code`.

Content areas:

- remove remaining internal demo wording from public pages;
- align public text with ГБОУ РЦДО context;
- keep official contacts consistent;
- keep organization information consistent with Stage 74;
- prepare a safe public documents area without publishing unverified document numbers;
- improve navigation between public pages;
- improve empty and explanatory states on public pages;
- verify public bundle does not contain obsolete local placeholder contacts.

## 3. Out of scope

Stage 75 does not include:

- backend API contract changes;
- database schema changes;
- migrations;
- RBAC changes;
- authentication changes;
- document upload workflow changes;
- publishing legal document numbers without verified source files;
- production secret changes;
- Caddy or Nginx configuration changes.

## 4. Acceptance criteria

Local acceptance:

```powershell
python .\scripts\check_release_manifest.py
python .\scripts\check_stage74_organization_info_public_page.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\check_no_todo_markers.py
python .\scripts\smoke_public_pages.py
docker compose exec frontend npm run build
```

Production acceptance for frontend-only deployment:

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

## 5. Safety notes

Stage 75 may be deployed as frontend-only if the implementation touches only frontend public page source files and documentation.

If backend or database files change, Stage 75 must be split or upgraded to a backend/API stage with explicit approval.

## 6. Current planned state

```text
stage75_status=planned
stage75_expected_deployment_type=frontend-only
stage75_backend_runtime_changed=no
stage75_database_migration_expected=no
stage75_public_routes_smoke_required=yes
stage75_release_manifest_required=yes
```
