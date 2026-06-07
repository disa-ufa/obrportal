# Stage 78.5 - Learner Progress API Inventory

stage78_5_status=implementation_ready
stage78_5_release_manifest_required=yes
stage78_5_guard_required=yes
stage78_5_repository_inventory_only=yes
stage78_5_runtime_changed=no
stage78_5_database_changed=no
stage78_5_migrations_added=no
stage78_5_credential_like_values=no

## Goal

Inventory the existing course, enrollment, lesson, progress/completion, and document flows before adding real learner progress persistence or APIs.

This stage is repository-only. It does not change frontend runtime, backend runtime, database schema, migrations, auth/RBAC, or production config.

## Production baseline

- Last confirmed production stage: 78.4
- Last confirmed production head: 3beee80
- Last confirmed host: portal.rcdo02.ru
- Deployment type of this stage: repository-inventory

## Inventory summary

- Scanned text files: 658
- High-value files found: 40
- Backend route candidates: 66
- Model class candidates: 46
- Function/API candidates: 120

## Backend route candidates

| file | line | method | route |
| --- | --- | --- | --- |
| backend/app/api/v1/account.py | 51 | GET | /summary |
| backend/app/api/v1/account.py | 79 | GET | /courses |
| backend/app/api/v1/account.py | 136 | GET | /documents |
| backend/app/api/v1/account.py | 188 | GET | /documents/{document_id}/download |
| backend/app/api/v1/account.py | 496 | GET | /courses/{enrollment_id} |
| backend/app/api/v1/account.py | 516 | POST | /courses/{enrollment_id}/lessons/{lesson_id}/complete |
| backend/app/api/v1/account.py | 601 | POST | /courses/{course_id}/enroll |
| backend/app/api/v1/account.py | 668 | POST | /courses/{enrollment_id}/start |
| backend/app/api/v1/account.py | 700 | POST | /courses/{enrollment_id}/complete |
| backend/app/api/v1/admin.py | 862 | GET | /dashboard-summary |
| backend/app/api/v1/admin.py | 954 | GET | /users |
| backend/app/api/v1/admin.py | 2143 | GET | /documents |
| backend/app/api/v1/admin.py | 2251 | POST | /documents |
| backend/app/api/v1/admin.py | 2465 | GET | /documents/{document_id}/generation-events |
| backend/app/api/v1/admin.py | 2501 | GET | /documents/{document_id}/generation-events/{event_id}/download |
| backend/app/api/v1/admin.py | 2545 | PATCH | /documents/{document_id} |
| backend/app/api/v1/admin.py | 2764 | DELETE | /documents/{document_id} |
| backend/app/api/v1/admin.py | 2822 | GET | /documents/{document_id}/download |
| backend/app/api/v1/admin.py | 2864 | POST | /documents/{document_id}/regenerate |
| backend/app/api/v1/admin.py | 3081 | GET | /courses |
| backend/app/api/v1/admin.py | 3115 | POST | /courses |
| backend/app/api/v1/admin.py | 3154 | GET | /courses/{course_id} |
| backend/app/api/v1/admin.py | 3165 | PATCH | /courses/{course_id} |
| backend/app/api/v1/admin.py | 3216 | POST | /courses/{course_id}/activate |
| backend/app/api/v1/admin.py | 3250 | POST | /courses/{course_id}/deactivate |
| backend/app/api/v1/admin.py | 3284 | DELETE | /courses/{course_id} |
| backend/app/api/v1/admin.py | 3402 | GET | /courses/{course_id}/modules |
| backend/app/api/v1/admin.py | 3429 | POST | /courses/{course_id}/modules |
| backend/app/api/v1/admin.py | 3478 | GET | /course-modules/{module_id} |
| backend/app/api/v1/admin.py | 3489 | PATCH | /course-modules/{module_id} |


## Model class candidates

