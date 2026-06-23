# Stage 82.5 - lesson block editor actions

stage82_5_status=lesson_block_editor_actions_implemented
stage82_5_release_manifest_required=yes
stage82_5_guard_required=yes
stage82_5_server_touched=no
stage82_5_data_changed=no
stage82_5_runtime_rebuild_required=yes_for_frontend_deploy
stage82_5_runtime_restart_required=yes_for_frontend_deploy
stage82_5_database_migration_required=no
stage82_5_cleanup_performed=no
stage82_5_decision=enable_lesson_block_editor_actions
stage82_5_next_stage=82.6

## Scope

Stage 82.5 enables safe UI actions inside `LessonBlocksEditor`.

The editor can:

- create a lesson block;
- edit a real lesson block;
- delete a real lesson block;
- move real blocks up and down through the reorder API;
- keep synthetic legacy blocks read-only;
- keep the old lesson editor form in place.

stage82_5_actions=create_update_delete_reorder
stage82_5_legacy_blocks_read_only=yes
stage82_5_backend_changed=no
stage82_5_legacy_editor_preserved=yes

## Safety

- no database migration;
- no backend code change;
- frontend-only deploy;
- synthetic legacy blocks cannot be edited, deleted or reordered;
- old lesson fields remain available.

## Acceptance

Stage 82.5 is accepted when:

- frontend build passes;
- release manifest guard passes;
- stage guard passes;
- source/text guards pass;
- frontend guard passes;
- `LessonBlocksEditor` imports create, update, delete and reorder API functions;
- legacy blocks are guarded as read-only.
