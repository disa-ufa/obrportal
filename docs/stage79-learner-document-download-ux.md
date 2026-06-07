# Stage 79.5 - Learner document download UX integration

learner_document_download_ux_status=implementation_ready
stage79_5_release_manifest_required=yes
stage79_5_guard_required=yes
stage79_5_frontend_only=yes
stage79_5_backend_runtime_changes=no
stage79_5_database_changes=no
stage79_5_migrations_added=no

## Goal

Improve the learner-facing document download and open-document experience on the documents page.

This stage connects available learner documents, completed courses, verification navigation, and download/open actions into one clear frontend-only block.

## Frontend behavior

- Adds a learner document download UX panel to the documents page.
- Shows downloadable documents count.
- Shows available documents count.
- Shows completed courses waiting for document publication.
- Shows verification-ready documents count.
- Shows a primary document card when a document is available.
- Adds actions to open/download, verify, view available documents, view completed enrollments, and view all documents.
- Keeps existing document registry, filters, diagnostics, QR, and verification flows.

## Safety

- Frontend-only.
- Backend runtime is not changed.
- Database schema is not changed.
- No migrations are added.
- Auth/RBAC is not changed.
- Production config is not changed.
