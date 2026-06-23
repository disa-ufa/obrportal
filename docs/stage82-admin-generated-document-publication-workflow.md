# Stage 82.18 - admin generated document publication workflow

stage82_18_status=admin_generated_document_publication_workflow_implemented
stage82_18_release_manifest_required=yes
stage82_18_guard_required=yes
stage82_18_frontend_changed=yes
stage82_18_backend_changed=no
stage82_18_server_touched=no
stage82_18_data_changed=no
stage82_18_runtime_rebuild_required=yes
stage82_18_runtime_restart_required=yes
stage82_18_database_migration_required=no
stage82_18_cleanup_performed=no
stage82_18_decision=add_admin_generated_document_publication_queue
stage82_18_next_stage=82.19

## Scope

Stage 82.18 improves the administrator workflow for automatically generated completion documents.

The backend already creates completion PDF documents as draft records after course completion. Stage 82.18 adds a dedicated admin workflow panel that surfaces generated PDFs that are ready for publication.

This stage remains frontend-only.

## Implemented behavior

- added Stage 82.18 marker;
- added generated document publication workflow labels;
- added generated document publication workflow stats helper;
- added workflow focus helper;
- added dedicated admin publication queue panel;
- added summary counters for ready drafts, waiting drafts, published generated PDFs and revoked generated PDFs;
- added quick links for generated documents;
- added ready-to-publish preview list;
- added publish action for generated PDF drafts;
- kept backend and database unchanged.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.18 is accepted when:

- Stage 82.18 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
