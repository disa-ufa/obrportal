# Stage 81.1 - Demo learning e2e recovery verification

stage81_1_demo_learning_e2e_verification_status=implementation_ready
stage81_1_release_manifest_required=yes
stage81_1_guard_required=yes
stage81_1_runtime_changes=no
stage81_1_frontend_runtime_changes=no
stage81_1_backend_runtime_changes=no
stage81_1_database_changes=no
stage81_1_migrations_added=no
stage81_1_production_deploy_required=no
stage81_1_local_bootstrap_with_demo_learning=yes
stage81_1_next_stage=81.2

## Scope

Stage 81.1 records the successful local demo learning e2e verification after Stage 80.4 production recovery and Stage 80.5 post-deploy hardening.

This stage is documentation and guard only.

## Verified local command

The verified local command was:

.\scripts\local_bootstrap.ps1 -ResetVolumes -WithDemoLearning

## Verified result

The local bootstrap completed successfully and confirmed:

- Docker Compose local environment was recreated;
- PostgreSQL and MinIO local volumes were reset;
- migrations were applied up to 6421_org_doc_profile;
- base roles, permissions, admin user, learner user, organization seed completed;
- demo learning seed completed for Demo Course and Demo Group;
- health and ready checks passed after seeds;
- smoke checks passed;
- learner self-enrollment flow passed;
- lesson completion and course completion passed;
- draft document creation after course completion passed;
- admin publication of generated document passed;
- learner PDF download passed;
- public document verification by number and code passed;
- document revoke and restore flow passed;
- frontend smoke coverage guard passed;
- backend smoke coverage guard passed.

## Safety decision

The command with ResetVolumes is allowed only for local Docker Desktop verification.

It must not be used on production.

Production remains at Stage 80.4 runtime with Stage 80.5 docs/guard hardening synced to the server.

## Acceptance

Stage 81.1 is accepted when:

- release manifest current_stage is 81.1;
- Stage 80.5 remains the latest repository hardening checkpoint;
- Stage 81.1 records the local demo learning e2e success;
- a guard verifies this document and release manifest markers;
- no backend runtime changes are introduced;
- no frontend runtime changes are introduced;
- no database migrations are introduced;
- no production deployment is required.
