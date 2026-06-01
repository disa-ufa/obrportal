# Stage 34 - Admin users incremental refresh baseline

## 1. Baseline purpose - 2026-06-01

Goal: prepare a safe follow-up after Stage 33 by reducing unnecessary full admin data reloads when only the admin users list filters change.

Stage 33 accepted state:
- admin users API client supports `getAdminUsers(filters = {})`;
- admin users frontend flow uses backend fast-path filters;
- users loading supports `limit=200`, `q`, `is_active`, and role code mapping;
- Stage 33 final acceptance is tagged as `v0.1.0-stage33-frontend-fast-path-complete`;
- `develop` is green after Stage 33 final CI.

Current Stage 34 observation:
- `UsersPage` refreshes users through `onRefreshAdminData({ usersFilters })`;
- `onRefreshAdminData` currently points to the global admin data loader;
- global `loadAdminData(options = {})` still reloads organizations, groups, roles, permissions, audit events, dashboard summary, and then users;
- this is safe but inefficient for frequent users filter changes;
- a dedicated users-only refresh path should be introduced carefully.

Stage 34 target:
- keep initial admin bootstrap behavior stable;
- add or prepare a dedicated users-only refresh path;
- avoid reloading unrelated admin datasets when only users filters change;
- preserve role-code mapping for `role_id`;
- preserve current table behavior and safe client-side filtering layer;
- avoid backend changes, migrations, `main` update, or production redeploy.

Planned implementation steps:
1. Record current full reload behavior as baseline.
2. Add a dedicated users refresh helper/hook or action.
3. Wire `UsersPage` filter refresh to the users-only path.
4. Preserve full `loadAdminData` for initial admin bootstrap and global refresh.
5. Add smoke/guard coverage for users-only refresh.
6. Verify frontend build and CI.
7. Archive and accept Stage 34.

Safety boundary:
- baseline/documentation only;
- no runtime code changes in this checkpoint;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 34 admin users incremental refresh baseline - 2026-06-01`
- `stage34_admin_users_incremental_refresh_baseline=yes`
- `stage34_current_global_reload_identified=yes`
- `stage34_users_only_refresh_planned=yes`
- `stage34_stage33_fast_path_dependency_confirmed=yes`
- `stage34_no_runtime_change=yes`
- `stage34_no_backend_change=yes`
- `stage34_no_main_update=yes`
- `stage34_no_production_redeploy=yes`

## 2. Users-only refresh path - 2026-06-01

Goal: avoid full admin data reloads when only admin users filters change.

Implementation:
- `useAdminDataLoader` now returns `refreshAdminUsers(usersFilters = {}, roles = [])`;
- `refreshAdminUsers` calls `getAdminUsers(buildAdminUsersFastPathFilters(usersFilters, roles))`;
- users-only refresh updates only `adminData.users`;
- unrelated admin datasets are preserved through functional `setAdminData((current) => ({ ...current, users }))`;
- `UsersPage` now prefers `onRefreshUsers(filters, roles)` for filter changes and manual users refresh;
- `onRefreshAdminData({ usersFilters })` remains as fallback;
- initial admin bootstrap still uses full `loadAdminData`.

Safety boundary:
- frontend-only runtime change;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 34.1 admin users-only refresh path - 2026-06-01`
- `stage34_users_only_refresh_path=yes`
- `stage34_refresh_admin_users_only_updates_users=yes`
- `stage34_users_page_uses_on_refresh_users=yes`
- `stage34_full_bootstrap_preserved=yes`
- `stage34_no_backend_change=yes`
- `stage34_no_main_update=yes`
- `stage34_no_production_redeploy=yes`
