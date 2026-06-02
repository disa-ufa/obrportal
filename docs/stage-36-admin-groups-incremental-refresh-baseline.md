# Stage 36 - Admin groups incremental refresh baseline

## 1. Baseline purpose - 2026-06-01

Goal: prepare a safe follow-up after Stage 35 by reducing unnecessary full admin data reloads when the admin groups page is refreshed.

Stage 35 accepted state:
- admin organizations page uses an organizations-only refresh path;
- `refreshAdminOrganizations()` updates only `adminData.organizations`;
- full `loadAdminData` remains available for initial bootstrap and global refresh;
- Stage 35 final acceptance is tagged as `v0.1.0-stage35-admin-organizations-incremental-refresh-complete`;
- `develop` is green after Stage 35 final CI.

Current Stage 36 observation:
- `GroupsPage` still receives `onRefreshAdminData`;
- manual groups refresh uses `onRefresh={onRefreshAdminData}`;
- `onRefreshAdminData` currently points to the global admin data loader;
- global `loadAdminData(options = {})` still reloads organizations, groups, roles, permissions, audit events, dashboard summary, and users;
- this is safe but inefficient when only the groups list needs refreshing;
- a dedicated groups-only refresh path should be introduced carefully.

Stage 36 target:
- keep initial admin bootstrap behavior stable;
- add or prepare a dedicated groups-only refresh path;
- avoid reloading unrelated admin datasets when only groups are refreshed;
- preserve groups sorting behavior;
- preserve current table behavior and client-side filters;
- avoid backend changes, migrations, `main` update, or production redeploy.

Planned implementation steps:
1. Record current full reload behavior as baseline.
2. Add a dedicated groups refresh helper/hook or action.
3. Wire `GroupsPage` manual refresh to the groups-only path.
4. Preserve full `loadAdminData` for initial admin bootstrap and global refresh.
5. Add smoke/guard coverage for groups-only refresh.
6. Verify frontend build and CI.
7. Archive and accept Stage 36.

Safety boundary:
- baseline/documentation only;
- no runtime code changes in this checkpoint;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 36 admin groups incremental refresh baseline - 2026-06-01`
- `stage36_admin_groups_incremental_refresh_baseline=yes`
- `stage36_current_global_reload_identified=yes`
- `stage36_groups_only_refresh_planned=yes`
- `stage36_stage35_organizations_only_refresh_dependency_confirmed=yes`
- `stage36_no_runtime_change=yes`
- `stage36_no_backend_change=yes`
- `stage36_no_main_update=yes`
- `stage36_no_production_redeploy=yes`
