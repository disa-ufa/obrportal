# Stage 12.3. Course detail learner workflow

Status: in progress

Stage 12.3 focuses on the public course detail page and the learner journey from course detail to registration, self-enrollment, account progress and document verification.

This stage must stay safe and incremental:

- no database migrations;
- no API contract changes unless a separate backend test is added first;
- no authentication or RBAC weakening;
- no production rebuild without successful local guards;
- no secrets in docs, logs, screenshots or reports;
- all frontend changes must preserve existing public routes;
- all Stage 12.1 learner-account behavior must remain green;
- all Stage 12.2 catalog behavior must remain green;
- production sync must be documented only after successful smoke;
- every UX change must have source markers and a guard;
- every deploy must state whether frontend_runtime_changed or backend_runtime_changed.

## 1. Baseline state

Accepted baseline:

- current git head before Stage 12.3 implementation: 4fd61c4;
- Stage 12.1 account UX polish was completed;
- tag v0.1.0-stage12-1-account-ux-polish exists;
- Stage 12.2 catalog UX polish was completed;
- tag v0.1.0-stage12-2-catalog-ux-polish exists;
- public /courses/:slug route exists;
- public /catalog route exists;
- public /account route exists;
- public /verify-document route exists;
- CourseDetailPage loads public course detail through getPublicCourseDetail;
- CourseDetailPage loads related public courses through getPublicCourses;
- CourseDetailPage loads learner enrollments through getAccountCourses when user is authenticated;
- CourseDetailPage supports self-enrollment through enrollAccountCourse;
- CourseDetailPage stores obrportal_pending_enrollment_slug for anonymous registration flow;
- CourseDetailPage handles 409 enrollment conflict;
- CourseDetailPage renders CourseSelfEnrollmentDiagnostics;
- CourseDetailPage renders CourseOutlineSection;
- CourseDetailPage keeps navigation to catalog, account and verify-document.

## 2. Product goal

Goal:

- make the course detail page more understandable for learners;
- explain what the learner receives after enrollment;
- clarify the next action for anonymous users, learners without enrollment, active learners and completed learners;
- make the relationship between course detail, catalog, account and document verification obvious;
- keep self-enrollment behavior safe and predictable;
- preserve all existing Stage 12.1 and Stage 12.2 behavior.

## 3. User states

The course detail workflow must explicitly handle these states:

- anonymous visitor;
- authenticated learner without enrollment;
- authenticated learner with assigned enrollment;
- authenticated learner with active enrollment;
- authenticated learner with completed enrollment;
- authenticated learner with cancelled enrollment;
- loading course detail;
- course detail not found;
- course with no modules;
- course with modules but no lessons;
- course with optional lessons only;
- self-enrollment loading;
- self-enrollment success;
- self-enrollment error;
- self-enrollment conflict 409.

## 4. Course detail page contract

CourseDetailPage must keep these behavior markers:

- import getPublicCourseDetail from frontend API client;
- import getPublicCourses from frontend API client;
- import getAccountCourses from frontend API client;
- import enrollAccountCourse from frontend API client;
- keep formatApiError for API errors;
- keep formatCourseDocument;
- keep formatCoursePrice;
- keep getEnrollmentStatusLabel;
- keep getEnrollmentStatusTone;
- keep getCourseLessonTypeLabel;
- keep getCourseStructureStats;
- keep getCourseDetailDiagnostics;
- keep CourseSelfEnrollmentDiagnostics;
- keep CourseOutlineSection;
- keep getPrimaryActionLabel;
- keep action label Зарегистрироваться и записаться;
- keep action label Записаться;
- keep action label Открыть личный кабинет;
- keep action label Посмотреть документы в кабинете;
- keep pending enrollment slug obrportal_pending_enrollment_slug;
- keep successful enrollment message Курс добавлен в личный кабинет;
- keep 409 enrollment conflict handling;
- keep not found fallback Программа не найдена;
- keep loading state Загружаем карточку программы;
- keep navigation back to catalog;
- keep navigation to account;
- keep navigation to verify-document;
- keep related courses navigation through onOpenCourse(item.slug).

## 5. Route contract

Public routing must preserve:

- /courses/:slug;
- /catalog;
- /account;
- /login;
- /register;
- /verify-document;
- PublicRoutes;
- CourseDetailPublicRoute;
- handleNavigatePublicPage;
- handleOpenPublicCourse.

## 6. API contract

Stage 12.3 starts without API changes.

Existing API calls that must remain stable:

- GET /api/v1/public/courses;
- GET /api/v1/public/courses/{slug};
- GET /api/v1/account/courses;
- POST /api/v1/account/courses/{course_id}/enroll;
- GET /api/v1/account/summary;
- GET /api/v1/account/documents;
- GET /api/v1/account/documents/{document_id}/download.

## 7. First implementation target

The first safe implementation target is frontend-only course detail UX polish:

- improve the hero/next-step explanation;
- add a compact learner journey block for course detail;
- clarify what happens after enrollment;
- clarify document verification after completion;
- keep all API calls unchanged;
- keep Stage 12.1 smoke green;
- keep Stage 12.2 catalog guard green;
- add source markers to guard before production deploy.

