# Stage 82.3 - lesson blocks backend API

stage82_3_status=lesson_blocks_backend_api_implemented
stage82_3_release_manifest_required=yes
stage82_3_guard_required=yes
stage82_3_server_touched=no
stage82_3_data_changed=no
stage82_3_runtime_rebuild_required=yes_for_deploy
stage82_3_runtime_restart_required=yes_for_deploy
stage82_3_database_migration_required=no
stage82_3_cleanup_performed=no
stage82_3_decision=implement_admin_lesson_blocks_api
stage82_3_next_stage=82.4

## Scope

Stage 82.3 adds admin backend endpoints for lesson blocks on top of the Stage 82.2 schema foundation.

## Implemented endpoints

The admin router exposes:

- `GET /admin/course-lessons/{lesson_id}/blocks`;
- `POST /admin/course-lessons/{lesson_id}/blocks`;
- `PATCH /admin/lesson-blocks/{block_id}`;
- `DELETE /admin/lesson-blocks/{block_id}`;
- `POST /admin/course-lessons/{lesson_id}/blocks/reorder`.

stage82_3_endpoints=get_list_create_update_delete_reorder

## Legacy compatibility

The list endpoint returns real blocks when they exist.

If a legacy lesson has no real blocks and `editor_mode` is not `block`, the endpoint returns a synthetic block built from legacy fields:

- `content_type`;
- `content_url`;
- `content_text`.

stage82_3_legacy_adapter=synthetic_legacy_block_on_list

## Safety

- no database migration in this stage;
- no destructive data migration;
- no frontend switch;
- no legacy field removal;
- backend rebuild/restart is required only on deployment.

## Acceptance

Stage 82.3 is accepted locally when:

- lesson block routes are registered;
- source contract tests pass;
- py_compile passes;
- release manifest guard passes;
- Stage 82.3 guard passes;
- no raw contacts or passwords are committed.
