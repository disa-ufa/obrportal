# Stage 43 - Frontend route smoke hardening audit

Status: draft
Branch: stage43-frontend-route-smoke-hardening-audit
Baseline commit: 0e01c1b
Previous stage: v0.1.0-stage42-frontend-bundle-optimization-complete

## Goal

This document audits frontend route smoke coverage after Stage 42 route-level lazy imports.

## Summary

- Stage 42 introduced lazy route chunks for public and admin routes.
- Stage 43 checks that direct URLs, fallbacks, redirects and route registries remain visible to smoke scripts.
- This audit focuses on existing route smoke scripts and route source files.

## Pattern scan

| File | Line | Pattern | Result |
| --- | ---: | --- | --- |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin` | `count=31` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/users` | `count=2` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/organizations` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/groups` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/courses` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/enrollments` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/documents` | `count=6` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/admin/audit-events` | `count=4` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/` | `count=282` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/catalog` | `count=6` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/courses/` | `count=2` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/organization-info` | `count=5` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/organization` | `count=7` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/verify/` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/verify-document` | `count=8` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/contacts` | `count=2` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/login` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/register` | `count=1` |
| `scripts/smoke_frontend_admin_pages.py` | - | `/account` | `count=7` |
| `scripts/smoke_frontend_routes.py` | - | `missing` | `file not found` |
| `scripts/smoke_frontend_hooks_layout.py` | - | `/admin` | `count=8` |
| `scripts/smoke_frontend_hooks_layout.py` | - | `/` | `count=132` |
| `scripts/smoke_frontend_hooks_layout.py` | - | `/courses/` | `count=1` |
| `scripts/smoke_frontend_hooks_layout.py` | - | `/organization` | `count=1` |
| `scripts/smoke_frontend_hooks_layout.py` | - | `/login` | `count=1` |
| `scripts/smoke_frontend_hooks_layout.py` | - | `/account` | `count=1` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin` | `count=43` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/users` | `count=9` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/organizations` | `count=5` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/courses` | `count=7` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/enrollments` | `count=6` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/documents` | `count=4` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/roles` | `count=7` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/permissions` | `count=2` |
| `scripts/smoke_frontend_api_client.py` | - | `/admin/audit-events` | `count=2` |
| `scripts/smoke_frontend_api_client.py` | - | `/` | `count=366` |
| `scripts/smoke_frontend_api_client.py` | - | `/courses/` | `count=9` |
| `scripts/smoke_frontend_api_client.py` | - | `/organization` | `count=5` |
| `scripts/smoke_frontend_api_client.py` | - | `/register` | `count=1` |
| `scripts/smoke_frontend_api_client.py` | - | `/account` | `count=6` |
| `scripts/frontend_guard.py` | - | `/` | `count=7` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/admin` | `count=2` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/` | `count=92` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/catalog` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/courses/` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/organization-info` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/organization` | `count=3` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/verify/` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/verify-document` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/contacts` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/faq` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/privacy` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/offer` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/login` | `count=3` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/register` | `count=1` |
| `frontend/src/routes/PublicRoutes.jsx` | - | `/account` | `count=2` |
| `frontend/src/routes/AdminPageRenderer.jsx` | - | `/admin` | `count=1` |
| `frontend/src/routes/AdminPageRenderer.jsx` | - | `/` | `count=35` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin` | `count=13` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/users` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/organizations` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/groups` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/courses` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/enrollments` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/documents` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/roles` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/permissions` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/admin/audit-events` | `count=1` |
| `frontend/src/utils/adminRoutes.js` | - | `/` | `count=23` |
| `frontend/src/utils/adminRoutes.js` | - | `/organization` | `count=1` |

## Initial decision

- If all direct public/admin routes are already covered, Stage 43 can close as route smoke audit hardening.
- If missing direct routes are found, add explicit smoke assertions without changing backend API contracts.