## 8. Acceptance checks

Local acceptance must include:

- python scripts/check_stage12_3_course_detail_learner_workflow.py;
- python scripts/check_stage12_2_catalog_learner_workflow.py;
- python scripts/smoke_stage12_1_account_workflow.py;
- python scripts/check_stage12_1_account_contract.py;
- python scripts/check_stage12_1_learner_account_workflow.py;
- python scripts/check_stage12_product_roadmap.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py;
- docker compose exec frontend npm run build.

## 9. Production acceptance

Production acceptance must include:

- git head check;
- tag check when relevant;
- Stage 12.3 guard passed;
- Stage 12.2 catalog guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner workflow guard passed;
- Stage 12 product roadmap guard passed;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend health healthy;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed must be explicit;
- backend_runtime_changed must be explicit;
- RESULT=PASSED.

## 10. Safety boundaries

Do not do these inside Stage 12.3 without a separate explicit checkpoint:

- no database schema changes;
- no auth token storage changes;
- no permission model changes;
- no admin API refactor;
- no learner account API refactor;
- no public course API refactor;
- no document generation changes;
- no Caddy/Nginx production config changes;
- no production backend restart for frontend-only UX changes.

## 11. Current checkpoint

Current checkpoint:

- Stage 12.3 course detail learner workflow document created;
- Stage 12.3 course detail learner workflow guard created;
- initial Stage 12.3 scope is documentation and contract only;
- implementation has not changed runtime yet;
- frontend_runtime_changed=no;
- backend_runtime_changed=no.

## 12. Stage 12.3 course detail workflow docs sync - 2026-05-27

Status: accepted

Stage 12.3 course detail learner workflow documentation and guard were synced to production and accepted.

Accepted evidence:

- production git head: 9329159;
- Stage 12.3 course detail learner workflow guard passed;
- Stage 12.2 catalog learner workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- Stage 12.2 catalog UX polish tag head verified: 1d5c91f;
- Stage 12.3 document title marker was present;
- Stage 12.3 baseline head marker was present;
- Stage 12.3 guard created marker was present;
- source marker CourseDetailPage was present;
- source marker CourseSelfEnrollmentDiagnostics was present;
- source marker CourseOutlineSection was present;
- source marker obrportal_pending_enrollment_slug was present;
- source marker err.status === 409 was present;
- source marker register and enroll action was present;
- source marker account action was present;
- source marker document action was present;
- route marker /courses/:slug was present;
- route marker CourseDetailPublicRoute was present;
- API marker getPublicCourseDetail was present;
- API marker enrollAccountCourse was present;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=no;
- backend_runtime_changed=no;
- stage12_3_course_detail_workflow_docs_sync=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_3_1_course_detail_workflow_docs_sync_20260527195749.txt

## 13. Stage 12.3 course detail learner journey hint - 2026-05-27

Status: implemented locally

Stage 12.3 adds a frontend-only learner journey hint to the public course detail page.

Implementation boundaries:

- frontend-only change;
- no database migrations;
- no API changes;
- no backend runtime changes;
- no auth or RBAC changes;
- existing self-enrollment behavior remains unchanged;
- existing CourseSelfEnrollmentDiagnostics remains rendered;
- existing CourseOutlineSection remains rendered;
- existing catalog, account and verify-document navigation remains unchanged.

Source markers:

- CourseDetailLearnerJourneyHint;
- course-detail-learner-journey;
- course-detail-learner-journey-steps;
- course-detail-learner-journey-next-step;
- course-detail-learner-journey-primary-action;
- course-detail-learner-journey-account-action;
- course-detail-learner-journey-verify-action;
- Карточка курса → запись → личный кабинет;
- После записи курс откроется в личном кабинете;
- CourseDetailLearnerJourneyHint is rendered before CourseSelfEnrollmentDiagnostics.

## 14. Stage 12.3 course detail learner journey hint frontend deploy - 2026-05-27

Status: accepted

Stage 12.3 course detail learner journey hint was deployed to the production static frontend and accepted.

Accepted evidence:

- production git head: 763ba3b;
- Stage 12.3 course detail learner workflow guard passed;
- Stage 12.2 catalog learner workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- Stage 12.2 catalog UX polish tag head verified: 1d5c91f;
- source marker CourseDetailLearnerJourneyHint was present;
- source marker CourseDetailLearnerJourneyHint render was present;
- source marker course detail learner journey test id was present;
- source marker course detail learner journey steps test id was present;
- source marker course detail learner journey next step test id was present;
- source marker course detail learner journey primary action test id was present;
- source marker course detail learner journey account action test id was present;
- source marker course detail learner journey verify action test id was present;
- source marker course detail learner journey heading was present;
- source marker course detail next step text was present;
- source marker CourseDetailLearnerJourneyHint before diagnostics was present;
- source marker primary handler handleEnroll was present;
- doc marker course detail journey section was present;
- doc marker frontend-only journey boundary was present;
- frontend static image was rebuilt;
- frontend container was recreated;
- frontend health became healthy;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- stage12_3_course_detail_journey_hint_frontend_deploy=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_3_3_course_detail_journey_hint_frontend_deploy_20260527201137.txt

