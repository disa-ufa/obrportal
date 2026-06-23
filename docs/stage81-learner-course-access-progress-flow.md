# Stage 81.7 - Learner course access and progress flow completed

stage81_7_status=production_completed
stage81_7_release_manifest_required=yes
stage81_7_guard_required=yes
stage81_7_runtime_frontend_hotfix_deployed=yes
stage81_7_backend_runtime_changes=no
stage81_7_database_migration_run=no
stage81_7_production_data_changed=yes
stage81_7_learner_login_verified=yes
stage81_7_account_ui_verified=yes
stage81_7_course_start_verified=yes
stage81_7_course_outline_verified=yes
stage81_7_lesson_completion_verified=yes
stage81_7_progress_100_verified=yes
stage81_7_document_records_created=no
stage81_7_course_completion_deferred=yes
stage81_7_next_stage=81.8

## Scope

Stage 81.7 verifies the learner-side course access and progress flow on production.

This stage includes:

- learner password reset through admin UI without exposing the password;
- learner login verification;
- account page runtime hotfix;
- frontend-only production deploy;
- learner course start through UI;
- learner course outline opening through UI;
- required lesson completion through UI;
- database verification of lesson progress;
- no backend runtime changes;
- no database migrations;
- no course completion;
- no document generation.

## Production runtime evidence

Production was verified after the account hotfix and after learner progress actions.

Recorded runtime state:

- server head: `3999e6b`;
- frontend: healthy;
- backend: running;
- PostgreSQL: healthy;
- Redis: healthy;
- MinIO: healthy;
- ready endpoint: `database=ok`, `redis=ok`, `storage=ok`.

Public and account route checks:

- `/`: 200;
- `/login`: 200;
- `/account`: 200;
- `/catalog`: 200;
- `/courses/testov-programma`: 200.

## Preflight

Preflight report:

- `/opt/obrportal/tmp/stage81_7_learner_course_access_progress_preflight_20260608T180441Z.txt`.

Backup:

- `/opt/obrportal-backups/postgres/postgres-before-stage81-7-learner-flow-20260608T180441Z.sql`;
- backup size: 88K;
- `postgres_backup_verified=yes`.

Initial preflight counts:

- users: 3;
- courses: 2;
- course_modules: 1;
- course_lessons: 1;
- organizations: 1;
- enrollments: 1;
- lesson_progress: 0;
- document_records: 0.

## Frontend hotfix

During learner login verification, `/account` showed a white screen.

Root cause:

- `AccountPage.jsx` called `countWhere(...)`;
- the helper was missing.

Fix:

- commit `3999e6b`;
- message: `fix: define account count helper`;
- file: `frontend/src/pages/AccountPage.jsx`;
- deployed as frontend-only runtime hotfix;
- backend, database, Redis and MinIO were not rebuilt or reset.

## Learner account verification

Learner:

- `stage12-smoke-learner@obrportal.local`;
- role: `learner_fl`;
- account is active.

The learner account page was verified after the hotfix:

- account UI loaded;
- authenticated learner verified;
- enrollments count: 1;
- assigned courses before start: 1;
- active courses before start: 0;
- completed courses: 0;
- documents available: 0;
- document drafts: 0;
- white screen fixed.

## Learner course flow

Target enrollment:

- enrollment id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- learner: `stage12-smoke-learner@obrportal.local`;
- course: `testov-programma`;
- initial status: `assigned`;
- final Stage 81.7 status: `active`.

Target lesson:

- lesson id: `97ba3967-5aee-4e0f-86ad-c9b867e8ee6d`;
- lesson title: `Знакомство с порталом`;
- module title: `Основной модуль`;
- required: yes;
- active: yes.

UI actions completed:

- learner logged in;
- learner opened account;
- learner started the assigned course;
- learner opened the course outline;
- learner marked the required lesson as completed;
- UI progress reached 100%;
- required lesson progress reached 1/1.

## Final database state

Final database state recorded after learner progress:

- `enrollment.status = active`;
- `enrollment.started_at` is set;
- `enrollment.completed_at` is empty;
- `lesson_progress = 1`;
- `lesson_progress.status = completed`;
- `document_records = 0`.

Lesson progress row:

- id: `722a300b-3923-4d22-b7dc-1dec3a80c69a`;
- enrollment id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- lesson id: `97ba3967-5aee-4e0f-86ad-c9b867e8ee6d`;
- status: `completed`.

## Deferred work

Stage 81.7 intentionally did not click course completion.

Deferred to Stage 81.8:

- complete course;
- generate document draft;
- verify document record;
- verify learner document visibility;
- decide publication flow.

## Safety notes

Stage 81.7 did not use:

- `docker compose down -v`;
- volume reset;
- database migration;
- backend rebuild;
- direct SQL inserts for learner progress;
- direct SQL update of progress;
- direct SQL document generation;
- course completion;
- document issuance.

Password reset safety:

- learner password was reset through admin UI;
- password was not printed;
- password was not stored in report;
- password was not written to repository.

## Acceptance

Stage 81.7 is accepted when:

- release manifest current_stage is 81.7;
- production checkpoint is updated to Stage 81.7;
- frontend hotfix commit is recorded;
- learner login is verified;
- account UI is verified;
- course start is verified;
- course outline is verified;
- lesson completion is verified;
- progress is 100%;
- document_records remains 0;
- course completion is deferred to Stage 81.8;
- ready endpoint is ok;
- public and account routes are 200.