| file | line | class |
| --- | --- | --- |
| backend/app/models/course.py | 7 | Course |
| backend/app/models/course_lesson.py | 7 | CourseLesson |
| backend/app/models/course_module.py | 7 | CourseModule |
| backend/app/models/document_generation_event.py | 9 | DocumentGenerationEvent |
| backend/app/models/document_record.py | 14 | DocumentRecord |
| backend/app/models/enrollment.py | 7 | Enrollment |
| backend/app/models/lesson_progress.py | 7 | LessonProgress |
| backend/app/schemas/account.py | 17 | AccountCourseItemResponse |
| backend/app/schemas/account.py | 34 | AccountCourseLessonResponse |
| backend/app/schemas/account.py | 48 | AccountCourseModuleResponse |
| backend/app/schemas/account.py | 57 | AccountCourseDetailResponse |
| backend/app/schemas/account.py | 67 | AccountCoursesResponse |
| backend/app/schemas/account.py | 72 | AccountDocumentItemResponse |
| backend/app/schemas/account.py | 89 | AccountDocumentsResponse |
| backend/app/schemas/admin.py | 198 | AdminWorklistDocumentsSummary |
| backend/app/schemas/admin.py | 206 | AdminWorklistEnrollmentsSummary |
| backend/app/schemas/admin.py | 220 | AdminDocumentItem |
| backend/app/schemas/admin.py | 254 | AdminDocumentGenerationEventItem |
| backend/app/schemas/admin.py | 267 | AdminCourseItem |
| backend/app/schemas/admin.py | 278 | AdminCourseDetail |
| backend/app/schemas/admin.py | 283 | AdminCourseModuleItem |
| backend/app/schemas/admin.py | 292 | AdminCourseModuleDetail |
| backend/app/schemas/admin.py | 297 | AdminCourseModuleCreate |
| backend/app/schemas/admin.py | 304 | AdminCourseModuleUpdate |
| backend/app/schemas/admin.py | 310 | AdminCourseLessonItem |
| backend/app/schemas/admin.py | 323 | AdminCourseLessonDetail |
| backend/app/schemas/admin.py | 328 | AdminCourseLessonCreate |
| backend/app/schemas/admin.py | 339 | AdminCourseLessonUpdate |
| backend/app/schemas/admin.py | 350 | AdminCourseCreate |
| backend/app/schemas/admin.py | 360 | AdminCourseUpdate |


## Function/API candidates

| file | line | function |
| --- | --- | --- |
| backend/app/api/v1/account.py | 80 | get_account_courses |
| backend/app/api/v1/account.py | 137 | get_account_documents |
| backend/app/api/v1/account.py | 189 | get_account_document_download |
| backend/app/api/v1/account.py | 247 | build_account_course_item_from_row |
| backend/app/api/v1/account.py | 265 | build_account_course_lesson |
| backend/app/api/v1/account.py | 287 | build_account_course_module |
| backend/app/api/v1/account.py | 308 | load_account_course_modules |
| backend/app/api/v1/account.py | 379 | calculate_progress_percent |
| backend/app/api/v1/account.py | 386 | calculate_account_course_progress |
| backend/app/api/v1/account.py | 426 | build_account_course_detail_from_row |
| backend/app/api/v1/account.py | 456 | get_account_course_row_or_404 |
| backend/app/api/v1/account.py | 497 | get_account_course_detail |
| backend/app/api/v1/account.py | 520 | complete_account_course_lesson |
| backend/app/api/v1/account.py | 602 | create_account_course_enrollment |
| backend/app/api/v1/account.py | 646 | get_account_enrollment_entity_or_404 |
| backend/app/api/v1/account.py | 669 | start_account_course_learning |
| backend/app/api/v1/account.py | 701 | complete_account_course_learning |
| backend/app/api/v1/admin.py | 1903 | build_admin_document_item |
| backend/app/api/v1/admin.py | 1939 | build_admin_document_generation_event_item |
| backend/app/api/v1/admin.py | 1954 | normalize_document_number |
| backend/app/api/v1/admin.py | 1969 | normalize_document_status |
| backend/app/api/v1/admin.py | 1997 | apply_document_status_metadata |
| backend/app/api/v1/admin.py | 2037 | save_admin_document_file |
| backend/app/api/v1/admin.py | 2059 | ensure_document_enrollment_is_unique |
| backend/app/api/v1/admin.py | 2082 | get_admin_document_row_or_404 |
| backend/app/api/v1/admin.py | 2144 | list_admin_documents |
| backend/app/api/v1/admin.py | 2252 | create_admin_document |
| backend/app/api/v1/admin.py | 2397 | document_record_snapshot |
| backend/app/api/v1/admin.py | 2420 | get_document_update_audit_action |
| backend/app/api/v1/admin.py | 2443 | delete_admin_document_file |
| backend/app/api/v1/admin.py | 2447 | get_admin_document_or_404 |
| backend/app/api/v1/admin.py | 2466 | list_admin_document_generation_events |
| backend/app/api/v1/admin.py | 2502 | download_admin_document_generation_event |
| backend/app/api/v1/admin.py | 2546 | update_admin_document |
| backend/app/api/v1/admin.py | 2765 | delete_admin_document |
| backend/app/api/v1/admin.py | 2799 | resolve_admin_document_storage_path |
| backend/app/api/v1/admin.py | 2803 | build_admin_document_download_filename |
| backend/app/api/v1/admin.py | 2823 | download_admin_document |
| backend/app/api/v1/admin.py | 2857 | is_generated_completion_document |
| backend/app/api/v1/admin.py | 2865 | regenerate_admin_completion_document |


