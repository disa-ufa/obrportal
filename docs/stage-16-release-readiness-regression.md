# Stage 16 — Release readiness, regression and demo acceptance

## 1. Baseline — 2026-05-29

Goal: start Stage 16 after completing Stage 15 admin UX/operator workflow.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 15 active filters summary is accepted;
- Stage 15 friendly errors hardening is accepted;
- Stage 15 raw friendly errors rescan confirmed zero raw-risk hits;
- current git head at Stage 16 baseline creation: `1b8bc3c`.

Stage 16 purpose:
- stabilize the project before the next release/demo checkpoint;
- verify backend, frontend, smoke guards and CI together;
- prepare a repeatable release/demo checklist;
- document known non-blocking warnings;
- avoid large runtime changes until the regression baseline is accepted.

Planned Stage 16 scope:
1. Full local regression checklist:
   - backend tests;
   - frontend build;
   - Stage 14 guard;
   - Stage 15 guard;
   - encoding guard;
   - BOM guard;
   - smoke scripts relevant to auth/RBAC, admin pages, documents, account and organization cabinet.

2. CI readiness:
   - both `develop` and `main` must be green;
   - no local uncommitted runtime changes before tagging;
   - tags must be created only after green CI.

3. Demo readiness:
   - define operator/admin demo path;
   - define learner/account demo path;
   - define documents/certificates verification demo path;
   - define expected successful outcomes and known limitations.

4. Release documentation:
   - prepare release summary;
   - document accepted stages and tags;
   - record non-blocking warnings such as frontend chunk-size warning.

Out of scope for Stage 16 baseline:
- no database migrations;
- no backend API contract changes;
- no RBAC changes;
- no destructive bulk actions;
- no secret/token changes.

Safety notes:
- This baseline creates documentation and a diagnostic guard only.
- Runtime code is not changed.
- Secrets must not be printed.
- `.env` must stay uncommitted.
- `stage16_release_readiness_baseline=yes`.

Verification markers:
- `Stage 16 release readiness regression baseline - 2026-05-29`
- `stage16_release_readiness_baseline=yes`
- `stage16_runtime_changed=no`
- `stage16_depends_on_stage14_complete=yes`
- `stage16_depends_on_stage15_complete=yes`
