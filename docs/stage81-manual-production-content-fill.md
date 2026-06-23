# Stage 81.6 - Manual production content fill completed

stage81_6_manual_production_content_fill_status=production_completed
stage81_6_release_manifest_required=yes
stage81_6_guard_required=yes
stage81_6_runtime_frontend_hotfix_deployed=yes
stage81_6_backend_runtime_changes=no
stage81_6_database_migration_run=no
stage81_6_production_data_changed=yes
stage81_6_manual_ui_content_fill=yes
stage81_6_sql_content_fill_allowed=no
stage81_6_seed_content_fill_allowed=no
stage81_6_course_created=yes
stage81_6_module_created=yes
stage81_6_lesson_created=yes
stage81_6_enrollment_created=yes
stage81_6_lesson_progress_created=no
stage81_6_document_records_created=no
stage81_6_next_stage=81.7

## Scope

Stage 81.6 records the controlled manual production content fill through the admin UI.

This stage includes:

- one frontend hotfix deployed to production;
- manual content fill through the admin UI;
- no backend runtime changes;
- no database migrations;
- no direct SQL content inserts;
- no seed-based content fill;
- no document issuance.

## Production runtime evidence

Production was verified after the frontend hotfix and after manual content fill.

Recorded runtime state:

- server head: `9544704`;
- frontend: healthy;
- backend: running;
- PostgreSQL: healthy;
- Redis: healthy;
- MinIO: healthy;
- ready endpoint: `database=ok`, `redis=ok`, `storage=ok`.

Public and admin route checks:

- `/`: 200;
- `/catalog`: 200;
- `/courses/testov-programma`: 200;
- `/admin/courses`: 200;
- `/admin/enrollments`: 200;
- `/account`: 200.

## Frontend hotfix

During manual course creation, the production admin courses page showed a white screen after a first course was created.

Root cause:

- `adminLinkClass` was referenced in `AdminCoursesPage.jsx`;
- the constant was not defined.

Fix:

- commit `9544704`;
- message: `fix: define admin course link class`;
- deployed as frontend-only runtime hotfix;
- backend, database, Redis and MinIO were not rebuilt or reset.

## Manual production data created

Target course:

- slug: `testov-programma`;
- title: `тестовая программа`;
- active: yes;
- hours: 10;
- format: `очно-заочл`;
- document type: `Сертификат`.

Target organization:

- name: `тестовая организация`.

Course structure:

- modules: 1;
- active modules: 1;
- lessons: 1;
- active lessons: 1;
- required lessons: 1;
- active required lessons: 1.

Target module:

- title: `Основной модуль`;
- position: 1;
- active: yes.

Target lesson:

- title: `Знакомство с порталом`;
- position: 1;
- content type: `text`;
- required: yes;
- active: yes.

Target enrollment:

- user: `stage12-smoke-learner@obrportal.local`;
- course: `testov-programma`;
- organization: `тестовая организация`;
- status: `assigned`;
- learning group: empty.

## Final table counts

Final counts recorded after Stage 81.6 core flow:

- courses: 2;
- course_modules: 1;
- course_lessons: 1;
- organizations: 1;
- learning_groups: 0;
- enrollments: 1;
- lesson_progress: 0;
- document_records: 0.

## Visual verification

The admin enrollments page was visually verified:

- total enrollments: 1;
- new assigned enrollments: 1;
- course assignment is visible on the main admin enrollments page.

A sidebar enrollments badge mismatch was observed and recorded as a non-blocking UI counter follow-up.

## Safety notes

Stage 81.6 did not use:

- `docker compose down -v`;
- volume reset;
- direct SQL inserts for production content;
- direct SQL cleanup;
- production seed command;
- database migration;
- backend rebuild.

## Acceptance

Stage 81.6 is accepted when:

- release manifest current_stage is 81.6;
- production checkpoint is updated to Stage 81.6;
- frontend hotfix is recorded;
- manual UI content fill is recorded;
- target course has one active module and one active required lesson;
- target user has one assigned enrollment;
- lesson progress remains empty;
- document records remain empty;
- ready endpoint is ok;
- public and admin routes are 200;
- next stage is 81.7.
