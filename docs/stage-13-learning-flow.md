# Stage 13 Learning flow / прохождение курсов

Status: accepted
Stage: 13
Project: ObrPortal
Baseline tag: v0.1.0-stage12-complete
Parent roadmap: docs/project-roadmap-after-stage9.md

## 1. Purpose

Stage 13 implements the learner-side course experience after the accepted Stage 12 product contour.

The goal is to let an enrolled learner:
- see assigned courses;
- open an assigned course;
- view modules and lessons;
- complete lessons;
- see progress;
- complete a course;
- later receive or open generated documents when document generation is connected.

This baseline step is documentation-only and guard-only.

## 2. Accepted baseline

Stage 13 starts from the accepted Stage 12 checkpoint:

- final Stage 12 tag: `v0.1.0-stage12-complete`;
- final Stage 12 acceptance commit: `6c0b0c3`;
- production is healthy after Stage 12;
- Stage 12.1 through Stage 12.8 are accepted.

Existing learner-facing foundation:
- account/profile workflow exists;
- catalog learner workflow exists;
- public course detail workflow exists;
- learner account course/document visibility exists;
- admin course/module/lesson authoring foundation exists;
- admin enrollments foundation exists;
- document verification foundation exists.

## 3. Stage 13 scope

Stage 13 scope:
- learner course list;
- learner course detail page;
- modules and lessons display;
- lesson completion;
- progress calculation;
- course completion;
- link to generated documents.

## 4. MVP user flow

MVP learner flow:

1. Learner signs in.
2. Learner opens account or learning area.
3. Learner sees assigned courses.
4. Learner opens an assigned course.
5. Learner sees modules and lessons.
6. Learner opens a lesson.
7. Learner marks lesson as completed.
8. System recalculates course progress.
9. When all required lessons are completed, course becomes completed.
10. Completed course can later trigger or link to document generation.

## 5. Data and API expectations

Stage 13 may require backend support for:
- learner-scoped course list;
- learner-scoped course progress detail;
- lesson completion mutation;
- progress recalculation;
- completed course state;
- safe document link visibility after completion.

All APIs must be learner-scoped and must not expose another learner's enrollments, progress or documents.

## 6. Frontend expectations

Stage 13 frontend should provide:
- clear learner course list;
- course progress indicator;
- module/lesson outline;
- lesson content display;
- completion action;
- completed/locked/empty/loading/error states;
- safe links back to account, catalog and document verification.

## 7. Safety rules

Stage 13 must not:
- weaken authentication, authorization or RBAC;
- expose another learner's courses, progress, lessons or documents;
- add broad admin changes without a separate accepted plan;
- change production secrets;
- print tokens or environment values;
- change server-local `docker-compose.override.yml`;
- touch server-local `backups/` or `tmp/`;
- introduce destructive migrations without an explicit migration/rollback plan;
- bypass CI/local quality gates.

## 8. Baseline acceptance criteria

Stage 13 baseline is accepted when:
- this document exists;
- the Stage 13 guard exists;
- the guard checks the post-Stage 9 roadmap;
- the guard checks Stage 12 final acceptance;
- the guard checks Stage 13 scope and safety markers;
- encoding and BOM guards pass;
- no runtime files are changed by the baseline step.

## 9. Local quality gate

Before merging the Stage 13 baseline, run:
- `python scripts/check_stage13_learning_flow.py`;
- `python scripts/check_stage12_8_final_stabilization.py`;
- `python scripts/check_stage12_7_import_export_reporting.py`;
- `python scripts/check_project_roadmap_after_stage9.py`;
- `python scripts/check_ci_local_gate.py`;
- `python scripts/check_text_encoding.py`;
- `python scripts/check_source_bom.py`.

Before merging Stage 13 runtime implementation, additionally run:
- `docker compose exec frontend npm run build`;
- `docker compose exec backend pytest app/tests -q`.

## 10. Verification markers

- `Stage 13 Learning flow / прохождение курсов`
- `Stage 13 baseline`
- `v0.1.0-stage12-complete`
- `learner course list`
- `learner course detail page`
- `modules and lessons display`
- `lesson completion`
- `progress calculation`
- `course completion`
- `link to generated documents`
- `learner-scoped`
- `production_runtime_changed=no`

## 11. Stage 13 baseline server check - 2026-05-28

Goal: record production server synchronization and health verification for the Stage 13 learning flow baseline.

Server verification result:
- production git head: `6f78013`;
- deployed commit: `docs: add stage 13 learning flow baseline`;
- server project path: `/opt/obrportal`;
- branch: `main`;
- baseline tag is available on server: `v0.1.0-stage13-learning-flow-baseline`;
- backend health endpoint returned OK;
- backend ready endpoint returned OK;
- public ready endpoint returned OK.

Safety notes:
- No runtime containers were rebuilt.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were added.
- Server-local untracked paths `backups/`, `tmp/`, and `docker-compose.override.yml` were left untouched.
- Secrets were not printed.
- `production_runtime_changed=no`.

