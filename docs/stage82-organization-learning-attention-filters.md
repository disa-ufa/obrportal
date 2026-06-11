# Stage 82.21 - organization learning attention filters

stage82_21_status=organization_learning_attention_filters_implemented
stage82_21_release_manifest_required=yes
stage82_21_guard_required=yes
stage82_21_frontend_changed=yes
stage82_21_backend_changed=no
stage82_21_server_touched=no
stage82_21_data_changed=no
stage82_21_runtime_rebuild_required=yes
stage82_21_runtime_restart_required=yes
stage82_21_database_migration_required=no
stage82_21_cleanup_performed=no
stage82_21_decision=show_organization_learning_attention_filters
stage82_21_next_stage=82.22

## Scope

Stage 82.21 adds quick attention lists to the organization learning overview.

Organization representatives can quickly open concrete enrollments from the summary:

- completed without document;
- draft PDF documents;
- published documents;
- revoked documents;
- active learning.

## Implemented behavior

- added quick filter buttons to organization learning overview;
- added filtered enrollment lists;
- added group navigation from each attention item;
- added public verification link for published documents;
- kept backend/API/database unchanged.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.21 is accepted when:

- Stage 82.21 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
