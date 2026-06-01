# Stage 34.2 - Admin users-only refresh archive

## 1. Archive checkpoint - 2026-06-01

Goal: record accepted Stage 34.1 behavior after replacing full admin data reloads with a users-only refresh path for admin users filters.

Accepted chain:
- Stage 34 baseline identified that `UsersPage` used `onRefreshAdminData({ usersFilters })`;
- this path reused full `loadAdminData(options = {})`;
- full loader refreshed organizations, groups, roles, permissions, audit events, dashboard summary, and users;
- Stage 34.1 added `refreshAdminUsers(usersFilters = {}, roles = [])`;
- `UsersPage` now prefers `onRefreshUsers(filters, roles)`;
- `onRefreshAdminData({ usersFilters })` remains as fallback;
- GitHub Actions run `2115` completed successfully on commit `14478f3`.

Accepted frontend behavior:
- initial admin bootstrap still uses full `loadAdminData`;
- users filter changes refresh only `adminData.users`;
- unrelated admin datasets are preserved with functional `setAdminData((current) => ({ ...current, users }))`;
- users refresh still uses Stage 33 fast-path filters;
- role mapping still uses current `roles`;
- frontend build passed;
- smoke and guard checks passed.

Validation evidence:
- `check_stage34_admin_users_only_refresh_path.py` passed;
- `check_stage34_admin_users_incremental_refresh_baseline.py` passed;
- `check_stage33_final_frontend_fast_path_acceptance.py` passed;
- `check_stage33_admin_ui_fast_path_data_loading.py` passed;
- `smoke_frontend_hooks_layout.py` passed;
- `smoke_admin_hooks.py` passed;
- `smoke_frontend_api_client.py` passed;
- `smoke_frontend_admin_pages.py` passed;
- release versioning, text encoding, and source BOM guards passed;
- frontend build passed;
- GitHub Actions run `2115` passed on `develop`.

Safety boundary:
- archive/documentation only;
- no runtime code changes in this checkpoint;
- no backend changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 34.2 users-only refresh archive - 2026-06-01`
- `stage34_users_only_refresh_archive=yes`
- `stage34_ci_2115_success=yes`
- `stage34_users_only_refresh_accepted=yes`
- `stage34_full_bootstrap_preserved_archived=yes`
- `stage34_unrelated_admin_datasets_preserved=yes`
- `stage34_no_runtime_change=yes`
- `stage34_no_backend_change=yes`
- `stage34_no_main_update=yes`
- `stage34_no_production_redeploy=yes`
