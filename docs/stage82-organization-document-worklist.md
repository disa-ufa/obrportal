# Stage 82.19 - organization document worklist

stage82_19_status=organization_document_worklist_implemented
stage82_19_release_manifest_required=yes
stage82_19_guard_required=yes
stage82_19_frontend_changed=yes
stage82_19_backend_changed=yes
stage82_19_server_touched=no
stage82_19_data_changed=no
stage82_19_runtime_rebuild_required=yes
stage82_19_runtime_restart_required=yes
stage82_19_database_migration_required=no
stage82_19_cleanup_performed=no
stage82_19_decision=show_organization_document_worklist
stage82_19_next_stage=82.20

## Scope

Stage 82.19 adds a document worklist to the organization cabinet.

Organization representatives can see document states for completed group enrollments:

- completed without document;
- generated draft;
- published and publicly verifiable;
- revoked.

This stage extends the existing organization group enrollments API response with document metadata. No database migration is required.

## Implemented behavior

- added document metadata to organization enrollment response;
- added document item schema for organization enrollments;
- added organization document worklist panel;
- added summary counters for document states;
- added public verification link for published documents;
- added document mini-status to enrollment cards;
- kept database schema unchanged.

## Runtime impact

- backend runtime changed;
- frontend runtime changed;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.19 is accepted when:

- Stage 82.19 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- backend py_compile passes;
- frontend build passes;
- `git diff --check` passes.
