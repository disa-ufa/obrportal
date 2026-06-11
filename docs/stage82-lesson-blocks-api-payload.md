# Stage 82.8 - lesson blocks in public/account API payloads

stage82_8_status=lesson_blocks_api_payload_implemented
stage82_8_release_manifest_required=yes
stage82_8_guard_required=yes
stage82_8_server_touched=no
stage82_8_data_changed=no
stage82_8_runtime_rebuild_required=yes_for_backend_deploy
stage82_8_runtime_restart_required=yes_for_backend_deploy
stage82_8_database_migration_required=no
stage82_8_cleanup_performed=no
stage82_8_decision=include_lesson_blocks_in_public_and_account_payloads
stage82_8_next_stage=82.9

## Scope

Stage 82.8 connects real lesson blocks to learner-facing API payloads.

The backend now returns active lesson blocks inside lesson objects for:

- public course detail payload;
- account course detail payload;
- account course payload returned after lesson completion.

stage82_8_public_payload_blocks=yes
stage82_8_account_payload_blocks=yes
stage82_8_frontend_changed=no
stage82_8_backend_changed=yes
stage82_8_database_changed=no
stage82_8_database_migration_required=no

## Safety

- no database migration;
- no schema destructive changes;
- frontend already supports `blocks`, `lesson_blocks`, `content_blocks` from Stage 82.7;
- inactive lesson blocks are not exposed to learners;
- existing legacy lesson fields remain in the payload.

## Acceptance

Stage 82.8 is accepted when:

- release manifest guard passes;
- stage guard passes;
- source/text guards pass;
- targeted backend API tests pass;
- `git diff --check` passes;
- backend health remains OK after backend-only deploy.
