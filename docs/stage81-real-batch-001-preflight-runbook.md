# Stage 81.14 - real-batch-001 production preflight runbook

stage81_14_status=real_batch_001_preflight_runbook_completed
stage81_14_release_manifest_required=yes
stage81_14_guard_required=yes
stage81_14_server_touched=no
stage81_14_data_changed=no
stage81_14_runtime_rebuild=no
stage81_14_runtime_restart=no
stage81_14_database_migration_run=no
stage81_14_cleanup_performed=no
stage81_14_batch_id=real-batch-001
stage81_14_decision=prepare_preflight_backup_duplicate_check_runbook
stage81_14_next_stage=81.15

## Scope

Stage 81.14 prepares the production preflight and data-entry runbook for `real-batch-001`.

This stage does not execute server commands, does not create production records, does not run migrations, and does not restart containers.

## Baseline

- runtime head: `6f82e93`;
- tag: `v0.1.0-stage81-13-real-batch-001-filled`;
- previous stage: `81.13`;
- previous decision: `commit_sanitized_batch_card_only`.

## Batch summary

- batch_id: `real-batch-001`;
- organization_short_name: `ГБОУ РЦДО`;
- course_slug: `znakomstvo-s-obrazovatelnym-portalom`;
- course_title: `Знакомство с образовательным порталом`;
- module_title: `Основной модуль`;
- lesson_title: `Введение в работу с образовательным порталом`;
- group_code: `REAL-BATCH-001`;
- document_type: `Сертификат`;
- signer_position: `директор`;
- signer_full_name: `Нуриев Фаниль Жамилевич`;
- data_entry_method: `admin_ui_first`;
- direct_sql_mutation_planned: `no`;
- smoke_dataset_policy: `keep_unchanged`.

## Sensitive values policy

Do not commit raw personal contact data.

Stage 81.15 may use runtime-only shell variables:

- `CURATOR_EMAIL`;
- `LEARNER_EMAIL`;
- `CURATOR_PHONE`;
- `LEARNER_PHONE`.

Do not store passwords in Git or in production reports.

## Stage 81.15 preflight commands

Run on server only in Stage 81.15.

1. Go to `/opt/obrportal`.
2. Create `REPORT=/opt/obrportal/tmp/stage81_15_real_batch_001_preflight_<utc>.txt`.
3. Create `BACKUP=/opt/obrportal-backups/postgres/postgres-before-stage81-15-real-batch-001-<utc>.sql`.
4. Record:
   - `stage81_15_batch_id=real-batch-001`;
   - `stage81_15_server_head=$(git rev-parse --short HEAD)`;
   - `stage81_15_tags_at_head=$(git tag --points-at HEAD)`;
   - `stage81_15_runtime_rebuild=no`;
   - `stage81_15_runtime_restart=no`;
   - `stage81_15_direct_sql_mutation_planned=no`;
   - `stage81_15_data_entry_method=admin_ui_first`.
5. Run:
   - `git status --short`;
   - `docker compose ps`;
   - `curl -fsS https://portal.rcdo02.ru/api/v1/ready`;
   - `curl -I https://portal.rcdo02.ru/admin`;
   - `curl -I https://portal.rcdo02.ru/admin/organizations`;
   - `curl -I https://portal.rcdo02.ru/admin/courses`;
   - `curl -I https://portal.rcdo02.ru/admin/users`;
   - `curl -I https://portal.rcdo02.ru/admin/groups`;
   - `curl -I https://portal.rcdo02.ru/admin/enrollments`;
   - `curl -I https://portal.rcdo02.ru/admin/documents`;
   - `curl -I https://portal.rcdo02.ru/catalog`;
   - `curl -I https://portal.rcdo02.ru/account`.
6. Create backup:
   - `docker compose exec -T postgres pg_dump -U obrportal obrportal > "$BACKUP"`;
   - `test -s "$BACKUP"`;
   - `ls -lh "$BACKUP"`.

## Stage 81.15 duplicate-check variables

Use runtime variables only:

- `CURATOR_EMAIL`;
- `LEARNER_EMAIL`;
- `CURATOR_PHONE`;
- `LEARNER_PHONE`;
- `ORG_INN=0274931354`;
- `ORG_KPP=027401001`;
- `ORG_OGRN=1170280067924`;
- `COURSE_SLUG=znakomstvo-s-obrazovatelnym-portalom`;
- `GROUP_CODE=REAL-BATCH-001`.

## Stage 81.15 duplicate-check SQL block

The duplicate-check SQL must inspect:

- users by `CURATOR_EMAIL` and `LEARNER_EMAIL`;
- organizations by `ORG_INN`, `ORG_KPP`, `ORG_OGRN`;
- courses by `COURSE_SLUG`;
- learning groups by `GROUP_CODE`;
- enrollments for target users or target course;
- documents for target users or target course.

No insert, update, delete, truncate, drop, migration, or cleanup SQL is allowed in Stage 81.15 preflight.

## UI entry order for Stage 81.15

1. `/admin/organizations` - create or verify organization.
2. `/admin/users` - create or verify curator/admin user.
3. `/admin/users` - create learner user.
4. `/admin/courses` - create course shell.
5. `/admin/courses` - add module.
6. `/admin/courses` - add lesson 1.
7. `/admin/groups` - create learning group if needed.
8. `/admin/groups` - add learner to group if needed.
9. `/admin/enrollments` - create enrollment.
10. `/account` - verify learner course visibility.
11. Learner flow - complete required lesson.
12. `/admin/documents` - verify draft document.
13. `/admin/documents` - publish only after PDF review.
14. `/verify-document` and `/verify/:code` - verify public document.
15. Record final state.

## Rollback decision points

Stop before publication and ask before cleanup if:

- duplicate course slug exists;
- duplicate group code exists;
- learner already has conflicting enrollment;
- generated document has wrong metadata;
- public verification returns wrong data;
- PDF contains wrong issuer, signer, title, or verification link.

Destructive rollback is out of scope for Stage 81.15 unless a separate backup-backed cleanup stage is approved.

## Acceptance

Stage 81.14 is accepted when:

- release manifest current_stage is `81.14`;
- production checkpoint remains based on runtime head `6f82e93`;
- decision is `prepare_preflight_backup_duplicate_check_runbook`;
- no production data change is recorded;
- no runtime rebuild or restart is recorded;
- backup instructions are documented;
- duplicate-check scope is documented;
- UI entry order is documented;
- rollback decision points are documented;
- current guard scripts do not contain hardcoded raw contact values;
- next stage is `81.15`.
