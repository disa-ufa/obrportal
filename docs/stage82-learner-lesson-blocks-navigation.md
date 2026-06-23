# Stage 82.10 - learner lesson blocks navigation

stage82_10_status=learner_lesson_blocks_navigation_implemented
stage82_10_release_manifest_required=yes
stage82_10_guard_required=yes
stage82_10_frontend_changed=yes
stage82_10_backend_changed=no
stage82_10_server_touched=no
stage82_10_data_changed=no
stage82_10_runtime_rebuild_required=yes
stage82_10_runtime_restart_required=yes
stage82_10_database_migration_required=no
stage82_10_cleanup_performed=no
stage82_10_decision=add_selected_lesson_navigation
stage82_10_next_stage=82.11

## Scope

Stage 82.10 adds learner-side lesson navigation to the lesson block viewer.

After Stage 82.8 connected real lesson blocks to public/account API payloads and Stage 82.9 protected the viewer contract, this stage lets the learner select a concrete lesson and see the blocks for that selected lesson.

## Implemented behavior

- added `selectedLessonId` state to `CourseDetailPage`;
- added automatic default selection of the first available/incomplete lesson;
- added learner lesson navigation inside the block viewer panel;
- the content preview panel follows the selected lesson;
- the block viewer follows the selected lesson;
- the lesson completion action follows the selected lesson;
- inactive lessons are disabled in navigation;
- completed lessons are marked in navigation;
- selected lesson is visually highlighted.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.10 is accepted when:

- Stage 82.10 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
