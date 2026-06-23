# Stage 82.9 - lesson blocks viewer contract

stage82_9_status=lesson_blocks_viewer_contract_implemented
stage82_9_release_manifest_required=yes
stage82_9_guard_required=yes
stage82_9_server_touched=no
stage82_9_data_changed=no
stage82_9_runtime_rebuild_required=no
stage82_9_runtime_restart_required=no
stage82_9_database_migration_required=no
stage82_9_cleanup_performed=no
stage82_9_decision=protect_lesson_blocks_viewer_contract
stage82_9_next_stage=82.10

## Scope

Stage 82.9 locks the learner lesson block viewer contract after Stage 82.8 connected real lesson blocks to public/account API payloads.

No runtime code is changed in this stage. The stage adds guard coverage for the existing viewer behavior:

- account course detail modules override public course modules for enrolled users;
- learner viewer reads `blocks`, `lesson_blocks`, and `content_blocks`;
- inactive blocks are hidden;
- blocks are sorted by `position`;
- locked lessons do not reveal block content;
- legacy lesson fields still have a fallback adapter;
- supported learner block types stay covered.

stage82_9_frontend_changed=no
stage82_9_backend_changed=no
stage82_9_contract_guard_added=yes
stage82_9_database_changed=no
stage82_9_database_migration_required=no

## Safety

- no backend restart required;
- no frontend rebuild required for production;
- no database migration;
- no data changes;
- no destructive operations.

## Acceptance

Stage 82.9 is accepted when:

- release manifest guard passes;
- stage guard passes;
- source/text guards pass;
- `git diff --check` passes.
