# Stage 78.7 - Learner course completion API integration

stage78_7_status=implementation_ready
stage78_7_release_manifest_required=yes
stage78_7_guard_required=yes
stage78_7_frontend_only=yes
stage78_7_uses_existing_backend_endpoint=yes
stage78_7_database_changed=no
stage78_7_migrations_added=no

## Goal

Connect the learner-facing course completion UX to the existing account API.

The public course detail page now checks required lesson progress and lets an enrolled learner complete the course through the existing backend endpoint.

## Existing backend/API used

- POST /api/v1/account/courses/{enrollment_id}/complete
- GET /api/v1/account/courses/{enrollment_id}

No backend route is added in this stage.

## Frontend behavior

- Adds a course completion panel after the lesson completion panel.
- Shows required lesson progress and total lesson progress.
- Enables the course completion action when required lessons are completed.
- Calls completeAccountCourse(enrollmentId).
- Refreshes account course detail after completion when needed.
- Updates enrollment status and course completion state.
- Shows loading, success, and error states.
- Provides handoff buttons to account and documents.

## Safety

- Frontend-only.
- Existing backend endpoint is reused.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