Verification markers:
- `Stage 13 baseline server check - 2026-05-28`
- `production git head: 6f78013`
- `Stage 13 baseline server check passed`
- `stage13_baseline_tag=ok`
- `backend_health=ok`
- `backend_ready=ok`
- `public_ready=ok`

## 12. Stage 13 learning flow inventory - 2026-05-29

Goal: record the current learner-scoped learning flow inventory before runtime stabilization.

Inventory result:
- current local git head: `3c4cdbf`;
- working tree was clean before inventory recording;
- compact inventory report was generated at `tmp/stage13_inventory_compact.txt`;
- account backend already exposes learner-scoped course list via `GET /api/v1/account/courses`;
- account backend already exposes learner-scoped course detail via `GET /api/v1/account/courses/{enrollment_id}`;
- account backend already exposes lesson completion via `POST /api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete`;
- account backend already exposes self-enrollment via `POST /api/v1/account/courses/{course_id}/enroll`;
- account backend already exposes course start via `POST /api/v1/account/courses/{enrollment_id}/start`;
- account backend already exposes course completion via `POST /api/v1/account/courses/{enrollment_id}/complete`;
- account backend uses `Enrollment.user_id == current_user.id` for learner ownership checks;
- account backend uses `LessonProgress` for completed lessons;
- account backend calls `ensure_completion_document_for_enrollment` on course completion;
- account schemas already include `AccountCourseItemResponse`, `AccountCourseDetailResponse`, `AccountCourseModuleResponse`, `AccountCourseLessonResponse` and `AccountCoursesResponse`;
- course detail schema already includes `progress_percent`, `required_progress_percent`, `lessons_total`, `lessons_completed`, `required_lessons_total`, `required_lessons_completed`, `modules` and `lessons`;
- frontend API client already exposes `getAccountCourses`, `getAccountCourseDetail`, `completeAccountCourseLesson`, `enrollAccountCourse`, `startAccountCourse`, `completeAccountCourse`, `getAccountDocuments` and `downloadAccountDocument`.

Decision:
- Stage 13 must not duplicate the existing account learning API under a new `/learning` namespace.
- The next runtime step should stabilize and verify the existing `/api/v1/account/courses` learner flow.
- Priority is contract tests, smoke coverage, ownership/403/404 checks, progress consistency and UX polish.
- No database migration is required for the inventory step.

Safety notes:
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were added.
- Secrets were not printed.
- `stage13_inventory_runtime_changed=no`.

Verification markers:
- `Stage 13 learning flow inventory - 2026-05-29`
- `stage13_inventory_report=tmp/stage13_inventory_compact.txt`
- `learner_scoped_account_courses_existing=yes`
- `account_course_detail_existing=yes`
- `lesson_progress_existing=yes`
- `completion_document_hook_existing=yes`
- `frontend_account_learning_client_existing=yes`
- `stage13_inventory_runtime_changed=no`

## 13. Stage 13.1 backend learning flow contract tests - 2026-05-29

Goal: record focused backend contract verification for the existing learner-scoped account learning flow.

Verification result:
- current local git head before checkpoint: `7aae3d8`;
- focused account course detail and lesson progress tests passed: `7 passed`;
- selected account learning flow tests from `test_auth_rbac_admin_api.py` passed: `5 passed`;
- `backend/app/tests/test_account_course_detail_api.py` is accepted as dedicated course detail contract coverage;
- `backend/app/tests/test_account_lesson_progress_api.py` is accepted as dedicated lesson progress and completion contract coverage;
- selected self-enrollment/start/complete tests from `backend/app/tests/test_auth_rbac_admin_api.py` are accepted as existing account flow smoke coverage.

Covered learner API contracts:
- `GET /api/v1/account/courses`;
- `GET /api/v1/account/courses/{enrollment_id}`;
- `POST /api/v1/account/courses/{course_id}/enroll`;
- `POST /api/v1/account/courses/{enrollment_id}/start`;
- `POST /api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete`;
- `POST /api/v1/account/courses/{enrollment_id}/complete`.

Covered behavior:
- learner can list own enrolled courses;
- learner can open own course detail;
- inactive modules and lessons are not exposed in learner detail;
- learner cannot access another learner's enrollment;
- unauthenticated access is rejected;
- learner can complete a lesson;
- lesson completion is idempotent;
- progress counters and percent fields are recalculated;
- required lesson completion is required before course completion;
- completed course cannot be changed;
- self-enrollment accepts active courses;
- duplicate self-enrollment is rejected;
- inactive course self-enrollment is rejected;
- learner can start and complete a self-enrolled course.

Decision:
- Stage 13 continues using the existing `/api/v1/account/courses` learner API.
- A duplicate `/api/v1/learning` namespace must not be introduced for the same flow.
- The next runtime step should be limited to contract hardening or UX polish, not API duplication.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API namespace was added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- `stage13_1_runtime_changed=no`.

