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

## 2. Full local regression checklist inventory - 2026-05-29

Goal: define the repeatable local regression checklist for Stage 16 before release/demo acceptance.

Current git head before checklist inventory: `34cc80c`.

Required guard checks:
- `python scripts/check_stage16_release_readiness_regression.py`
- `python scripts/check_stage15_admin_ux_operator_workflow.py`
- `python scripts/check_stage14_documents_certificates_verification.py`
- `python scripts/check_text_encoding.py`
- `python scripts/check_source_bom.py`

Required frontend check:
- `docker compose exec frontend npm run build`

Required backend/API checks:
- `docker compose exec backend pytest app/tests -q`

Required smoke checks:
- `python scripts/smoke_auth_rbac.py`
- `python scripts/smoke_org_cabinet_utils.py`
- `python scripts/smoke_org_cabinet_page.py`
- `python scripts/smoke_org_cabinet_route.py`
- `python scripts/smoke_documents_page.py`
- `python scripts/smoke_document_generation_flow.py`
- `python scripts/smoke_account_page.py`
- `python scripts/smoke_stage12_1_account_workflow.py`
- `python scripts/smoke_public_pages.py`
- `python scripts/smoke_auth_pages.py`
- `python scripts/smoke_admin_renderer.py`
- `python scripts/smoke_admin_hooks.py`
- `python scripts/smoke_frontend_core.py`
- `python scripts/smoke_shared_components.py`
- `python scripts/smoke_admin_components.py`
- `python scripts/smoke_frontend_utils_routes.py`
- `python scripts/smoke_frontend_hooks_layout.py`
- `python scripts/smoke_frontend_api_client.py`
- `python scripts/smoke_frontend_admin_pages.py`

Pass criteria:
- all listed checks must exit with code `0`;
- no secrets may be printed;
- frontend chunk-size warning is non-blocking for Stage 16.1;
- no runtime code is changed by this checklist inventory.

Safety notes:
- This checkpoint documents the regression checklist only.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- `stage16_full_regression_checklist_inventory=yes`.

Verification markers:
- `Stage 16.1 full local regression checklist inventory - 2026-05-29`
- `stage16_full_regression_checklist_inventory=yes`
- `stage16_backend_pytest_required=yes`
- `stage16_frontend_build_required=yes`
- `stage16_smoke_chain_required=yes`

## 3. Full local regression run passed - 2026-05-29

Goal: record the actual Stage 16.2 full local regression run result.

Current git head before recording result: `6254d7c`.

Regression result:
- Stage 16 guard passed;
- Stage 15 guard passed;
- Stage 14 guard passed;
- text encoding guard passed;
- source BOM guard passed;
- backend pytest passed;
- all required smoke scripts passed;
- frontend production build passed;
- final result: `STAGE 16.2 REGRESSION: PASSED`.

Backend test result:
- `docker compose exec -T backend pytest app/tests -q` passed;
- observed result: `214 passed, 4 warnings`;
- warnings are third-party/deprecation warnings and are non-blocking for Stage 16.2.

Smoke result:
- auth/RBAC smoke passed;
- organization cabinet smoke checks passed;
- documents and document generation smoke checks passed;
- account workflow smoke checks passed;
- public/auth pages smoke checks passed;
- admin renderer/hooks/components/pages smoke checks passed;
- frontend utils/routes/hooks/API client smoke checks passed.

Build result:
- frontend production build passed;
- frontend chunk-size warning remains known non-blocking warning.

Local artifact:
- full local log saved at `tmp_stage16_2_full_regression_run.txt`;
- this local log must not be committed.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage16_full_regression_run_passed=yes`.

Verification markers:
- `Stage 16.2 full local regression run passed - 2026-05-29`
- `stage16_full_regression_run_passed=yes`
- `stage16_backend_pytest_passed=yes`
- `stage16_smoke_chain_passed=yes`
- `stage16_frontend_build_passed=yes`

## 4. CI readiness checkpoint - 2026-05-29

Goal: record CI readiness after the full local Stage 16.2 regression pass.

Current git head before CI readiness checkpoint: `c1ad73e`.

Readiness result:
- local `develop` branch is synchronized with `origin/develop`;
- local `main` branch is synchronized with `origin/main`;
- `develop` and `main` point to the same accepted Stage 16.2 commit;
- Stage 16.2 full local regression passed;
- local working tree is clean before this checkpoint;
- GitHub Actions must be green on `develop` and `main` before moving to demo/release acceptance.

Accepted previous checkpoint:
- `c1ad73e` — Stage 16 full regression pass recorded.

Safety notes:
- This checkpoint documents CI readiness only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage16_ci_readiness_checkpoint=yes`.

Verification markers:
- `Stage 16.3 CI readiness checkpoint - 2026-05-29`
- `stage16_ci_readiness_checkpoint=yes`
- `stage16_main_develop_synced=yes`
- `stage16_full_regression_recorded=yes`
- `stage16_ready_for_demo_checklist=yes`

## 5. Demo/release checklist inventory - 2026-05-29

Goal: define the repeatable demo and release acceptance checklist after Stage 16 regression and CI readiness.

Current git head before demo/release checklist inventory: `9640315`.

Demo readiness paths:
1. Public user path:
   - open public home page;
   - open course catalog;
   - open course detail page;
   - verify public pages render without authentication errors.

2. Learner/account path:
   - login as learner;
   - open account summary;
   - open account courses;
   - open account documents;
   - verify available document download behavior;
   - verify unavailable/missing document states are user-friendly.

3. Admin/operator path:
   - login as admin;
   - open dashboard;
   - open users page;
   - open organizations page;
   - open groups page;
   - open roles/permissions pages;
   - open courses page;
   - open enrollments page;
   - open documents page;
   - verify active filters summary on key list pages;
   - verify friendly error handling on forms/pages.

4. Documents/certificates path:
   - create or locate a completed enrollment document;
   - verify document status transitions;
   - verify QR/verification block presence;
   - verify public document verification by number;
   - verify document download for allowed user/admin paths.

Release readiness checklist:
- local full regression is passed and recorded;
- Stage 16 guard is passed;
- Stage 15 guard is passed;
- Stage 14 guard is passed;
- text encoding guard is passed;
- source BOM guard is passed;
- frontend production build is passed;
- backend pytest is passed;
- smoke chain is passed;
- GitHub Actions are green on `develop` and `main`;
- `develop` and `main` are synchronized;
- working tree is clean before final tag;
- known non-blocking warnings are documented.

Known non-blocking warnings:
- frontend chunk-size warning from Vite/Rolldown is non-blocking for Stage 16 release readiness;
- backend pytest third-party deprecation warnings are non-blocking for Stage 16 release readiness.

Out of scope:
- no new runtime functionality in this checkpoint;
- no database migrations;
- no backend API contract changes;
- no RBAC changes;
- no destructive bulk actions.

Safety notes:
- This checkpoint documents demo/release checklist only.
- No runtime code was changed.
- Secrets were not printed.
- `stage16_demo_release_checklist_inventory=yes`.

Verification markers:
- `Stage 16.4 demo release checklist inventory - 2026-05-29`
- `stage16_demo_release_checklist_inventory=yes`
- `stage16_public_demo_path_defined=yes`
- `stage16_learner_demo_path_defined=yes`
- `stage16_admin_operator_demo_path_defined=yes`
- `stage16_documents_verification_demo_path_defined=yes`
- `stage16_release_readiness_checklist_defined=yes`
