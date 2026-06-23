# Stage 32.4 - Post-optimization stability measurement archive

## 1. Archive purpose - 2026-05-31

Goal: archive the post-optimization evidence for `/api/v1/admin/users` after Stage 32.3.

Current branch baseline:
- `develop` includes Stage 32.3 admin users endpoint optimization;
- optimized commit: `975d583`;
- GitHub Actions run `2104` completed successfully;
- `main` remains on Stage 30 frozen release;
- production is not redeployed by this archive step.

Optimization accepted:
- user roles are batch-loaded through `get_users_roles`;
- `/api/v1/admin/users?limit=20` applies SQL limit;
- `/api/v1/admin/users?limit=20&q=admin` applies SQL filtering;
- `is_active` filter is supported;
- `role` filter is supported;
- full auth/RBAC admin API test suite passed locally;
- CI passed on `develop`.

Known post-optimization measurement signal:
- plain `/api/v1/admin/users` is much faster than the pre-optimization 9-10 seconds, but still loads all users when no limit is provided;
- `/api/v1/admin/users?limit=20` responds in tens of milliseconds;
- `/api/v1/admin/users?limit=20&q=admin` responds mostly in tens of milliseconds;
- `/api/v1/admin/audit-events` remains stable.

Interpretation:
- Stage 32.3 fixed the critical N+1 bottleneck;
- filtered/paginated admin users access is now the preferred fast path;
- plain unbounded `/api/v1/admin/users` remains backward-compatible and intentionally unbounded when no limit is supplied;
- future UI/API clients should prefer explicit `limit`.

Safety boundary:
- archive/documentation only;
- no runtime code changes;
- no database migration;
- no `main` update;
- no production redeploy.

Verification markers:
- `Stage 32.4 post-optimization stability measurement archive - 2026-05-31`
- `stage32_post_optimization_stability_archive=yes`
- `stage32_admin_users_optimization_ci_success=yes`
- `stage32_admin_users_fast_path_confirmed=yes`
- `stage32_plain_users_backward_compatible=yes`
- `stage32_no_production_redeploy=yes`
