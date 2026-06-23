# Stage 82.20 - organization learning overview

stage82_20_status=organization_learning_overview_implemented
stage82_20_release_manifest_required=yes
stage82_20_guard_required=yes
stage82_20_frontend_changed=yes
stage82_20_backend_changed=yes
stage82_20_server_touched=no
stage82_20_data_changed=no
stage82_20_runtime_rebuild_required=yes
stage82_20_runtime_restart_required=yes
stage82_20_database_migration_required=no
stage82_20_cleanup_performed=no
stage82_20_decision=show_organization_learning_overview
stage82_20_next_stage=82.21

## Scope

Stage 82.20 adds a global learning overview to the organization cabinet.

Organization representatives can see a summary across all accessible organization enrollments without opening every group:

- total enrollments;
- assigned enrollments;
- active/in-progress enrollments;
- completed enrollments;
- completed enrollments without documents;
- published documents;
- draft documents;
- revoked documents;
- top groups with quick navigation.

## Implemented behavior

- added `GET /api/v1/org/enrollments`;
- reused organization enrollment document metadata from Stage 82.19;
- added organization enrollments API client;
- added organization learning overview panel;
- added summary counters for learning and document states;
- added quick group navigation from the overview;
- kept database schema unchanged.

## Runtime impact

- backend runtime changed;
- frontend runtime changed;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.20 is accepted when:

- Stage 82.20 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- backend py_compile passes;
- frontend build passes;
- `git diff --check` passes.
