# Stage 81.10 - Production inventory and next block plan

stage81_10_status=production_inventory_completed
stage81_10_release_manifest_required=yes
stage81_10_guard_required=yes
stage81_10_backup_created=yes
stage81_10_data_changed=no
stage81_10_migrations_run=no
stage81_10_containers_restarted=no
stage81_10_cleanup_performed=no
stage81_10_decision=keep_demo_smoke_dataset
stage81_10_next_stage=81.11

## Scope

Stage 81.10 records the current production state after the document publication flow and decides what to do with demo/smoke data.

No runtime functionality was changed in this stage.

## Production checkpoint

Production host:

- `portal.rcdo02.ru`;
- `89.127.203.70`.

Git state:

- branch: `develop`;
- head: `956c680`;
- tag at head: `v0.1.0-stage81-9-document-publication-verification`.

Health checks:

- `/api/v1/ready`: ok;
- `/`: 200;
- `/login`: 200;
- `/account`: 200;
- `/admin`: 200;
- `/admin/documents`: 200;
- `/catalog`: 200;
- `/courses/testov-programma`: 200;
- `/verify/DOCV-36F38F4FABBB45A38EE0E918`: 200;
- `/verify/AUTO-4AAA9C328B7C476D`: 200.

## Backup

Preflight report:

- `/opt/obrportal/tmp/stage81_10_production_inventory_next_block_preflight_20260609T063543Z.txt`.

PostgreSQL backup:

- `/opt/obrportal-backups/postgres/postgres-before-stage81-10-production-inventory-next-block-20260609T063543Z.sql`;
- size: 101K;
- `postgres_backup_verified=yes`.

## Inventory counts

Production counts at Stage 81.10 preflight:

- users: 3;
- roles: 9;
- permissions: 43;
- user_roles: 2;
- organizations: 1;
- courses: 2;
- course_modules: 1;
- course_lessons: 1;
- learning_groups: 0;
- enrollments: 1;
- lesson_progress: 1;
- document_records: 1;
- document_generation_events: 2;
- audit_events: 93.

## Users

Current users:

- inactive blocked seed artifact:
  - id: `3e030fbc-c763-4fdc-81bc-3ce7ebae8717`;
  - email: `\recho "Enter REAL production admin password. Input will be hidden:"`;
  - full_name: `Blocked invalid admin seed attempt`;
  - is_active: false.
- production admin:
  - id: `d9e09af5-da90-4f9f-aef6-01b990293383`;
  - email: `denisyxxx@mail.ru`;
  - full_name: `Администратор ObrPortal`;
  - is_active: true.
- smoke learner:
  - id: `2fd965f0-86fa-41e3-a648-37758acc0976`;
  - email: `stage12-smoke-learner@obrportal.local`;
  - full_name: `Тестовый пользователь`;
  - is_active: true.

## Organizations

Current organization:

- id: `5030179d-6b15-4d4f-8d59-105ea5579cd2`;
- name: `тестовая организация`;
- inn: `22222222222`;
- kpp: `111111111`;
- ogrn: `1111111111`.

## Courses

Current courses:

- smoke course:
  - id: `20484992-3bff-48c3-b82a-75e099199695`;
  - slug: `testov-programma`;
  - title: `тестовая программа`;
  - hours: 10;
  - format: `очно-заочл`;
  - document_type: `Сертификат`;
  - is_active: true.
- extra test course without modules:
  - id: `aa2f8886-d597-4392-8189-ec4395f16a29`;
  - slug: `test-prog`;
  - title: `тестовая программа`;
  - hours: 10;
  - format: `заочно`;
  - document_type: `Сертификат`;
  - is_active: true.

## Smoke learning structure

Module:

- id: `60109eba-20b9-445f-8ec1-d2d51c5b1b9d`;
- course_slug: `testov-programma`;
- title: `Основной модуль`;
- position: 1;
- is_active: true.

Lesson:

- id: `97ba3967-5aee-4e0f-86ad-c9b867e8ee6d`;
- course_slug: `testov-programma`;
- module_title: `Основной модуль`;
- title: `Знакомство с порталом`;
- content_type: `text`;
- position: 1;
- is_required: true;
- is_active: true.

## Smoke enrollment and progress

Enrollment:

- id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- user: `stage12-smoke-learner@obrportal.local`;
- course_slug: `testov-programma`;
- organization: `тестовая организация`;
- status: `completed`;
- completed_at: `2026-06-08 19:16:52.893906+00`.

Lesson progress:

- id: `722a300b-3923-4d22-b7dc-1dec3a80c69a`;
- enrollment_id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- lesson_title: `Знакомство с порталом`;
- status: `completed`;
- completed_at: `2026-06-08 18:31:40.328173+00`.

## Published smoke document

Document:

- id: `85025ef8-2f44-40a9-8e9c-fb96899d6c72`;
- user: `stage12-smoke-learner@obrportal.local`;
- course_slug: `testov-programma`;
- enrollment_id: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- document_number: `AUTO-4AAA9C328B7C476D`;
- document_type: `Сертификат`;
- title: `Сертификат: тестовая программа`;
- status: `available`;
- storage_path: `generated/completion/AUTO-4AAA9C328B7C476D/20260609T061121978528Z-5c28c979.pdf`;
- verification_code: `DOCV-36F38F4FABBB45A38EE0E918`;
- generated_at: `2026-06-09 06:11:21.979578+00`;
- generated_by_user_id: `d9e09af5-da90-4f9f-aef6-01b990293383`;
- generation_source: `admin_regenerate`;
- generation_template_version: `completion_pdf_v1`.

Generation events:

- `387543fa-81f0-4110-9047-f314b10a8204`:
  - source: `auto_completion`;
  - storage_path: `generated/completion/AUTO-4AAA9C328B7C476D/20260608T191653319916Z-fe57afe4.pdf`.
- `a2105fde-e1f9-40e5-adcd-51acbfd04dc3`:
  - source: `admin_regenerate`;
  - storage_path: `generated/completion/AUTO-4AAA9C328B7C476D/20260609T061121978528Z-5c28c979.pdf`.

## Decision

Decision for Stage 81.10:

- keep the current smoke dataset;
- do not delete the smoke learner;
- do not delete the smoke course;
- do not delete the published smoke document;
- do not delete PDF generation history;
- do not delete the inactive blocked seed artifact in this stage;
- do not delete the extra `test-prog` course in this stage.

Reason:

- the smoke dataset confirms the full production flow end-to-end;
- it gives a stable reference for future regression checks;
- cleanup should be a separate stage with explicit acceptance criteria and backup.

## Deferred cleanup candidates

The following records may be considered later, but were intentionally not touched in Stage 81.10:

- inactive blocked seed artifact user:
  - `3e030fbc-c763-4fdc-81bc-3ce7ebae8717`;
- extra active test course without modules:
  - `aa2f8886-d597-4392-8189-ec4395f16a29`;
  - slug `test-prog`.

## Safety notes

Stage 81.10 did not use:

- `docker compose down -v`;
- database cleanup;
- direct SQL mutation;
- migrations;
- backend restart;
- frontend restart;
- volume reset.

Stage 81.10 only used:

- inventory queries;
- backup creation;
- route checks;
- documentation/manifest finalization.

## Acceptance

Stage 81.10 is accepted when:

- release manifest current_stage is `81.10`;
- production checkpoint points to head `956c680`;
- preflight report path is recorded;
- backup path is recorded;
- inventory counts are recorded;
- decision is `keep_demo_smoke_dataset`;
- cleanup is recorded as not performed;
- migrations are recorded as not run;
- containers are recorded as not restarted;
- next stage is `81.11`.
