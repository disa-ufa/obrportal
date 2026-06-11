# Stage 82.22 - organization attention CSV export

stage82_22_status=organization_attention_csv_export_implemented
stage82_22_release_manifest_required=yes
stage82_22_guard_required=yes
stage82_22_frontend_changed=yes
stage82_22_backend_changed=no
stage82_22_server_touched=no
stage82_22_data_changed=no
stage82_22_runtime_rebuild_required=yes
stage82_22_runtime_restart_required=yes
stage82_22_database_migration_required=no
stage82_22_cleanup_performed=no
stage82_22_decision=export_organization_attention_lists_to_csv
stage82_22_next_stage=82.23

## Scope

Stage 82.22 adds CSV export for organization attention lists.

Organization representatives can download the selected attention list as a CSV file:

- completed without document;
- draft PDF documents;
- published documents;
- revoked documents;
- active learning.

## Implemented behavior

- reused the existing frontend CSV utility;
- added export columns for learner, organization, group, course, learning status and document status;
- added document number, verification code and public verification path to the export;
- exports all rows matching the selected filter, not only visible preview rows;
- kept backend/API/database unchanged.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.22 is accepted when:

- Stage 82.22 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
