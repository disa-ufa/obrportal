# Stage 81.15 - real-batch-001 production result

stage81_15_status=real_batch_001_production_result_completed
stage81_15_release_manifest_required=yes
stage81_15_guard_required=yes
stage81_15_server_touched=yes
stage81_15_data_changed=yes
stage81_15_runtime_rebuild=no
stage81_15_runtime_restart=no
stage81_15_database_migration_run=no
stage81_15_cleanup_performed=no
stage81_15_batch_id=real-batch-001
stage81_15_decision=real_batch_001_e2e_completed_publish_document_verified
stage81_15_next_stage=81.16

## Scope

Stage 81.15 executed the first real production content batch through the admin UI and verified the learner-to-document E2E flow.

This stage used the admin UI for data entry and learner UI for progress verification. It did not run database migrations, did not rebuild runtime images, and did not restart containers.

## Production baseline

- host: `portal.rcdo02.ru`;
- ip: `89.127.203.70`;
- server_head_before_result_docs: `ae00b75`;
- tag_at_head_before_result_docs: `v0.1.0-stage81-14-real-batch-preflight-runbook`;
- ready_status: `ok`;
- database: `ok`;
- redis: `ok`;
- storage: `ok`;
- public_verify_http: `200`;
- production_data_changed: `yes`;
- data_entry_method: `admin_ui_first`;
- direct_sql_mutation_used: `no`.

## Preflight and backup

- backup_created: `yes`;
- backup_path: `/opt/obrportal-backups/postgres/postgres-before-stage81-15-real-batch-001-20260609T080137Z.sql`;
- duplicate_check_completed: `yes`;
- duplicate_conflict_found: `no`;
- raw_contacts_committed: `no`;
- password_committed: `no`.

## Created or verified production objects

### Organization

- organization_short_name: `ГБОУ РЦДО`;
- organization_requisites: `ИНН 0274931354`, `КПП 027401001`, `ОГРН 1170280067924`;
- document_profile_filled: `yes`.

### Learner

- learner_created_or_verified: `yes`;
- learner_name: `Денис`;
- learner_email_masked: `de***@gmail.com`;
- learner_id: `393e5639-7637-43b5-84b5-d5505e696903`.

### Course

- course_title: `Знакомство с образовательным порталом`;
- course_slug: `znakomstvo-s-obrazovatelnym-portalom`;
- course_hours: `2`;
- course_format: `дистанционно`;
- document_type: `Сертификат`;
- course_id: `1db6ac09-aca4-4dbe-8d15-e1e45c5f42f5`.

### Module and lesson

- module_title: `Основной модуль`;
- module_active: `yes`;
- lesson_title: `Введение в работу с образовательным порталом`;
- lesson_type: `text`;
- lesson_required: `yes`;
- lesson_active: `yes`.

### Learning group

- group_name: `Тестовая группа real-batch-001`;
- group_code: `REAL-BATCH-001`;
- group_id: `7084ce8b-b006-433e-8e3f-9e3150e08b1b`;
- learner_added_to_group: `yes`.

### Enrollment and progress

- enrollment_id: `f161aa1f-b1c2-400b-802b-454687fe431d`;
- enrollment_status: `completed`;
- progress_rows: `1`;
- completed_lessons: `1`.

## Document result

- document_number: `AUTO-F161AA1FB1C2400B`;
- verification_code: `DOCV-6DC5C651C5ED4B28957B1ECE`;
- document_status: `available`;
- document_type: `Сертификат`;
- has_pdf: `yes`;
- generation_source: `auto_completion`;
- generation_template_version: `completion_pdf_v1`;
- generated_at_utc: `2026-06-10 02:54:10.038299+00`;
- published_at_utc: `2026-06-10 04:09:22.776515+00`;
- public_verify_url: `https://portal.rcdo02.ru/verify/DOCV-6DC5C651C5ED4B28957B1ECE`;
- public_verify_http: `200`;
- public_verify_result: `document_confirmed`.

## Known non-blocking issue

The generated PDF contains correct data, but the long verification code visually overlaps with the `Место выдачи` field in the PDF layout.

Decision: keep Stage 81.15 accepted because metadata, public verification, publication, learner download, and E2E state are correct. Fix the PDF layout in a separate backend/PDF-template hotfix stage.

known_issue_pdf_layout_verification_code_overlap=yes
known_issue_fix_stage=separate_hotfix
known_issue_blocks_public_verification=no
known_issue_blocks_stage81_15_acceptance=no

## Acceptance

Stage 81.15 is accepted when:

- production health is `ok`;
- public verification returns HTTP `200`;
- production data was entered via admin UI;
- learner completed the required lesson;
- enrollment status is `completed`;
- generated document status is `available`;
- PDF exists in storage;
- learner can access/download the published document;
- public verification confirms the document;
- no raw contacts or passwords are committed;
- runtime rebuild and restart are not performed;
- PDF layout overlap is documented as a known non-blocking issue.
