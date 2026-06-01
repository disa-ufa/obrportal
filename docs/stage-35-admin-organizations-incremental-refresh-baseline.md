# Stage 35 - Admin organizations incremental refresh baseline

## 1. Baseline purpose - 2026-06-01

Goal: prepare a safe follow-up after Stage 34 by reducing unnecessary full admin data reloads when the admin organizations page is refreshed.

Stage 34 accepted state:
- admin users filters use a users-only refresh path;
- `refreshAdminUsers(usersFilters = {}, roles = [])` updates only `adminData.users`;
- full `loadAdminData` remains available for initial bootstrap and global refresh;
- Stage 34 final acceptance is tagged as `v0.1.0-stage34-admin-users-incremental-refresh-complete`;
- `develop` is green after Stage 34 final CI.

Current Stage 35 observation:
- `OrganizationsPage` still receives `onRefreshAdminData`;
- manual organizations refresh uses `onRefresh={onRefreshAdminData}`;
- `onRefreshAdminData` currently points to the global admin data loader;
- global `loadAdminData(options = {})` still reloads organizations, groups, roles, permissions, audit events, dashboard summary, and users;
- this is safe but inefficient when only the organizations list needs refreshing;
- a dedicated organizations-only refresh path should be introduced carefully.

Stage 35 target:
- keep initial admin bootstrap behavior stable;
- add or prepare a dedicated organizations-only refresh path;
- avoid reloading unrelated admin datasets when only organizations are refreshed;
- preserve organizations sorting behavior;
- preserve current table behavior and client-side filters;
- avoid backend changes, migrations, `main` update, or production redeploy.

Planned implementation steps:
1. Record current full reload behavior as baseline.
2. Add a dedicated organizations refresh helper/hook or action.
3. Wire `OrganizationsPage` manual refresh to the organizations-only path.
4. Preserve full `loadAdminData` for initial admin bootstrap and global refresh.
5. Add smoke/guard coverage for organizations-only refresh.
6. Verify frontend build and CI.
7. Archive and accept Stage 35.

Safety boundary:
- baseline/documentation only;
- no runtime code changes in this checkpoint;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 35 admin organizations incremental refresh baseline - 2026-06-01`
- `stage35_admin_organizations_incremental_refresh_baseline=yes`
- `stage35_current_global_reload_identified=yes`
- `stage35_organizations_only_refresh_planned=yes`
- `stage35_stage34_users_only_refresh_dependency_confirmed=yes`
- `stage35_no_runtime_change=yes`
- `stage35_no_backend_change=yes`
- `stage35_no_main_update=yes`
- `stage35_no_production_redeploy=yes`

## 2. Organizations-only refresh path - 2026-06-01

Goal: avoid full admin data reloads when only the admin organizations page is manually refreshed.

Implementation:
- `useAdminDataLoader` now returns `refreshAdminOrganizations()`;
- `refreshAdminOrganizations` calls `getAdminOrganizations()`;
- organizations-only refresh updates only `adminData.organizations`;
- unrelated admin datasets are preserved through functional `setAdminData((current) => ({ ...current, organizations }))`;
- `OrganizationsPage` now prefers `onRefreshOrganizations()` for manual refresh;
- `onRefreshAdminData()` remains as fallback;
- initial admin bootstrap still uses full `loadAdminData`.

Safety boundary:
- frontend-only runtime change;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 35.1 admin organizations-only refresh path - 2026-06-01`
- `stage35_organizations_only_refresh_path=yes`
- `stage35_refresh_admin_organizations_only_updates_organizations=yes`
- `stage35_organizations_page_uses_on_refresh_organizations=yes`
- `stage35_full_bootstrap_preserved=yes`
- `stage35_no_backend_change=yes`
- `stage35_no_main_update=yes`
- `stage35_no_production_redeploy=yes`