## High-value files

| file | score |
| --- | --- |
| scripts/smoke_auth_rbac.py | 4815 |
| backend/app/tests/test_auth_rbac_admin_api.py | 4075 |
| backend/app/api/v1/admin.py | 3650 |
| frontend/src/pages/AdminCoursesPage.jsx | 2418 |
| frontend/src/pages/DocumentsPage.jsx | 1618 |
| frontend/src/pages/AccountPage.jsx | 1556 |
| README.md | 1477 |
| frontend/src/pages/AdminEnrollmentsPage.jsx | 1226 |
| frontend/src/pages/CourseDetailPage.jsx | 1179 |
| backend/app/api/v1/account.py | 1079 |
| frontend/src/pages/DashboardPage.jsx | 927 |
| scripts/smoke_frontend_admin_pages.py | 904 |
| docs/stage-13-learning-flow.md | 497 |
| backend/app/tests/test_account_lesson_progress_api.py | 495 |
| frontend/src/pages/AuditPage.jsx | 484 |
| docs/stage-15-admin-ux-operator-workflow.md | 462 |
| backend/app/api/v1/org.py | 431 |
| scripts/smoke_shared_components.py | 399 |
| frontend/src/api/client.js | 388 |
| docs/release-manifest.json | 384 |
| docs/stage-12-4-document-verification-workflow.md | 381 |
| frontend/src/pages/CatalogPage.jsx | 378 |
| frontend/src/pages/OrganizationCabinetPage.jsx | 376 |
| docs/stage-12-5-admin-moderation-audit-workflow.md | 374 |
| docs/stage-12-3-course-detail-learner-workflow.md | 361 |
| docs/stage-14-documents-certificates-verification.md | 342 |
| backend/app/tests/test_course_lessons_admin_api.py | 311 |
| backend/app/api/v1/public.py | 310 |
| scripts/smoke_documents_page.py | 308 |
| scripts/check_stage12_5_admin_moderation_audit_workflow.py | 297 |


## Recommended architecture decision

Backend must be the source of truth for learner progress.

The next runtime stage should connect the existing learner course UX to backend-owned state:

1. Load actual enrollment state.
2. Load actual lesson completion state.
3. Mark a lesson as completed through a protected account endpoint.
4. Re-fetch or update the account course detail after completion.
5. Let backend decide when a course can be completed.
6. Let backend generate or expose completion documents.

## Next recommended stage

Stage 78.6 - Learner lesson completion API integration.

Before adding a migration, verify whether the current backend already has:

- enrollment ownership checks;
- lesson completion state;
- course completion logic;
- document draft/publication flow;
- audit events for completion actions.

If a progress table already exists, use it. If it does not exist, introduce the smallest possible schema only after a separate migration plan.

## Safety

- Repository inventory only.
- Frontend runtime is not changed.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
