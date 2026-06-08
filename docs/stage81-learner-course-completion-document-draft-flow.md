# Stage 81.8 - Learner course completion and document draft flow completed

stage81_8_status=production_completed
stage81_8_release_manifest_required=yes
stage81_8_guard_required=yes
stage81_8_backend_runtime_changed=no
stage81_8_frontend_runtime_changed=no
stage81_8_database_migration_run=no
stage81_8_production_data_changed=yes
stage81_8_course_completion_verified=yes
stage81_8_auto_document_draft_created=yes
stage81_8_document_generation_event_created=yes
stage81_8_document_status=draft
stage81_8_document_publication_deferred=yes
stage81_8_document_download_deferred_until_publication=yes
stage81_8_next_stage=81.9

## Scope

Stage 81.8 verifies the learner-side course completion and automatic draft document creation flow on production.

This stage includes:

- production preflight with backup;
- learner course completion through the account UI;
- automatic draft certificate creation after course completion;
- automatic document generation event creation;
- learner account UI verification of completed course and awaiting-publication document block;
- database verification of completed enrollment and generated draft document;
- no backend runtime changes;
- no frontend runtime changes;
- no database migrations;
- no document publication.

## Production runtime evidence

Production was verified on host `portal.rcdo02.ru`.

Recorded runtime state:

- server head before docs finalization: `3cc71bc`;
- tag at head: `v0.1.0-stage81-7-learner-course-access-progress`;
- frontend: healthy;
- backend: running;
- PostgreSQL: healthy;
- Redis: healthy;
- MinIO: healthy;
- ready endpoint: `database=ok`, `redis=ok`, `storage=ok`.

Route checks:

- `/`: 200;
- `/login`: 200;
- `/account`: 200;
- `/catalog`: 200;
- `/courses/testov-programma`: 200.

## Preflight

Preflight report:

- `/opt/obrportal/tmp/stage81_8_learner_course_completion_document_draft_preflight_20260608T190450Z.txt`.

Backup:

- `/opt/obrportal-backups/postgres/postgres-before-stage81-8-course-completion-document-draft-20260608T190450Z.sql`;
- backup size: 93K;
- `postgres_backup_verified=yes`.

Initial preflight state:

- users: 3;
- courses: 2;
- course_modules: 1;
- course_lessons: 1;
- organizations: 1;
- enrollments: 1;
- lesson_progress: 1;
- document_records: 0;
- document_generation_events: 0.

Target enrollment before completion:

- enrollment id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- learner: `stage12-smoke-learner@obrportal.local`;
- course: `testov-programma`;
- status: `active`;
- started_at: `2026-06-08 18:31:20.951852+00`;
- completed_at: empty.

Required lesson before completion:

- lesson progress id: `722a300b-3923-4d22-b7dc-1dec3a80c69a`;
- lesson id: `97ba3967-5aee-4e0f-86ad-c9b867e8ee6d`;
- lesson title: `Знакомство с порталом`;
- status: `completed`.

## Completion flow

The first completion check recorded a click marker, but the database still showed:

- `enrollment.status = active`;
- `document_records = 0`.

This was recorded as a non-final click attempt:

- `stage81_8_course_completion_verified=no`;
- `stage81_8_retry_course_completion_required=yes`.

The retry through the learner UI completed successfully.

Final enrollment state:

- enrollment id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- status: `completed`;
- completed_at: `2026-06-08 19:16:52.893906+00`.

## Generated draft document

Document record created automatically after course completion:

- document id: `85025ef8-2f44-40a9-8e9c-fb96899d6c72`;
- user: `stage12-smoke-learner@obrportal.local`;
- course: `testov-programma`;
- enrollment id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- document number: `AUTO-4AAA9C328B7C476D`;
- document type: `Сертификат`;
- title: `Сертификат: тестовая программа`;
- status: `draft`;
- verification code: `DOCV-36F38F4FABBB45A38EE0E918`;
- storage path: `generated/completion/AUTO-4AAA9C328B7C476D/20260608T191653319916Z-fe57afe4.pdf`;
- generated_at: `2026-06-08 19:16:53.321681+00`;
- generation source: `auto_completion`;
- template version: `completion_pdf_v1`.

Document generation event:

- event id: `387543fa-81f0-4110-9047-f314b10a8204`;
- document id: `85025ef8-2f44-40a9-8e9c-fb96899d6c72`;
- document number: `AUTO-4AAA9C328B7C476D`;
- document status: `draft`;
- source: `auto_completion`;
- template version: `completion_pdf_v1`.

## Learner account UI verification

The learner account UI was verified after completion.

Observed UI state:

- course status: completed;
- completed at: `09.06.2026 00:16:52`;
- final document block is visible;
- document status: awaiting publication;
- document message: document generated and waiting admin publication;
- document number: `AUTO-4AAA9C328B7C476D`;
- verification code: `DOCV-36F38F4FABBB45A38EE0E918`;
- download before publication: not available.

## Final database state

Final counts:

- lesson_progress: 1;
- document_records: 1;
- document_generation_events: 1.

Final target state:

- `enrollment.status = completed`;
- `document_records.status = draft`;
- `document_generation_events.source = auto_completion`.

## Deferred publication

Stage 81.8 intentionally did not publish the document.

Deferred to Stage 81.9:

- admin review of draft document;
- document publication decision;
- verify download after publication;
- verify public verification route;
- verify QR / verification code flow if included.

## Safety notes

Stage 81.8 did not use:

- `docker compose down -v`;
- volume reset;
- database migration;
- backend rebuild;
- frontend rebuild;
- direct SQL completion update;
- direct SQL document insert;
- admin document publication;
- document revocation.

All production data changes came through the application UI flow.

## Acceptance

Stage 81.8 is accepted when:

- release manifest current_stage is 81.8;
- production checkpoint is updated to Stage 81.8;
- enrollment completion is verified;
- automatic draft document creation is verified;
- document generation event creation is verified;
- learner account UI shows the completed course and awaiting-publication document;
- document status remains draft;
- document publication is deferred to Stage 81.9;
- ready endpoint is ok;
- public and account routes are 200.
