# Stage 82.14 - learner course completion readiness

stage82_14_status=learner_course_completion_readiness_implemented
stage82_14_release_manifest_required=yes
stage82_14_guard_required=yes
stage82_14_frontend_changed=yes
stage82_14_backend_changed=no
stage82_14_server_touched=no
stage82_14_data_changed=no
stage82_14_runtime_rebuild_required=yes
stage82_14_runtime_restart_required=yes
stage82_14_database_migration_required=no
stage82_14_cleanup_performed=no
stage82_14_decision=show_course_completion_readiness
stage82_14_next_stage=82.15

## Scope

Stage 82.14 improves the learner-facing course completion block.

The backend already returns progress fields and protects course completion from premature completion:
`required_lessons_total`, `required_lessons_completed`, `progress_percent`, `required_progress_percent`.

This stage uses the existing payload and remains frontend-only.

## Implemented behavior

- added Stage 82.14 marker;
- added learner course completion readiness labels;
- added readiness states: ready, locked, completed, no enrollment;
- added readiness card in course completion summary;
- added readiness panel with clear learner guidance;
- added remaining required lessons list;
- added explicit empty state when no required lessons remain;
- made the course completion button more visually prominent when course is ready.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.14 is accepted when:

- Stage 82.14 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
