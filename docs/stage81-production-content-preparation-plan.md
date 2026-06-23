# Stage 81.11 - Production content preparation plan

stage81_11_status=production_content_preparation_plan_completed
stage81_11_release_manifest_required=yes
stage81_11_guard_required=yes
stage81_11_server_touched=no
stage81_11_data_changed=no
stage81_11_runtime_rebuild=no
stage81_11_runtime_restart=no
stage81_11_database_migration_run=no
stage81_11_cleanup_performed=no
stage81_11_decision=prepare_real_content_without_touching_smoke_dataset
stage81_11_next_stage=81.12

## Scope

Stage 81.11 prepares the plan for replacing demo-looking content with real production content.

No production data was changed in this stage.

This stage does not delete the smoke dataset created and verified in Stage 81.10. The smoke dataset remains useful for future regression checks.

## Current baseline

The current production baseline remains:

- server runtime head: `276e3e5`;
- tag: `v0.1.0-stage81-10-production-inventory`;
- smoke dataset decision: `keep_demo_smoke_dataset`.

Existing smoke dataset:

- learner: `stage12-smoke-learner@obrportal.local`;
- organization: `тестовая организация`;
- course: `testov-programma`;
- enrollment: `4aaa9c32-8b7c-476d-acb1-a33863e08986`;
- document: `AUTO-4AAA9C328B7C476D`;
- verification code: `DOCV-36F38F4FABBB45A38EE0E918`.

## Local inventory evidence

Local inventory files were generated during Stage 81.11 and intentionally left uncommitted:

- `tmp_stage81_11_admin_forms_inventory.txt`;
- `tmp_stage81_11_deep_content_inventory.txt`.

They confirm:

- server was not touched;
- data was not changed;
- runtime was not rebuilt;
- runtime was not restarted.

## Available admin/public/account areas

The current codebase exposes the following main areas for content preparation:

- `/admin/users`;
- `/admin/organizations`;
- `/admin/courses`;
- `/admin/groups`;
- `/admin/enrollments`;
- `/admin/documents`;
- `/admin/roles`;
- `/admin/permissions`;
- `/admin/audit-events`;
- `/catalog`;
- `/courses/:slug`;
- `/account`;
- `/verify/:code`;
- `/verify-document`.

## Backend API coverage

The local inventory confirms these API groups:

### Account API

- `GET /account/summary`;
- `GET /account/courses`;
- `GET /account/documents`;
- `GET /account/documents/{document_id}/download`;
- `GET /account/courses/{enrollment_id}`;
- `POST /account/courses/{course_id}/enroll`;
- `POST /account/courses/{enrollment_id}/start`;
- `POST /account/courses/{enrollment_id}/complete`.

### Admin API

- `GET/POST /admin/users`;
- `GET/PATCH /admin/users/{user_id}`;
- `POST /admin/users/{user_id}/password`;
- `POST /admin/users/{user_id}/activate`;
- `POST /admin/users/{user_id}/deactivate`;
- `POST /admin/users/{user_id}/roles`;
- `GET /admin/organizations`;
- `GET/PATCH/DELETE /admin/organizations/{organization_id}`;
- `GET/POST /admin/documents`;
- `PATCH/DELETE /admin/documents/{document_id}`;
- `GET /admin/documents/{document_id}/download`;
- `POST /admin/documents/{document_id}/regenerate`;
- `GET /admin/documents/{document_id}/generation-events`;
- `GET/POST /admin/courses`;
- `GET/PATCH/DELETE /admin/courses/{course_id}`;
- `POST /admin/courses/{course_id}/activate`;
- `POST /admin/courses/{course_id}/deactivate`;
- `GET /admin/courses/{course_id}/modules`;
- `GET/PATCH/DELETE /admin/course-modules/{module_id}`;
- `GET /admin/course-modules/{module_id}/lessons`;
- `GET/PATCH/DELETE /admin/course-lessons/{lesson_id}`;
- `GET/POST /admin/enrollments`;
- `GET/PATCH/DELETE /admin/enrollments/{enrollment_id}`;
- `POST /admin/enrollments/group`;
- `GET /admin/worklist-summary`;
- `GET /admin/dashboard-summary`;
- `GET /admin/audit-events`.

### Organization cabinet API

- `GET /org/profile`;
- `PATCH /org/profile/{organization_id}`;
- `GET /org/groups`;
- `GET/PATCH /org/groups/{group_id}`;
- `GET /org/groups/{group_id}/enrollments`;
- `DELETE /org/groups/{group_id}/enrollments/{enrollment_id}`;
- `POST /org/enrollments/group`.

### Public API

- `GET /public/courses`;
- `GET /public/courses/{slug}`;
- `GET /public/documents/verify`.

## Production content objects to prepare

For real production filling, the following object groups are required.

### 1. Organizations

Required preparation:

- official full organization name;
- short name;
- INN;
- KPP;
- OGRN;
- legal address;
- actual address;
- license information;
- contact phone;
- contact email;
- responsible person;
- organization status.

Current UI/API markers include:

- `name`;
- `inn`;
- `kpp`;
- `ogrn`;
- `legal_address`;
- `actual_address`;
- `phone`;
- `email`;
- `is_active`.

### 2. Users

Required preparation:

