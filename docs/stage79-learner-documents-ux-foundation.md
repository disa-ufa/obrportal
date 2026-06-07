# Stage 79.3 - Learner documents UX foundation

learner_documents_ux_foundation_status=implementation_ready
stage79_3_release_manifest_required=yes
stage79_3_guard_required=yes
stage79_3_frontend_only=yes
stage79_3_backend_runtime_changes=no
stage79_3_database_changes=no
stage79_3_migrations_added=no

## Goal

Add a learner-facing UX foundation to the documents page.

This stage improves the documents page with a clear learner-oriented summary while keeping the existing admin document registry intact.

## Frontend behavior

- Adds a learner documents UX foundation panel.
- Shows available documents count.
- Shows completed course/enrollment count.
- Shows completed courses that are still waiting for a published document.
- Shows verification-ready documents count.
- Shows loading, error, and empty states.
- Shows a completed-course-to-document handoff message.
- Shows the nearest available document card when one exists.
- Adds navigation actions for available documents, completed enrollments, all documents, and document verification.

## Safety

- Frontend-only.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
