# Stage 78.8 - Learner document handoff UX

stage78_8_status=implementation_ready
stage78_8_release_manifest_required=yes
stage78_8_guard_required=yes
stage78_8_frontend_only=yes
stage78_8_database_changed=no
stage78_8_migrations_added=no

## Goal

Add a clear learner-facing handoff from completed course status to final documents.

The course detail page now explains what happens with the final document, where the learner should go next, and how the document can be checked.

## Frontend behavior

- Adds a learner document handoff panel after the course completion panel.
- Shows the final document type.
- Shows document readiness based on enrollment completion status.
- Shows the completed timestamp when available.
- Explains the next step for completed and not-yet-completed states.
- Adds navigation actions:
  - documents section;
  - account section;
  - document verification page.

## Safety

- Frontend-only.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
