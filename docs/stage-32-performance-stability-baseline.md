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
