# Stage 79.2 - Learner documents UX/API connection plan

learner_documents_ux_api_plan_status=implementation_ready
stage79_2_release_manifest_required=yes
stage79_2_guard_required=yes
stage79_2_docs_only=yes
stage79_2_runtime_changes=no
stage79_2_frontend_runtime_changes=no
stage79_2_backend_runtime_changes=no
stage79_2_database_changes=no
stage79_2_migrations_added=no
stage79_2_next_stage=79.3

## Goal

Prepare a safe implementation plan for learner documents after Stage 79.1 inventory.

This stage does not change runtime behavior. It defines how the learner documents experience should be connected to the existing document pages, document verification page, course completion state, and document-related backend services.

## Stage 79.1 inventory summary

- Scanned text files: 671.
- High-value document-related files: 279.
- Recommended next inventory stage: 79.2.

High-value files selected for planning:
- `backend/app/api/v1/account.py`
- `backend/app/api/v1/admin.py`
- `backend/app/api/v1/auth.py`
- `backend/app/api/v1/org.py`
- `backend/app/api/v1/public.py`
- `backend/app/api/v1/router.py`
- `backend/app/models/__init__.py`
- `backend/app/models/course.py`
- `backend/app/models/course_lesson.py`
- `backend/app/models/course_module.py`
- `backend/app/models/document_generation_event.py`
- `backend/app/models/document_record.py`
- `backend/app/models/enrollment.py`
- `backend/app/models/lesson_progress.py`
- `backend/app/models/organization.py`
- `backend/app/schemas/account.py`
- `backend/app/schemas/admin.py`
- `backend/app/schemas/org.py`
- `backend/app/schemas/public.py`
- `backend/app/services/completion_documents.py`

## Planning decision

Stage 79.2 does not add frontend or backend runtime code.

The next implementation stage should start with a frontend-safe learner documents UX foundation and only introduce backend changes after a concrete endpoint gap is confirmed.

## Recommended next stage

Stage 79.3 - Learner documents UX foundation.

Recommended goal for Stage 79.3:

- improve the learner-facing documents page structure;
- show clear empty, loading, ready, and error states;
- show a course-completion-to-document handoff message;
- keep backend and database unchanged unless the existing API is proven insufficient.

## Safety

- Docs/QA-only.
- Frontend runtime is not changed.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
