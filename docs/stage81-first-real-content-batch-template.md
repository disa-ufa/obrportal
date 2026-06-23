# Stage 81.12 - First real content batch template

stage81_12_status=first_real_content_batch_template_completed
stage81_12_release_manifest_required=yes
stage81_12_guard_required=yes
stage81_12_server_touched=no
stage81_12_data_changed=no
stage81_12_runtime_rebuild=no
stage81_12_runtime_restart=no
stage81_12_database_migration_run=no
stage81_12_cleanup_performed=no
stage81_12_decision=prepare_fillable_template_before_production_data_entry
stage81_12_first_batch_id=real-batch-001
stage81_12_next_stage=81.13

## Scope

Stage 81.12 creates a controlled template for the first real production content batch.

No production data is created, edited, deleted, imported, or cleaned in this stage.

The current smoke dataset remains untouched:

- course: `testov-programma`;
- document: `AUTO-4AAA9C328B7C476D`;
- verification code: `DOCV-36F38F4FABBB45A38EE0E918`.

## Baseline

Current production baseline before real content entry:

- runtime head: `5a5cf0b`;
- tag: `v0.1.0-stage81-11-production-content-plan`;
- previous decision: `prepare_real_content_without_touching_smoke_dataset`.

## First real batch principle

The first real batch must be small and reversible by process:

- 1 real organization;
- 1 real administrator or curator account;
- 1 real course;
- 1 or more modules;
- 1 to 3 lessons;
- 1 learner;
- 1 enrollment;
- 1 generated document after completion.

The batch must be entered through UI where possible. Direct SQL mutation is not part of this stage.

## Fillable batch card

### Batch identity

- batch_id: `real-batch-001`;
- batch_status: `draft`;
- target_environment: `production`;
- data_entry_method: `admin_ui_first`;
- smoke_dataset_policy: `keep_unchanged`;
- cleanup_policy: `separate_stage_only`.

### Organization card

Required fields:

- full_name:
- short_name:
- inn:
- kpp:
- ogrn:
- legal_address:
- actual_address:
- license_info:
- contact_phone:
- contact_email:
- responsible_person:
- active_status:

Recommended validation before entry:

- INN contains only digits;
- KPP contains only digits when applicable;
- OGRN contains only digits;
- legal and actual addresses are not empty;
- contact email is valid;
- responsible person is agreed.

### Administrator or curator user card

Required fields:

- email:
- full_name:
- phone:
- role:
- organization_binding:
- active_status:
- initial_password_delivery_method:

Recommended validation before entry:

- email is unique;
- full name is official;
- phone is in agreed format;
- role is selected before creation;
- password is not committed to git or docs.

### Learner user card

Required fields:

- email:
- full_name:
- phone:
- organization_binding:
- active_status:

Recommended validation before entry:

- email is unique;
- full name matches future document text;
- organization binding is correct;
- learner can sign in before enrollment.

### Course card

Required fields:

- title:
- slug:
- description:
- hours:
- format:
- document_type:
- active_status:

Recommended validation before entry:

- slug is lowercase latin with hyphens;
- title is official;
- hours is a positive integer;
- format is one of agreed values;
- document_type matches publication policy;
- course remains inactive until modules and lessons are ready when needed.

### Module card

Required fields:

- course_slug:
- module_title:
- position:
- active_status:

Recommended validation before entry:

- module belongs to the intended course;
- position starts with 1;
- module title is clear for learners.

### Lesson card 1

Required fields:

- course_slug:
- module_title:
- lesson_title:
- content_type:
- content_text:
- content_url:
- position:
- is_required:
- active_status:

Recommended validation before entry:

- lesson belongs to the intended module;
- position is correct;
- required flag matches completion policy;
- content is readable in learner account.

### Lesson card 2

Optional fields:

- course_slug:
- module_title:
- lesson_title:
- content_type:
- content_text:
- content_url:
- position:
- is_required:
- active_status:

### Lesson card 3

Optional fields:

- course_slug:
- module_title:
- lesson_title:
- content_type:
- content_text:
- content_url:
- position:
- is_required:
- active_status:

### Learning group card

Use only if group assignment is needed.

Fields:

- organization_name:
- group_name:
- group_code:
- description:
- active_status:
- member_emails:

Recommended validation before entry:

- group belongs to the intended organization;
- learner is included only once;
- group assignment is not duplicated.

### Enrollment card

Required fields:

- learner_email:
- course_slug:
- organization_name:
- learning_group_code:
- enrollment_status_initial:
- planned_start_date:
- planned_completion_policy:

Recommended validation before entry:

- learner exists;
- course exists;
- organization exists;
- group exists if used;
- no duplicate active enrollment exists.

### Document policy card

Required fields:

- document_type:
- signer_position:
- signer_full_name:
- document_place:
- document_basis:
- issuer_name:
- issuer_short_name:
- issuer_address:
- issuer_license:
- issuer_inn:
- issuer_kpp:
- issuer_ogrn:
- publication_policy:

Recommended validation before entry:

- signer data is official;
- issuer metadata is correct;
- PDF preview is checked before publication;
- public verification page is checked after publication;
- QR/link uses production host.

## Entry order for Stage 81.13

Recommended execution order for the next stage:

1. Verify production health and create DB backup.
2. Open admin UI.
3. Create or verify real organization.
4. Create or verify curator/admin user.
5. Create learner user.
6. Create course shell.
7. Create module.
8. Create first lesson.
9. Optionally create lessons 2 and 3.
10. Optionally create learning group.
11. Create enrollment.
12. Sign in as learner and verify course visibility.
13. Complete required lesson flow.
14. Trigger or verify course completion.
15. Verify generated document draft.
16. Publish document after review.
17. Download PDF.
18. Verify public page by code and document number.
19. Record final state and decide next batch.

## Acceptance checklist before real entry

The following must be checked before writing real production data:

- organization card filled;
- user cards filled;
- course card filled;
- at least one module filled;
- at least one lesson filled;
- enrollment card filled;
- document policy card filled;
- backup command prepared;
- rollback decision agreed;
- smoke dataset remains untouched;
- direct SQL mutation is not planned.

## Deferred cleanup

These cleanup candidates remain out of scope:

- inactive blocked seed artifact user;
- extra active test course without modules: `test-prog`.

Cleanup requires a separate stage.

## Safety notes

Stage 81.12 did not use:

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

Stage 81.12 only uses:

- documentation;
- manifest update;
- guard update.

## Acceptance

Stage 81.12 is accepted when:

- release manifest current_stage is `81.12`;
- production checkpoint remains based on runtime head `5a5cf0b`;
- decision is `prepare_fillable_template_before_production_data_entry`;
- first batch id is `real-batch-001`;
- no production data change is recorded;
- no runtime rebuild or restart is recorded;
- fillable batch cards are recorded;
- next stage is `81.13`.
