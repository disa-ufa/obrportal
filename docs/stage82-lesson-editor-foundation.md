# Stage 82.1 - lesson editor foundation

stage82_1_status=lesson_editor_foundation_ready
stage82_1_release_manifest_required=yes
stage82_1_guard_required=yes
stage82_1_server_touched=no
stage82_1_data_changed=no
stage82_1_runtime_rebuild=no
stage82_1_runtime_restart=no
stage82_1_database_migration_run=no
stage82_1_cleanup_performed=no
stage82_1_decision=prepare_block_based_lesson_editor_architecture
stage82_1_next_stage=82.2

## Scope

Stage 82.1 defines the architecture, UX contract, data model direction, rollout boundaries, and acceptance criteria for the new block-based lesson editor.

This stage is documentation and guard only. It does not change backend runtime, frontend runtime, database schema, production data, Docker images, or production containers.

## Current problem

The current lesson editor is form-based. A lesson has one selected `content_type`, one `content_text`, and one `content_url`.

That model works for a simple text, video, file, link, or assignment lesson, but it does not support a modern mixed lesson where text, video, test, file, assignment, callout, and supporting material can exist together inside one lesson.

## Product decision

Keep the current domain hierarchy:

- `Course`;
- `CourseModule`;
- `CourseLesson`.

Change the internal lesson content model:

- `CourseLesson` remains the learner-visible unit of progress;
- one lesson may contain many ordered content blocks;
- old legacy lessons must continue to render;
- new lessons should use block mode.

The target model is:

`Course -> Module -> Lesson -> LessonBlock[]`

## Non-goals for Stage 82.1

- no database migration;
- no backend endpoint implementation;
- no frontend editor implementation;
- no production deploy;
- no data migration;
- no runtime restart;
- no direct SQL mutation;
- no removal of legacy lesson fields.

## MVP block types

The first implementation must focus on a small, stable set of blocks:

1. `rich_text` - formatted educational text;
2. `video` - embedded or linked video with optional description;
3. `file_link` - file, external link, downloadable material;
4. `quiz` - simple inline test;
5. `assignment` - practical task or instruction;
6. `callout` - note, warning, important information.

stage82_1_mvp_block_types=rich_text,video,file_link,quiz,assignment,callout

## Planned database model

Stage 82.2 should use additive migrations only.

### `course_lessons` additions

Recommended fields:

- `editor_mode`: `legacy` or `block`;
- `status`: `draft`, `published`, `archived`;
- `published_version_id`: reference to selected version snapshot.

Legacy fields remain:

- `content_type`;
- `content_url`;
- `content_text`.

Do not drop these fields during the MVP rollout.

### `lesson_blocks`

Recommended table:

- `id`;
- `lesson_id`;
- `block_type`;
- `position`;
- `title`;
- `content_json`;
- `settings_json`;
- `is_required`;
- `is_active`;
- `created_at`;
- `updated_at`.

### `lesson_versions`

Recommended table:

- `id`;
- `lesson_id`;
- `version_number`;
- `snapshot_json`;
- `created_by_user_id`;
- `created_at`;
- `publish_note`.

### Later tables, not MVP foundation

- `media_assets`;
- `quizzes`;
- `quiz_questions`;
- `quiz_attempts`;
- `assignments`;
- `assignment_submissions`;
- `lesson_templates`;
- `library_items`.

## Backward compatibility

Backward compatibility is mandatory.

Legacy mapping:

- `content_type=text` -> synthetic `rich_text` block;
- `content_type=video` -> synthetic `video` block;
- `content_type=file` -> synthetic `file_link` block;
- `content_type=link` -> synthetic `file_link` block;
- `content_type=assignment` -> synthetic `assignment` block.

Rules:

1. Existing lessons continue to work in learner cabinet.
2. Existing admin forms continue to load legacy lessons.
3. The new editor can display legacy lessons as synthetic blocks.
4. First real block edit may switch `editor_mode` from `legacy` to `block`.
5. Legacy fields are preserved for at least one full release cycle.
6. No destructive migration is allowed in MVP.

stage82_1_backward_compatibility=legacy_dual_read_synthetic_blocks

## Planned backend API

Stage 82.3 should introduce the editor API:

- `GET /api/v1/admin/course-lessons/{lesson_id}/editor`;
- `PATCH /api/v1/admin/course-lessons/{lesson_id}`;
- `POST /api/v1/admin/course-lessons/{lesson_id}/blocks`;
- `PATCH /api/v1/admin/course-lessons/{lesson_id}/blocks/{block_id}`;
- `DELETE /api/v1/admin/course-lessons/{lesson_id}/blocks/{block_id}`;
- `POST /api/v1/admin/course-lessons/{lesson_id}/blocks/reorder`;
- `POST /api/v1/admin/course-lessons/{lesson_id}/publish`;
- `POST /api/v1/admin/course-lessons/{lesson_id}/unpublish`;
- `GET /api/v1/admin/course-lessons/{lesson_id}/versions`;
- `POST /api/v1/admin/course-lessons/{lesson_id}/versions/{version_id}/restore`.

## Planned frontend UX

The target editor must move from a single form to a three-zone workspace.

### Left panel

Course outline:

- course title;
- modules;
- lessons;
- status chips;
- quick add lesson;
- quick add module;
- active lesson indicator.

### Center canvas

Lesson canvas:

- ordered blocks;
- add block between blocks;
- duplicate block;
- remove block;
- reorder block;
- empty-state guidance;
- publication diagnostics.

### Right panel

Properties panel:

- selected block settings;
- required / active toggles;
- block title;
- block-specific fields;
- accessibility hints;
- validation errors.

### Top toolbar

- save;
- autosave status;
- preview;
- publish;
- history;
- back to course;
- mobile preview.

stage82_1_editor_layout=outline_canvas_properties

## Publication model

Target states:

- `draft`;
- `published`;
- `has_unpublished_changes`;
- `archived`.

Rules:

1. Learners see only published content.
2. Admins/editors can work with draft content.
3. Publishing creates a version snapshot.
4. Restore from version is possible after Stage 82.6.
5. Draft changes must not break learner progress.

stage82_1_publication_model=draft_publish_version_snapshot

## Learner rendering model

The learner lesson page should render the lesson as a sequence of blocks:

- lesson title;
- lesson description;
- progress hint;
- content blocks;
- completion action;
- document/course completion continuity.

MVP learner completion may keep the existing lesson-level completion behavior.

Later versions may track block-level progress, quiz passing, assignment submission, and conditional completion.

## Accessibility and safety requirements

The editor and renderer must include:

- XSS-safe rich text rendering;
- allowlist for embeds;
- file type validation;
- alt text for images later;
- transcript/caption fields for video later;
- keyboard-friendly block operations;
- clear validation messages;
- role-based permissions;
- audit trail for publish and restore actions.

stage82_1_security_policy=xss_safe_allowlist_embeds_no_raw_html_by_default

## Rollout strategy

Use an additive, feature-flag-friendly rollout:

1. Stage 82.1 - architecture and guard foundation.
2. Stage 82.2 - additive database model.
3. Stage 82.3 - backend block API and legacy adapter.
4. Stage 82.4 - admin editor shell.
5. Stage 82.5 - block CRUD UI and renderer.
6. Stage 82.6 - draft/publish/version snapshots.
7. Stage 82.7 - learner renderer for block lessons.
8. Stage 82.8 - quiz MVP.
9. Stage 82.9 - assignment MVP.
10. Stage 82.10 - media library and template preparation.

stage82_1_rollout_strategy=additive_feature_flag_friendly

## Stage 82.2 implementation target

Stage 82.2 should create only backend-safe schema foundation:

- Alembic migration for additive columns and `lesson_blocks`;
- SQLAlchemy model `LessonBlock`;
- schemas for lesson block payloads;
- service-level validation;
- no UI switch yet;
- existing learner flow must remain unchanged.

## Acceptance

Stage 82.1 is accepted when:

- the lesson editor architecture is documented;
- MVP block types are fixed;
- backward compatibility rules are documented;
- planned backend API is documented;
- planned frontend UX is documented;
- rollout stages are documented;
- production checkpoint remains Stage 81.15;
- no production data changes are recorded;
- no runtime rebuild or restart is required;
- no database migration is run;
- guard script validates all critical markers.
