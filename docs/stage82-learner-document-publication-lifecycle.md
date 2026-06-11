# Stage 82.17 - learner document publication lifecycle

stage82_17_status=learner_document_publication_lifecycle_implemented
stage82_17_release_manifest_required=yes
stage82_17_guard_required=yes
stage82_17_frontend_changed=yes
stage82_17_backend_changed=no
stage82_17_server_touched=no
stage82_17_data_changed=no
stage82_17_runtime_rebuild_required=yes
stage82_17_runtime_restart_required=yes
stage82_17_database_migration_required=no
stage82_17_cleanup_performed=no
stage82_17_decision=explain_document_publication_lifecycle_to_learner
stage82_17_next_stage=82.18

## Scope

Stage 82.17 improves learner understanding of the final document lifecycle.

The backend already creates a completion document after course completion, and the document can remain in draft until publication. This stage explains that lifecycle to the learner without changing backend publication policy.

This stage remains frontend-only.

## Implemented behavior

- added Stage 82.17 marker;
- added document publication lifecycle labels;
- added lifecycle state helper;
- added lifecycle step helper;
- added lifecycle summary helper;
- added lifecycle panel into the learner document handoff block;
- added lifecycle steps: course completion, generation, publication, download and verification;
- added visual states: done, current, blocked, issue;
- kept backend and database unchanged.

## Runtime impact

- frontend runtime changed;
- backend runtime unchanged;
- no database migration;
- no production data changes.

## Acceptance

Stage 82.17 is accepted when:

- Stage 82.17 guard passes;
- release manifest guard passes;
- source/text/TODO guards pass;
- frontend build passes;
- `git diff --check` passes.
