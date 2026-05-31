# Stage 32 - Performance and stability baseline

## 1. Baseline - 2026-05-30

Goal: start a controlled performance and stability cycle after Stage 31 development cycle completion.

Current baseline:
- `develop` is on Stage 31 completed tag: `v0.1.0-stage31-development-cycle-complete`;
- `develop` commit is expected: `333c9d749a5a2facbb39603b63d7572faf44398e`;
- `main` remains on Stage 30 production/frozen release;
- production server remains on `v0.1.0-stage30-pre-launch-freeze-complete`;
- no production redeploy is performed by Stage 32 baseline.

Current git head at Stage 32 baseline creation: `333c9d7`.

Stage 32 purpose:
- investigate and document performance/stability risks;
- focus first on backend/admin endpoint stability;
- review previously observed local pytest timeout;
- keep production protected;
- avoid runtime changes until measurements are collected.

Known prior stability signal:
- during a previous full backend pytest run, two admin endpoint checks temporarily timed out;
- after backend restart, full backend pytest passed with `214 passed, 4 warnings`;
- later Stage 31 local runtime smoke confirmed backend `/health`, `/api/v1/ready`, and frontend root responses.

Stage 32 investigation scope:
1. Backend admin endpoint stability:
   - `/api/v1/admin/users`;
   - `/api/v1/admin/audit-events`;
   - related admin filters and pagination.

2. Local test stability:
   - repeat focused tests;
   - repeat full backend pytest if needed;
   - compare failures against backend logs.

3. Runtime smoke stability:
   - backend `/health`;
   - backend `/api/v1/ready`;
   - frontend root;
   - docker compose service state.

4. Guard/CI stability:
   - keep Stage 31 guards passing;
   - keep release versioning compatibility guard passing;
   - keep encoding/BOM guards passing.

Out of scope for this baseline:
- no production redeploy;
- no `main` update;
- no database migrations;
- no destructive commands;
- no performance optimization code changes before measurement;
- no changes to production `.env`.

Safety boundary:
- work continues only from `develop`;
- production remains Stage 30 frozen;
- Stage 32 starts with diagnostics and documentation;
- any code-level optimization must be a separate accepted checkpoint.

Verification markers:
- `Stage 32 performance and stability baseline - 2026-05-30`
- `stage32_performance_stability_baseline=yes`
- `stage32_focus_admin_endpoint_stability=yes`
- `stage32_prior_timeout_recorded=yes`
- `stage32_measure_before_optimize=yes`
- `stage32_no_production_redeploy=yes`
- `stage32_main_remains_stage30=yes`

## 2. Admin endpoint stability measurements - 2026-05-31

Goal: measure local stability of the admin endpoints that were previously involved in timeout investigations.

Measurement scope:
- `/api/v1/admin/users`;
- `/api/v1/admin/users?limit=20`;
- `/api/v1/admin/users?limit=20&q=admin`;
- `/api/v1/admin/audit-events`;
- `/api/v1/admin/audit-events?limit=20`;
- `/api/v1/admin/audit-events?limit=50`.

Measurement method:
- authenticate as admin;
- execute repeated read-only GET requests;
- record elapsed time per endpoint;
- fail on non-200 status;
- fail on timeout;
- fail on unexpected payload type.

Safety boundary:
- read-only local measurement only;
- no production redeploy;
- no `main` update;
- no database migrations;
- no destructive commands.

Verification markers:
- `Stage 32.1 admin endpoint stability measurements - 2026-05-31`
- `stage32_admin_endpoint_stability_measurements=yes`
- `stage32_admin_users_measured=yes`
- `stage32_admin_audit_events_measured=yes`
- `stage32_measurement_read_only=yes`
- `stage32_no_production_redeploy=yes`

## 3. Admin users endpoint profiling - 2026-05-31

Goal: profile the root cause of slow `/api/v1/admin/users` responses before changing runtime behavior.

Observed Stage 32.1 measurements:
- `/api/v1/admin/users` average response time was about 9.6 seconds;
- `/api/v1/admin/users?limit=20` average response time was about 9.3 seconds;
- `/api/v1/admin/users?limit=20&q=admin` average response time was about 9.4 seconds;
- `/api/v1/admin/audit-events` average response time was about 40 ms;
- no timeouts and no failures were observed during 10 measurement rounds.

Profiling result:
- `list_users` currently executes `select(User).order_by(User.email)` without pagination;
- `list_users` currently loads all users with `users_result.scalars().all()`;
- `list_users` currently iterates over every user;
- inside that loop, it calls `get_user_roles(str(user.id), session)`;
- `get_user_roles` performs a separate SQL query for one user;
- therefore the current implementation has an N+1 query pattern;
- query params such as `limit=20` and `q=admin` are not represented in the `list_users` function signature;
- therefore those query params do not reduce the SQL result set for `/api/v1/admin/users`.

Conclusion:
- slow admin users endpoint is localized to the users list implementation;
- audit-events endpoint is not affected by the same slowdown;
- likely next optimization is to batch-load roles for all listed users and implement real pagination/filtering.

Safety boundary:
- Stage 32.2 is profiling/documentation only;
- no runtime optimization is applied in this checkpoint;
- no database migration is added;
- no production redeploy is performed;
- no `main` update is performed.

Verification markers:
- `Stage 32.2 admin users endpoint profiling - 2026-05-31`
- `stage32_admin_users_endpoint_profiling=yes`
- `stage32_admin_users_n_plus_one_confirmed=yes`
- `stage32_admin_users_limit_query_ignored_confirmed=yes`
- `stage32_admin_users_optimization_deferred=yes`
- `stage32_no_production_redeploy=yes`

## 4. Admin users endpoint optimization - 2026-05-31

Goal: optimize `/api/v1/admin/users` after Stage 32.2 profiling confirmed the bottleneck.

Optimization:
- roles for listed users are loaded in one batch query through `get_users_roles`;
- `list_users` no longer calls `get_user_roles` once per user;
- `limit` is now applied to the SQL query;
- `q` is now applied to email, phone, and full name;
- `is_active` is now applied to the SQL query;
- `role` is now applied through `UserRole` and `Role` joins.

Expected result:
- `/api/v1/admin/users?limit=20` should avoid loading the full user table;
- `/api/v1/admin/users?limit=20&q=admin` should avoid scanning/serializing unrelated users in Python;
- users list role serialization should avoid the previous N+1 role query pattern.

Safety boundary:
- no database migration is added;
- no production redeploy is performed;
- no `main` update is performed;
- behavior remains backward-compatible for plain `/api/v1/admin/users`.

Verification markers:
- `Stage 32.3 admin users endpoint optimization - 2026-05-31`
- `stage32_admin_users_endpoint_optimized=yes`
- `stage32_admin_users_roles_batch_loaded=yes`
- `stage32_admin_users_limit_filter_supported=yes`
- `stage32_admin_users_q_filter_supported=yes`
- `stage32_admin_users_is_active_filter_supported=yes`
- `stage32_admin_users_role_filter_supported=yes`
- `stage32_no_production_redeploy=yes`
