# Stage 33 - Admin users frontend fast-path baseline

## 1. Baseline purpose - 2026-05-31

Goal: prepare frontend integration with the optimized Stage 32 `/api/v1/admin/users` backend fast path.

Stage 32 backend outcome:
- `/api/v1/admin/users` N+1 role loading bottleneck was removed;
- roles are batch-loaded through `get_users_roles`;
- backend supports SQL-level `limit`, `q`, `is_active`, and `role` filters;
- Stage 32 final acceptance is tagged as `v0.1.0-stage32-performance-stability-complete`;
- `develop` is green at Stage 32 final acceptance.

Current frontend observation:
- `getAdminUsers()` still calls unbounded `/api/v1/admin/users`;
- `useAdminDataLoader` still loads users through `getAdminUsers()` without filters;
- `UsersPage` still applies search/activity/role filtering in browser memory;
- URL state already contains user filter values: `q`, `activity`, `role_id`;
- role select currently stores role id, while backend role filter expects role code.

Stage 33 target:
- add query support to `getAdminUsers(filters)`;
- map frontend user filters to backend query params;
- use explicit `limit` for admin users list loading;
- preserve backward-compatible unbounded access where needed;
- keep CSV export and visible table behavior stable;
- avoid production redeploy during Stage 33 development.

Planned implementation steps:
1. Add client query builder support for `getAdminUsers(filters)`.
2. Add frontend filter-to-backend mapping for `q`, `activity`, and `role`.
3. Add admin users fast-path data loading without breaking current admin bootstrap.
4. Add smoke/guard coverage for frontend fast-path query construction.
5. Verify CI on `develop`.
6. Close Stage 33 with acceptance and tag.

Safety boundary:
- baseline/documentation only;
- no runtime code changes in this checkpoint;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 33 admin users frontend fast-path baseline - 2026-05-31`
- `stage33_admin_users_frontend_fast_path_baseline=yes`
- `stage33_backend_fast_path_reuse_planned=yes`
- `stage33_frontend_unbounded_users_load_identified=yes`
- `stage33_no_runtime_change=yes`
- `stage33_no_production_redeploy=yes`

## 2. Frontend API query builder - 2026-05-31

Goal: add reusable query string support for admin users API calls.

Implementation:
- `buildQueryString(filters = {})` was added to `frontend/src/api/client.js`;
- empty, null, and undefined filter values are skipped;
- `getAdminUsers(filters = {})` now accepts filters;
- `getAdminUsers()` without arguments remains backward-compatible;
- users API calls can now request `/api/v1/admin/users?limit=...&q=...&is_active=...&role=...`.

Safety boundary:
- API client only;
- no page behavior changes in this checkpoint;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 33.1 frontend API query builder - 2026-05-31`
- `stage33_frontend_api_query_builder=yes`
- `stage33_get_admin_users_filters_supported=yes`
- `stage33_get_admin_users_backward_compatible=yes`
- `stage33_no_backend_change=yes`
- `stage33_no_production_redeploy=yes`

## 3. Admin UI fast-path data loading - 2026-05-31

Goal: connect the admin users UI data loading flow to the Stage 32 optimized backend fast path.

Implementation:
- `useAdminDataLoader.loadAdminData(options = {})` now accepts `usersFilters`;
- admin bootstrap loads users through `getAdminUsers(buildAdminUsersFastPathFilters(...))`;
- admin users loading uses explicit `limit=200`;
- `q` is mapped to backend `q`;
- `activity=active/inactive` is mapped to backend `is_active=true/false`;
- frontend `role_id` is mapped to backend role code after roles are loaded;
- Users page refresh and filter changes pass current filters to `loadAdminData({ usersFilters })`;
- existing client-side filtering remains as a safe UI layer over the backend result.

Safety boundary:
- frontend runtime change only;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 33.2 admin UI fast-path data loading - 2026-05-31`
- `stage33_admin_ui_fast_path_data_loading=yes`
- `stage33_admin_users_limit_200=yes`
- `stage33_admin_users_filter_mapping=yes`
- `stage33_users_page_refresh_uses_fast_path=yes`
- `stage33_no_backend_change=yes`
- `stage33_no_production_redeploy=yes`