## 15. Stage 12.3 course detail empty and service states - 2026-05-27

Status: implemented locally

Stage 12.3 improves course detail service and empty states for loading, missing course detail, course without modules and module without lessons.

Implementation boundaries:

- frontend-only change;
- no database migrations;
- no API changes;
- no backend runtime changes;
- no auth or RBAC changes;
- existing CourseDetailLearnerJourneyHint remains rendered before CourseSelfEnrollmentDiagnostics;
- existing self-enrollment behavior remains unchanged;
- existing CourseOutlineSection remains rendered.

Source markers:

- CourseDetailServiceState;
- course-detail-loading-state;
- course-detail-not-found-state;
- course-detail-state-title;
- course-detail-state-description;
- course-detail-state-catalog-action;
- course-detail-state-verify-action;
- CourseOutlineEmptyState;
- CourseOutlineModuleEmptyState;
- course-outline-empty-state;
- course-outline-module-empty-state;
- course-outline-empty-title;
- course-outline-module-empty-title;
- Загружаем карточку программы;
- По этому адресу нет опубликованной карточки курса;
- Программа курса пока готовится к публикации;
- Уроки в этом модуле пока готовятся.

## 16. Stage 12.3 course detail empty states frontend deploy - 2026-05-27

Status: accepted

Stage 12.3 course detail empty and service states were deployed to the production static frontend and accepted.

Accepted evidence:

- production git head: cbb5d3a;
- Stage 12.3 course detail learner workflow guard passed;
- Stage 12.2 catalog learner workflow guard passed;
- Stage 12.1 account workflow smoke passed;
- Stage 12.1 account contract guard passed;
- Stage 12.1 learner account workflow guard passed;
- Stage 12 product roadmap guard passed;
- CI/local gate guard passed;
- text encoding guard passed;
- source BOM guard passed;
- Stage 12.2 catalog UX polish tag head verified: 1d5c91f;
- source marker CourseDetailServiceState was present;
- source marker course-detail-loading-state was present;
- source marker course-detail-not-found-state was present;
- source marker course-detail-state-title was present;
- source marker course-detail-state-description was present;
- source marker course-detail-state-catalog-action was present;
- source marker course-detail-state-verify-action was present;
- source marker CourseOutlineEmptyState was present;
- source marker CourseOutlineModuleEmptyState was present;
- source marker course-outline-empty-state was present;
- source marker course-outline-module-empty-state was present;
- source marker CourseDetailServiceState loading render was present;
- source marker CourseOutlineEmptyState render was present;
- source marker CourseOutlineModuleEmptyState render was present;
- source marker loading text was present;
- source marker not found text was present;
- source marker course outline empty text was present;
- source marker course outline module empty text was present;
- doc marker course detail empty states section was present;
- doc marker frontend-only boundary was present;
- doc marker no API changes was present;
- doc marker no backend runtime changes was present;
- frontend static image was rebuilt;
- frontend container was recreated;
- frontend health became healthy;
- production incident runbook guard passed;
- production release runbook guard passed;
- production monitoring runbook guard passed;
- production restore drill runbook guard passed;
- production operations runbook guard passed;
- frontend static serving guard passed;
- production frontend static runbook guard passed;
- frontend image: obrportal-frontend-static:prod;
- frontend command: nginx -g daemon off;
- frontend health: healthy;
- frontend restart policy: unless-stopped;
- public /catalog returned HTTP 200;
- public /account returned HTTP 200;
- public /verify-document returned HTTP 200;
- public /api/v1/ready returned database=ok, redis=ok, storage=ok;
- secrets_printed=no;
- frontend_runtime_changed=yes;
- backend_runtime_changed=no;
- stage12_3_course_detail_empty_states_frontend_deploy_retry=passed;
- stage12_3_course_detail_empty_states_frontend_deploy=passed.

Accepted production report:

- /opt/obrportal/tmp/stage_12_3_5_course_detail_empty_states_frontend_deploy_retry_20260527203631.txt

## 17. Stage 12.3 course detail UX polish checkpoint tag - 2026-05-27

Status: accepted

Stage 12.3 course detail UX polish checkpoint tag was created and pushed to the remote repository.

Accepted evidence:

- checkpoint tag: v0.1.0-stage12-3-course-detail-ux-polish;
- tagged git head: 5f88a8c;
- tag message: Stage 12.3 course detail UX polish checkpoint: learner journey hint, empty states, guards, runtime smoke and production deploy;
- tag was pushed to origin;
- develop, origin/develop, main and origin/main were aligned at 5f88a8c;
- Stage 12.3 course detail learner workflow document was accepted;
- Stage 12.3 course detail learner journey hint was deployed and accepted;
- Stage 12.3 course detail empty states were deployed and accepted;
- Stage 12.3 course detail learner workflow guard was accepted;
- Stage 12.2 catalog workflow guard remained green;
- Stage 12.1 account workflow smoke remained green;
- production docs sync passed before tag creation.
