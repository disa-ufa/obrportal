# Stage 81.5 - Manual admin UI content fill runbook

stage81_5_manual_admin_content_fill_runbook_status=implementation_ready
stage81_5_release_manifest_required=yes
stage81_5_guard_required=yes
stage81_5_runtime_changes=no
stage81_5_frontend_runtime_changes=no
stage81_5_backend_runtime_changes=no
stage81_5_database_changes=no
stage81_5_migrations_added=no
stage81_5_production_deploy_required=no
stage81_5_production_data_changed=no
stage81_5_manual_admin_ui_content_fill=yes
stage81_5_sql_content_fill_allowed=no
stage81_5_seed_content_fill_allowed=no
stage81_5_next_stage=81.6

## Scope

Stage 81.5 records the manual admin UI content filling runbook after Stage 81.4 selected the safe manual path.

This stage is documentation and guard only.

## Decision

The first production content filling will be performed manually through the admin UI.

This avoids direct SQL writes and avoids a production seed command for the first real launch.

## Manual admin UI content path

Create content in this order: verify admin login, verify admin pages, create or verify organization, create real course, create course modules, create course lessons, create learning group if needed, create or verify learner account, create enrollment, check learner course visibility, and do not issue real documents until admin review is completed.

## Forbidden in Stage 81.5

Do not run on production: docker compose down -v, ResetVolumes, local_bootstrap.ps1 -ResetVolumes, local_bootstrap.ps1 -ResetVolumes -WithDemoLearning, direct SQL inserts for content, direct SQL cleanup, seed command for production content, migration command, container rebuild, container restart, table truncation, storage replacement.

## Stage 81.6 recommendation

Stage 81.6 should perform the controlled manual content filling through the admin UI with pre-change backup, pre-change table counts, manual UI actions, post-change table counts, public route checks, ready endpoint checks, and no direct SQL content writes.

## Acceptance

Stage 81.5 is accepted when release manifest current_stage is 81.5, manual admin UI content filling runbook is recorded, SQL content filling is explicitly disallowed, seed content filling is explicitly disallowed, no runtime changes are introduced, no migrations are introduced, no production deployment is required, and no production data is changed by this stage.
