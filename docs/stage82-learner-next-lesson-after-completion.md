# Stage 82.13 - learner next lesson after completion

stage82_13_status=learner_next_lesson_after_completion_implemented
stage82_13_release_manifest_required=yes
stage82_13_guard_required=yes
stage82_13_frontend_changed=yes
stage82_13_backend_changed=no
stage82_13_server_touched=no
stage82_13_data_changed=no
stage82_13_runtime_rebuild_required=yes
stage82_13_runtime_restart_required=yes
stage82_13_database_migration_required=no
stage82_13_cleanup_performed=no
stage82_13_decision=select_next_available_lesson_after_completion
stage82_13_next_stage=82.14

## Scope

Stage 82.13 improves the learner flow after marking a lesson as completed.

After the backend returns updated account course detail, the frontend now finds the next available not completed lesson and switches the selected lesson to it. If no next lesson exists, the interface stays on the completed lesson and tells the learner that all available lessons are completed.

## Implemented behavior

- added Stage 82.13 marker;
- added next lesson completion labels;
- added helper to find the next available not completed lesson;
- added helper to build completion success message;
- after successful lesson completion, selected lesson moves to the next available incomplete lesson;
- if there is no next lesson, selected lesson remains on the completed lesson;
- success message is now tied to the next lesson selection result.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.13 is accepted when:

- Stage 82.13 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
