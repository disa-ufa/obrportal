# Stage 81.13 - real-batch-001 filled card

stage81_13_status=real_batch_001_filled_sanitized_completed
stage81_13_release_manifest_required=yes
stage81_13_guard_required=yes
stage81_13_server_touched=no
stage81_13_data_changed=no
stage81_13_runtime_rebuild=no
stage81_13_runtime_restart=no
stage81_13_database_migration_run=no
stage81_13_cleanup_performed=no
stage81_13_batch_id=real-batch-001
stage81_13_decision=commit_sanitized_batch_card_only
stage81_13_next_stage=81.14

## Scope

Stage 81.13 records the filled first real content batch card in a sanitized form.

No production data is created, edited, deleted, imported, or cleaned in this stage.

The original local fill card is intentionally not committed because it contains direct personal contact data.

## Baseline

Current production baseline before actual data entry:

- runtime head: `e17668a`;
- tag: `v0.1.0-stage81-12-first-real-content-batch-template`;
- previous stage: `81.12`;
- previous decision: `prepare_fillable_template_before_production_data_entry`.

## Batch identity

- batch_id: `real-batch-001`;
- target_environment: `production`;
- data_entry_method: `admin_ui_first`;
- smoke_dataset_policy: `keep_unchanged`;
- direct_sql_mutation_planned: `no`;
- backup_required_before_entry: `yes`;
- cleanup_policy: `separate_stage_only`.

## Sanitized contact policy

The committed document contains masked contact values only.

- curator_email_masked: `de***@mail.ru`;
- learner_email_masked: `de***@gmail.com`;
- curator_phone_masked: `8987***0776`;
- learner_phone_masked: `8987***0776`;
- password_recorded: `no`;
- password_delivery_method: `manual_secure_delivery_not_in_git`.

## Organization

- full_name: `Государственное бюджетное общеобразовательное учреждение Республики Башкортостан «Республиканский центр дистанционного образования детей-инвалидов»`;
- short_name: `ГБОУ РЦДО`;
- inn: `0274931354`;
- kpp: `027401001`;
- ogrn: `1170280067924`;
- legal_address: `450080, Республика Башкортостан, г. Уфа, ул. Авроры, д. 18/2`;
- actual_address: `450080, Республика Башкортостан, г. Уфа, ул. Авроры, д. 18/2`;
- license_info: `Лицензия на осуществление образовательной деятельности`;
- responsible_person: `Нуриев Фаниль Жамилевич`;
- active_status: `true`.

## Curator / administrator

- email_masked: `de***@mail.ru`;
- full_name: `Denis`;
- phone_masked: `8987***0776`;
- role: `super_admin`;
- organization_binding: `ГБОУ РЦДО`;
- active_status: `true`;
- initial_password_delivery_method: `manual_secure_delivery_not_in_git`.

## Learner

- email_masked: `de***@gmail.com`;
- full_name: `Денис`;
- phone_masked: `8987***0776`;
- organization_binding: `ГБОУ РЦДО`;
- active_status: `true`.

## Course

- title: `Знакомство с образовательным порталом`;
- slug: `znakomstvo-s-obrazovatelnym-portalom`;
- description: `Краткий тестовый курс для проверки первого реального batch перед массовым наполнением образовательного портала.`;
- hours: `2`;
- format: `дистанционно`;
- document_type: `Сертификат`;
- active_status: `false`.

## Module

- course_slug: `znakomstvo-s-obrazovatelnym-portalom`;
- module_title: `Основной модуль`;
- position: `1`;
- active_status: `true`.

## Lesson 1

- course_slug: `znakomstvo-s-obrazovatelnym-portalom`;
- module_title: `Основной модуль`;
- lesson_title: `Введение в работу с образовательным порталом`;
- content_type: `text`;
- content_text: `В этом уроке слушатель знакомится с образовательным порталом, личным кабинетом, назначенными курсами, материалами уроков и итоговыми документами.`;
- content_url: ``;
- position: `1`;
- is_required: `true`;
- active_status: `true`.

## Learning group

- organization_name: `ГБОУ РЦДО`;
- group_name: `Тестовая группа real-batch-001`;
- group_code: `REAL-BATCH-001`;
- description: `Тестовая учебная группа для проверки первого реального batch.`;
- active_status: `true`;
- member_emails_policy: `masked_in_committed_docs`;
- member_count_expected: `1`.

## Enrollment

- learner_email_policy: `masked_in_committed_docs`;
- course_slug: `znakomstvo-s-obrazovatelnym-portalom`;
- organization_name: `ГБОУ РЦДО`;
- learning_group_code: `REAL-BATCH-001`;
- enrollment_status_initial: `assigned`;
- planned_start_date: `2026-06-09`;
- planned_completion_policy: `complete_required_lessons`.

## Document policy

- document_type: `Сертификат`;
- signer_position: `директор`;
- signer_full_name: `Нуриев Фаниль Жамилевич`;
- document_place: `г. Уфа`;
- document_basis: `успешное завершение тестового курса в образовательном портале`;
- issuer_name: `Государственное бюджетное общеобразовательное учреждение Республики Башкортостан «Республиканский центр дистанционного образования детей-инвалидов»`;
- issuer_short_name: `ГБОУ РЦДО`;
- issuer_address: `450080, Республика Башкортостан, г. Уфа, ул. Авроры, д. 18/2`;
- issuer_license: `Лицензия на осуществление образовательной деятельности`;
- issuer_inn: `0274931354`;
- issuer_kpp: `027401001`;
- issuer_ogrn: `1170280067924`;
- publication_policy: `review_before_publish`.

## Pre-entry checklist

- organization_card_filled: `yes`;
- curator_user_card_filled: `yes`;
- learner_user_card_filled: `yes`;
- course_card_filled: `yes`;
- module_card_filled: `yes`;
- lesson_1_card_filled: `yes`;
- enrollment_card_filled: `yes`;
- document_policy_card_filled: `yes`;
- backup_required_before_entry: `yes`;
- direct_sql_mutation_planned: `no`;
- smoke_dataset_policy: `keep_unchanged`.

## Deferred optional fields

Lesson 2 and Lesson 3 remain empty by design for this first small batch.

## Next stage

Stage 81.14 should be a production preflight and data-entry runbook for entering `real-batch-001` through admin UI.

It must include:

- production health check;
- database backup;
- duplicate checks;
- step-by-step UI entry order;
- post-entry verification;
- rollback decision points.

## Safety notes

Stage 81.13 did not use:

- SSH commands;
- production DB writes;
- direct SQL mutation;
- data import;
- cleanup;
- migrations;
- backend rebuild;
- frontend rebuild;
- runtime restart;
- volume reset.

Stage 81.13 only uses:

- local filled card validation;
- sanitized documentation;
- release manifest update;
- guard update.

## Acceptance

Stage 81.13 is accepted when:

- release manifest current_stage is `81.13`;
- production checkpoint remains based on runtime head `e17668a`;
- decision is `commit_sanitized_batch_card_only`;
- no production data change is recorded;
- no runtime rebuild or restart is recorded;
- committed batch card contains no raw email, no raw phone, and no password;
- local temporary fill card is removed before commit;
- next stage is `81.14`.
