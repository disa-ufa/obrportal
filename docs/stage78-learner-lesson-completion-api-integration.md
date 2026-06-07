# Stage 78.6 - Learner lesson completion API integration

stage78_6_status=implementation_ready
stage78_6_release_manifest_required=yes
stage78_6_guard_required=yes
stage78_6_frontend_only=yes
stage78_6_uses_existing_backend_endpoint=yes
stage78_6_database_changed=no
stage78_6_migrations_added=no

## Goal

Connect the learner-facing lesson completion UX to the existing account API.

The public course detail page now loads account course detail for an enrolled learner and uses real lesson completion state from backend-owned data.

## Existing backend/API used

- GET /api/v1/account/courses/{enrollment_id}
- POST /api/v1/account/courses/{enrollment_id}/lessons/{lesson_id}/complete

No backend route is added in this stage.

## Frontend behavior

- Loads account course detail when the learner is enrolled.
- Merges account course modules/lessons into the learner-facing course panels.
- Shows real progress percent from account course detail.
- Selects the first not-completed available lesson as the next learner action.
- Adds a real mark lesson as completed action.
- Calls completeAccountCourseLesson(enrollmentId, lessonId).
- Updates course detail, enrollment status, lesson completion state, and progress after successful API response.
- Shows loading, success, and error states.

## Safety

- Frontend-only.
- Existing backend endpoint is reused.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
