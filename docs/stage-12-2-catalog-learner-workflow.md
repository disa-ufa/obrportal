# Stage 12.2. Catalog learner workflow

Status: in progress

Stage 12.2 focuses on the public catalog and the learner journey from catalog discovery to course detail, self-enrollment, and the learner account.

This stage must stay safe and incremental:

- no database migrations;
- no API contract changes unless a separate backend test is added first;
- no authentication or RBAC weakening;
- no production rebuild without successful local guards;
- no secrets in docs, logs, screenshots or reports;
- all frontend changes must preserve existing public routes;
- all learner-account behavior from Stage 12.1 must remain green;
- production sync must be documented only after successful smoke;
- every UX change must have source markers and a guard;
- every deploy must state whether frontend_runtime_changed or backend_runtime_changed.

## 1. Baseline state

Accepted baseline:

- current git head before Stage 12.2 implementation: 333b9fa;
- Stage 12.1 account UX polish was completed;
- tag v0.1.0-stage12-1-account-ux-polish exists;
- public /catalog route exists;
- public /courses/:slug route exists;
- public /account route exists;
- public /verify-document route exists;
- CatalogPage loads public courses through getPublicCourses;
- CatalogPage loads learner enrollments through getAccountCourses when user is authenticated;
- CourseDetailPage loads public course detail through getPublicCourseDetail;
- CourseDetailPage supports self-enrollment through enrollAccountCourse;
- CourseDetailPage stores obrportal_pending_enrollment_slug for anonymous registration flow;
- frontend API client keeps public course endpoints under /api/v1/public/courses;
- frontend API client keeps learner account endpoints under /api/v1/account.

## 2. Product goal

Goal:

- make the catalog more understandable for learners;
- explain what each program includes before enrollment;
- make the next action obvious for anonymous users, learners without enrollment, active learners, and completed learners;
- keep the route chain Catalog -> Course detail -> Register/Login -> Account clear;
- reduce confusion between public catalog, self-enrollment and assigned programs;
- preserve all existing Stage 12.1 learner account behavior.

## 3. User states

The catalog workflow must explicitly handle these states:

- anonymous visitor;
- authenticated learner without enrollments;
- authenticated learner with assigned enrollment;
- authenticated learner with active enrollment;
- authenticated learner with completed enrollment;
- authenticated learner with cancelled enrollment;
- empty public catalog;
- filtered catalog with no results;
- public API loading state;
- public API error state.

## 4. Catalog page contract

CatalogPage must keep these behavior markers:

- import getPublicCourses from frontend API client;
- import getAccountCourses from frontend API client;
- use formatApiError for API errors;
- build enrollment map by course_id and course_slug;
- derive enrollment status label;
- derive enrollment status tone;
- keep action label Подробнее / записаться for courses without enrollment;
- keep action label Открыть в кабинете for courses with active learner enrollment;
- keep action label Программа завершена for completed learner enrollment;
- keep search by title, slug, description, format and document type;
- keep format filter;
- keep resetFilters action;
- keep CatalogDiagnostics section;
- keep catalog-public-diagnostics test id;
- keep catalog-public-status test id;
- keep catalog-public-summary test id;
- keep catalog-public-filters test id;
- keep catalog-public-attention test id;
- keep catalog-public-links test id;
- keep navigation to account;
- keep navigation to verify-document;
- keep course card opening through onOpenCourse(course.slug).

## 5. Course detail contract

CourseDetailPage must keep these behavior markers:

- import getPublicCourseDetail from frontend API client;
- import getPublicCourses from frontend API client;
- import getAccountCourses from frontend API client;
- import enrollAccountCourse from frontend API client;
- keep CourseSelfEnrollmentDiagnostics section;
- keep course-self-enrollment-diagnostics test id;
- keep course-self-enrollment-status test id;
- keep course-self-enrollment-summary test id;
- keep course-self-enrollment-attention test id;
- keep course-self-enrollment-links test id;
- keep anonymous user action Зарегистрироваться и записаться;
- keep learner action Записаться;
- keep enrolled learner action Открыть личный кабинет;
- keep completed learner action Посмотреть документы в кабинете;
- keep pending enrollment slug obrportal_pending_enrollment_slug;
- keep successful enrollment message Курс добавлен в личный кабинет;
- keep 409 enrollment conflict handling;
- keep navigation back to catalog;
- keep navigation to account;
- keep navigation to verify-document.

## 6. Frontend route contract

Public routing must preserve:

- /catalog;
- /courses/:slug;
- /account;
- /login;
- /register;
- /verify-document;
- handleNavigatePublicPage;
- handleOpenPublicCourse;
- PublicRoutes;
- PublicShell.

## 7. API contract

Stage 12.2 starts without API changes.

Existing API calls that must remain stable:

- GET /api/v1/public/courses;
- GET /api/v1/public/courses/{slug};
- GET /api/v1/account/summary;
- GET /api/v1/account/courses;
- POST /api/v1/account/courses/{course_id}/enroll;
- GET /api/v1/account/documents;
- GET /api/v1/account/documents/{document_id}/download.

## 8. First implementation target

The first safe implementation target is frontend-only catalog UX polish:

- improve catalog card visual hierarchy;
- improve empty and filtered states;
- improve action explanation for anonymous and authenticated users;
- add a compact learner journey hint;
- keep all existing API calls unchanged;
- keep Stage 12.1 smoke green;
- add source markers to guard before production deploy.

## 9. Acceptance checks

Local acceptance must include:

- python scripts/check_stage12_2_catalog_learner_workflow.py;
- python scripts/smoke_stage12_1_account_workflow.py;
- python scripts/check_stage12_1_account_contract.py;
- python scripts/check_stage12_1_learner_account_workflow.py;
- python scripts/check_stage12_product_roadmap.py;
- python scripts/check_ci_local_gate.py;
- python scripts/check_text_encoding.py;
- python scripts/check_source_bom.py;
- docker compose exec frontend npm run build.

## 10. Production acceptance

Production acceptance must include:

- git head check;
- tag check when relevant;
- Stage 12.2 guard passed;
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

## 11. Safety boundaries

Do not do these inside Stage 12.2 without a separate explicit checkpoint:

- no database schema changes;
- no auth token storage changes;
- no permission model changes;
- no admin API refactor;
- no learner account API refactor;
- no document generation changes;
- no Caddy/Nginx production config changes;
- no production backend restart for frontend-only UX changes.

## 12. Current checkpoint

Current checkpoint:

- Stage 12.2 catalog learner workflow document created;
- Stage 12.2 catalog learner workflow guard created;
- initial Stage 12.2 scope is documentation and contract only;
- implementation has not changed runtime yet;
- frontend_runtime_changed=no;
- backend_runtime_changed=no.