Verification markers:
- `Stage 13.1 backend learning flow contract tests - 2026-05-29`
- `focused_account_learning_tests=7_passed`
- `account_flow_smoke_tests=5_passed`
- `existing_account_learning_api_reused=yes`
- `no_learning_namespace_duplication=yes`
- `learner_scoped_ownership_contract_verified=yes`
- `progress_and_completion_contract_verified=yes`
- `stage13_1_runtime_changed=no`

## 14. Stage 13.2 frontend learner progress UX checkpoint - 2026-05-29

Goal: record frontend learner progress UX inventory for the existing account learning flow.

Verification result:
- current local git head before checkpoint: `69a13fc`;
- `frontend/src/pages/AccountPage.jsx` contains account learning API usage;
- `frontend/src/pages/AccountPage.jsx` contains course detail loading;
- `frontend/src/pages/AccountPage.jsx` contains lesson completion action wiring;
- `frontend/src/pages/AccountPage.jsx` contains course start and course completion action wiring;
- `frontend/src/pages/AccountPage.jsx` contains progress fields: `progress_percent` and `required_progress_percent`;
- `frontend/src/pages/AccountPage.jsx` contains lesson counters: `lessons_total`, `lessons_completed`, `required_lessons_total`, `required_lessons_completed`;
- `frontend/src/pages/AccountPage.jsx` contains module and lesson display markers;
- `frontend/src/pages/AccountPage.jsx` contains `LearningProgressDiagnostics`;
- `frontend/src/pages/AccountPage.jsx` contains `CompletionDocumentsDiagnostics`;
- `frontend/src/api/client.js` contains account learning client functions;
- mojibake check for `AccountPage.jsx` returned clean.

Accepted frontend learning functions:
- `getAccountCourses`;
- `getAccountCourseDetail`;
- `completeAccountCourseLesson`;
- `startAccountCourse`;
- `completeAccountCourse`;
- `getAccountDocuments`;
- `downloadAccountDocument`.

Decision:
- Stage 13.2 accepts the existing `AccountPage.jsx` learner progress UX as the current frontend baseline.
- The next runtime step should be focused UX polish only if a concrete gap is found.
- No frontend runtime changes were required for this checkpoint.

Safety notes:
- No runtime code was changed in this checkpoint.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Secrets were not printed.
- `stage13_2_runtime_changed=no`.

Verification markers:
- `Stage 13.2 frontend learner progress UX checkpoint - 2026-05-29`
- `account_page_learning_progress_ux_existing=yes`
- `account_page_lesson_completion_ui_existing=yes`
- `account_page_course_completion_ui_existing=yes`
- `learning_progress_diagnostics_existing=yes`
- `completion_documents_diagnostics_existing=yes`
- `account_learning_client_existing=yes`
- `account_page_mojibake_check=clean`
- `stage13_2_runtime_changed=no`

## 15. Stage 13 final acceptance - 2026-05-29

Goal: record final acceptance of Stage 13 Learning flow / прохождение курсов.

Accepted Stage 13 scope:
- learner course list;
- learner course detail page;
- modules and lessons display;
- lesson completion;
- progress calculation;
- course completion;
- link to generated documents.

Final verification result:
- Stage 13 guard passed;
- Stage 12.8 guard passed;
- Stage 12.7 guard passed;
- project roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- focused account course detail and lesson progress tests were accepted earlier: `7 passed`;
- selected account learning flow smoke tests were accepted earlier: `5 passed`;
- frontend production build passed;
- backend full test suite passed: `214 passed`;
- current learner flow remains on the existing `/api/v1/account/courses` API;
- no duplicate `/api/v1/learning` namespace was introduced.

Production baseline before final acceptance record:
- production git head: `212c1cf`;
- branch: `main`;
- server project path: `/opt/obrportal`;
- backend health endpoint returned OK;
- backend ready endpoint returned OK;
- public ready endpoint returned OK.

Safety notes:
- This final acceptance record is documentation/guard-only.
- No runtime containers need to be rebuilt for this record.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC weakening was introduced.
- Server-local untracked paths `backups/`, `tmp/`, and `docker-compose.override.yml` must remain untouched.
- Secrets were not printed.
- `production_runtime_changed=no`.

Final Stage 13 tag:
- `v0.1.0-stage13-learning-flow-complete`.

Verification markers:
- `Stage 13 final acceptance - 2026-05-29`
- `Stage 13 accepted`
- `learner_course_list_accepted=yes`
- `learner_course_detail_accepted=yes`
- `modules_and_lessons_display_accepted=yes`
- `lesson_completion_accepted=yes`
- `progress_calculation_accepted=yes`
- `course_completion_accepted=yes`
- `document_link_flow_accepted=yes`
- `frontend production build passed`
- `214 passed`
- `v0.1.0-stage13-learning-flow-complete`
