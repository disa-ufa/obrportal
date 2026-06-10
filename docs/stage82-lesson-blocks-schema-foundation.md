# Stage 82.2 - lesson blocks schema foundation

stage82_2_status=lesson_blocks_schema_foundation_implemented
stage82_2_release_manifest_required=yes
stage82_2_guard_required=yes
stage82_2_server_touched=no
stage82_2_data_changed=no
stage82_2_runtime_rebuild_required=yes_for_deploy
stage82_2_runtime_restart_required=yes_for_deploy
stage82_2_database_migration_required=yes_for_deploy
stage82_2_cleanup_performed=no
stage82_2_decision=implement_backend_safe_lesson_blocks_schema_foundation
stage82_2_next_stage=82.3

## Scope

Stage 82.2 adds the backend-safe schema foundation for the future block-based lesson editor.

This stage introduces additive backend code and an additive Alembic migration. It does not switch the frontend editor UI and does not remove legacy lesson fields.

## Implemented database foundation

Migration: `6422_lesson_blocks_schema_foundation.py`.

Additive `course_lessons` fields:

- `editor_mode`;
- `status`;
- `published_version_id`.

New table:

- `lesson_blocks`.

The migration is additive and preserves:

- `content_type`;
- `content_url`;
- `content_text`.

stage82_2_legacy_fields_preserved=yes
stage82_2_new_table=lesson_blocks
stage82_2_migration=6422_lesson_blocks_schema

## Implemented backend model foundation

New SQLAlchemy model:

- `app.models.lesson_block.LessonBlock`.

Extended model:

- `app.models.course_lesson.CourseLesson.editor_mode`;
- `app.models.course_lesson.CourseLesson.status`;
- `app.models.course_lesson.CourseLesson.published_version_id`.

## Implemented schema foundation

Admin schemas now have a first contract for:

- `AdminLessonBlockItem`;
- `AdminLessonBlockDetail`;
- `AdminLessonBlockCreate`;
- `AdminLessonBlockUpdate`;
- `AdminLessonBlockReorder`;
- `AdminLessonBlockReorderItem`.

Existing course lesson schemas keep legacy fields and add editor metadata.

## Implemented validation foundation

New service:

- `app.services.lesson_blocks`.

Supported MVP block types:

- `rich_text`;
- `video`;
- `file_link`;
- `quiz`;
- `assignment`;
- `callout`.

stage82_2_mvp_block_types=rich_text,video,file_link,quiz,assignment,callout

Supported editor modes:

- `legacy`;
- `block`.

Supported publication statuses:

- `draft`;
- `published`;
- `archived`.

## Implemented legacy adapter foundation

Legacy content mapping:

- `content_type=text` -> `rich_text`;
- `content_type=video` -> `video`;
- `content_type=file` -> `file_link`;
- `content_type=link` -> `file_link`;
- `content_type=assignment` -> `assignment`.

The helper `build_synthetic_legacy_lesson_blocks` prepares old lessons for future editor rendering without destructive migration.

stage82_2_backward_compatibility=legacy_dual_read_synthetic_blocks

## Non-goals

- no frontend editor switch;
- no lesson blocks API endpoints yet;
- no learner block renderer yet;
- no destructive data migration;
- no removal of legacy fields;
- no direct SQL mutation outside Alembic migration during deploy.

## Deployment note

Because Stage 82.2 changes backend model columns, production deployment must be ordered:

1. create fresh database backup;
2. pull code;
3. run Alembic migration;
4. rebuild/restart backend only;
5. check health;
6. verify legacy lesson flow still works.

Do not restart frontend for this stage unless the deploy environment requires it.

## Acceptance

Stage 82.2 is accepted locally when:

- migration file exists;
- `LessonBlock` model exists;
- `CourseLesson` has editor foundation fields;
- admin schemas include lesson block schemas;
- validation service includes MVP block types;
- legacy synthetic block adapter exists;
- unit test passes;
- release manifest guard passes;
- Stage 82.1 remains recorded;
- no raw contacts or passwords are committed.
