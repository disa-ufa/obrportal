# Stage 79.4 - Learner document verification UX integration

learner_document_verification_ux_status=implementation_ready
stage79_4_release_manifest_required=yes
stage79_4_guard_required=yes
stage79_4_frontend_only=yes
stage79_4_backend_runtime_changes=no
stage79_4_database_changes=no
stage79_4_migrations_added=no

## Goal

Improve the learner-facing verification bridge on the public document verification page.

This stage connects the documents flow with the verification flow and explains what the learner should do before, during, and after verification.

## Frontend behavior

- Adds a learner verification UX panel to the public verification page.
- Shows current verification status.
- Shows query, QR readiness, result state, and next step.
- Adds navigation actions back to documents, contacts, and catalog.
- Keeps existing public verification form, diagnostics, QR operations, result card, and not-found/error states.

## Safety

- Frontend-only.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