- administrator accounts;
- organization representative accounts;
- learner accounts;
- email;
- full name;
- phone;
- active status;
- role assignment;
- organization binding when applicable.

Current UI/API markers include:

- `email`;
- `full_name`;
- `phone`;
- `password`;
- `roles`;
- `organization_id`;
- `is_active`;
- `is_email_verified`;
- `mfa_enabled`.

### 3. Courses

Required preparation:

- real course/program title;
- slug;
- description;
- hours;
- format;
- document type;
- active/inactive state;
- module list;
- lesson list;
- lesson text/link/file/video content;
- completion rules.

Current UI/API markers include:

- `title`;
- `slug`;
- `description`;
- `hours`;
- `format`;
- `document_type`;
- `is_active`.

### 4. Course modules

Required preparation:

- course binding;
- module title;
- module position;
- active status.

Current UI/API markers include:

- `course_id`;
- `title`;
- `position`;
- `is_active`.

### 5. Course lessons

Required preparation:

- module binding;
- lesson title;
- content type;
- content text;
- content URL;
- position;
- required/not required;
- active status.

Current UI/API markers include:

- `module_id`;
- `title`;
- `content_type`;
- `content_text`;
- `content_url`;
- `position`;
- `is_required`;
- `is_active`.

### 6. Learning groups

Required preparation:

- organization binding;
- group name;
- group code;
- description;
- active status;
- group members.

Current UI/API markers include:

- `organization_id`;
- `name`;
- `code`;
- `description`;
- `is_active`;
- `user_ids`.

### 7. Enrollments

Required preparation:

- user binding;
- course binding;
- organization binding;
- optional learning group binding;
- status;
- start date;
- completion date.

Current UI/API markers include:

- `user_id`;
- `course_id`;
- `organization_id`;
- `learning_group_id`;
- `status`;
- `started_at`;
- `completed_at`.

### 8. Documents

Required preparation:

- user binding;
- course binding;
- enrollment binding;
- document title;
- document type;
- document number;
- status;
- optional revocation reason;
- uploaded/generated file;
- verification code;
- PDF generation history.

Current UI/API markers include:

- `user_id`;
- `course_id`;
- `enrollment_id`;
- `title`;
- `document_type`;
- `document_number`;
- `status`;
- `revocation_reason`;
- `file`;
- `verification_code`;
- `generation_source`;
- `generation_template_version`.

## Recommended filling order

Recommended order for real content:

1. Create/verify real organizations.
2. Create/verify real admin and organization representative users.
3. Create real course shell records.
4. Add course modules.
5. Add course lessons.
6. Create learning groups if organization-based assignment is needed.
7. Add learners.
8. Assign learners to courses or assign groups to courses.
9. Let learners complete lessons/courses.
10. Verify generated documents.
11. Publish documents.
12. Verify public document page and PDF QR/link.

## Minimal first real content batch

The first real production batch should be small and controlled:

- 1 real organization;
- 1 real administrator/curator account;
- 1 real course;
- 1 module;
- 1–3 lessons;
- 1 test learner linked to the real organization;
- 1 enrollment;
- 1 generated document after completion.

This batch should be treated separately from the smoke dataset.

## Data collection checklist

Before creating real content, collect:

### Organization

- full name;
- short name;
- INN;
- KPP;
- OGRN;
- legal address;
- actual address;
- license text/number;
- contact phone;
- contact email;
- responsible person.

### Course

- title;
- slug;
- description;
- hours;
- format;
- document type;
- module titles;
- lesson titles;
- lesson content text;
- lesson content URLs/files;
- required lessons.

### Users

- administrator email;
- organization representative email;
- learner email;
- full name;
- phone;
- role;
- organization binding.

### Enrollment

- learner;
- course;
- organization;
- group if applicable;
- intended status flow.

### Documents

- document type;
- signer position;
- signer full name;
- issue place;
- document basis;
- issuer metadata;
- publication policy.

## Deferred cleanup

The following records remain cleanup candidates but are not touched in Stage 81.11:

- inactive blocked seed artifact user:
  - `3e030fbc-c763-4fdc-81bc-3ce7ebae8717`;
- extra active test course without modules:
  - `aa2f8886-d597-4392-8189-ec4395f16a29`;
  - slug: `test-prog`.

Cleanup must be a separate stage with explicit backup, acceptance criteria and rollback plan.

## Decision

Stage 81.11 decision:

- keep the smoke dataset;
- do not mutate production data;
- use admin UI for future real content creation where possible;
- avoid direct SQL mutation for content filling unless a separate reviewed migration/import stage is created;
- use a small first real content batch before bulk filling.

## Safety notes

Stage 81.11 did not use:

- SSH mutation commands;
- production DB writes;
- production cleanup;
- migrations;
- backend rebuild;
- frontend rebuild;
- runtime restart;
- volume reset.

Stage 81.11 only used:

- local code inventory;
- documentation;
- release manifest update;
- guard update.

## Acceptance

Stage 81.11 is accepted when:

- release manifest current_stage is `81.11`;
- production checkpoint remains based on Stage 81.10 runtime head `276e3e5`;
- decision is `prepare_real_content_without_touching_smoke_dataset`;
- no production data change is recorded;
- no runtime rebuild/restart is recorded;
- content object checklist is recorded;
- first real content batch scope is recorded;
- deferred cleanup candidates are recorded;
- next stage is `81.12`.
