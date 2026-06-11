# Stage 82.15 - learner document availability handoff

stage82_15_status=learner_document_availability_handoff_implemented
stage82_15_release_manifest_required=yes
stage82_15_guard_required=yes
stage82_15_frontend_changed=yes
stage82_15_backend_changed=no
stage82_15_server_touched=no
stage82_15_data_changed=no
stage82_15_runtime_rebuild_required=yes
stage82_15_runtime_restart_required=yes
stage82_15_database_migration_required=no
stage82_15_cleanup_performed=no
stage82_15_decision=show_document_availability_after_course_completion
stage82_15_next_stage=82.16

## Scope

Stage 82.15 improves the learner document handoff after course completion.

The backend already exposes account documents with filters by `course_id` and `enrollment_id`, including `file_available`, `download_available`, `download_url`, `document_number`, and `verification_code`.

This stage remains frontend-only.

## Implemented behavior

- added Stage 82.15 marker;
- extended `getAccountDocuments` frontend client to support filters;
- added account document loading on course detail page;
- added document availability states: available, draft, revoked, pending, loading, error, waiting completion, no enrollment;
- added document card with number, verification code, issued date;
- added download action for available documents;
- added public verification action;
- added QR/public verification block;
- refreshed account documents after course completion.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.15 is accepted when:

- Stage 82.15 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
