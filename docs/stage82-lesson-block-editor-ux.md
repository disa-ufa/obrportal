# Stage 82.6 - lesson block editor UX

stage82_6_status=lesson_block_editor_ux_implemented
stage82_6_release_manifest_required=yes
stage82_6_guard_required=yes
stage82_6_server_touched=no
stage82_6_data_changed=no
stage82_6_runtime_rebuild_required=yes_for_frontend_deploy
stage82_6_runtime_restart_required=yes_for_frontend_deploy
stage82_6_database_migration_required=no
stage82_6_cleanup_performed=no
stage82_6_decision=add_type_specific_block_fields_and_preview
stage82_6_next_stage=82.7

## Scope

Stage 82.6 improves the block editor user experience.

The editor now has:

- type-specific fields for rich text, video, file/link, quiz, assignment and callout;
- block validation hints before save;
- preview panel before save;
- structured `content_json` payloads per block type;
- legacy blocks still read-only;
- old lesson editor still preserved.

stage82_6_type_specific_fields=yes
stage82_6_preview_panel=yes
stage82_6_structured_content_json=yes
stage82_6_legacy_blocks_read_only=yes
stage82_6_backend_changed=no
stage82_6_legacy_editor_preserved=yes

## Safety

- no database migration;
- no backend code change;
- frontend-only deploy;
- synthetic legacy blocks cannot be edited, deleted or reordered;
- old lesson fields remain available.

## Acceptance

Stage 82.6 is accepted when:

- frontend build passes;
- release manifest guard passes;
- stage guard passes;
- source/text guards pass;
- frontend guard passes;
- `LessonBlocksEditor` contains type-specific fields and preview panel;
- legacy blocks remain read-only.
