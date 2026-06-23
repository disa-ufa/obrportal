# Stage 82.12 - learner lesson progress states

stage82_12_status=learner_lesson_progress_states_implemented
stage82_12_release_manifest_required=yes
stage82_12_guard_required=yes
stage82_12_frontend_changed=yes
stage82_12_backend_changed=no
stage82_12_server_touched=no
stage82_12_data_changed=no
stage82_12_runtime_rebuild_required=yes
stage82_12_runtime_restart_required=yes
stage82_12_database_migration_required=no
stage82_12_cleanup_performed=no
stage82_12_decision=show_lesson_progress_states
stage82_12_next_stage=82.13

## Scope

Stage 82.12 adds learner-facing lesson progress states.

The backend already returns lesson completion fields in account course detail payloads:
`is_completed` and `completed_at`. This stage uses the existing payload and keeps the implementation frontend-only.

## Implemented behavior

- added selected lesson progress state labels;
- added states: not started, in progress, completed, unavailable;
- lesson navigation now shows progress state for every lesson;
- selected lesson shows `Выбранный урок · <статус>`;
- block viewer summary shows selected lesson progress state;
- completion action panel shows selected lesson progress state;
- completion note now reflects whether the lesson can be marked as completed.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.12 is accepted when:

- Stage 82.12 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
