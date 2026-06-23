# Stage 82.4 - lesson editor shell

stage82_4_status=lesson_editor_shell_implemented
stage82_4_release_manifest_required=yes
stage82_4_guard_required=yes
stage82_4_server_touched=no
stage82_4_data_changed=no
stage82_4_runtime_rebuild_required=yes_for_frontend_deploy
stage82_4_runtime_restart_required=yes_for_frontend_deploy
stage82_4_database_migration_required=no
stage82_4_cleanup_performed=no
stage82_4_decision=add_safe_frontend_shell_for_lesson_blocks
stage82_4_next_stage=82.5

## Scope

Stage 82.4 adds a safe frontend shell for the new block-based lesson editor.

The shell:

- adds client functions for the Stage 82.3 lesson-block Admin API;
- adds `LessonBlocksEditor`;
- reads blocks for an existing lesson;
- displays real blocks and synthetic legacy blocks;
- keeps the legacy lesson editor form in place;
- does not create, update, delete or reorder blocks from the UI yet.

stage82_4_shell_mode=read_only
stage82_4_legacy_editor_preserved=yes
stage82_4_lesson_block_api_client=yes
stage82_4_component=LessonBlocksEditor

## Safety

- no database migration;
- no destructive data operation;
- backend is not changed;
- existing lesson form remains available;
- frontend-only deploy is enough.

## Acceptance

Stage 82.4 is accepted when:

- frontend guard passes;
- stage guard passes;
- source/text guards pass;
- Vite build passes;
- legacy editor remains in `AdminCoursesPage.jsx`;
- `LessonBlocksEditor` is present and uses `getAdminLessonBlocks`.
