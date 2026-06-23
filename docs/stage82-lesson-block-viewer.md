# Stage 82.7 - learner lesson block viewer

stage82_7_status=learner_lesson_block_viewer_implemented
stage82_7_release_manifest_required=yes
stage82_7_guard_required=yes
stage82_7_server_touched=no
stage82_7_data_changed=no
stage82_7_runtime_rebuild_required=yes_for_frontend_deploy
stage82_7_runtime_restart_required=yes_for_frontend_deploy
stage82_7_database_migration_required=no
stage82_7_cleanup_performed=no
stage82_7_decision=show_lesson_blocks_to_learners
stage82_7_next_stage=82.8

## Scope

Stage 82.7 adds a learner-facing lesson block viewer to the public course detail page.

The viewer:

- renders lesson `blocks`, `lesson_blocks` or `content_blocks` when present in the course payload;
- falls back to a legacy content adapter from old lesson fields when real blocks are absent;
- supports rich text, video, file/link, quiz, assignment and callout blocks;
- respects learner access locking;
- does not add backend routes;
- does not change database schema.

stage82_7_learner_viewer=yes
stage82_7_legacy_adapter=yes
stage82_7_backend_changed=no
stage82_7_database_changed=no
stage82_7_frontend_only=yes

## Safety

- no database migration;
- no backend code change;
- frontend-only deploy;
- old learner course panels remain in place;
- locked lessons do not expose block content.

## Acceptance

Stage 82.7 is accepted when:

- frontend build passes;
- release manifest guard passes;
- stage guard passes;
- source/text guards pass;
- frontend guard passes;
- course detail page contains learner block viewer markers.
