# Stage 81.2 - Production-safe data initialization plan

stage81_2_production_data_initialization_plan_status=implementation_ready
stage81_2_release_manifest_required=yes
stage81_2_guard_required=yes
stage81_2_runtime_changes=no
stage81_2_frontend_runtime_changes=no
stage81_2_backend_runtime_changes=no
stage81_2_database_changes=no
stage81_2_migrations_added=no
stage81_2_production_deploy_required=no
stage81_2_production_data_reset_allowed=no
stage81_2_safe_additive_seed_required=yes
stage81_2_next_stage=81.3

## Scope

Stage 81.2 records the production-safe data initialization plan after Stage 81.1 confirmed the local demo learning e2e flow.

This stage is documentation and guard only.

## Background

Production runtime is healthy, but business tables require intentional content filling before real use.

The local demo flow is verified, but local demo reset commands must not be used on production.

## Required production data groups

- organization profile and public organization information;
- real course or program records;
- course modules;
- course lessons;
- learner users or import source;
- learning groups;
- enrollments;
- document issuance rules;
- document verification rules;
- initial admin review checklist.

## Safety decision

Production data initialization must be additive.

Allowed strategy:

- create missing records only;
- preserve existing users, roles, permissions, audit events, courses, enrollments, documents and storage;
- run preflight counts before data changes;
- run post-change counts after data changes;
- keep a PostgreSQL backup before any production data command;
- avoid deleting or resetting production volumes.

Forbidden on production:

- docker compose down -v;
- ResetVolumes;
- local_bootstrap.ps1 -ResetVolumes;
- destructive reseed;
- truncating business tables;
- replacing production storage;
- bypassing auth or RBAC.

## Acceptance

Stage 81.2 is accepted when:

- release manifest current_stage is 81.2;
- production checkpoint remains Stage 80.4 runtime;
- Stage 81.1 remains recorded as local e2e verification;
- this plan defines additive-only production data initialization;
- a production data initialization runbook exists;
- a guard verifies this document and release manifest markers;
- no backend runtime changes are introduced;
- no frontend runtime changes are introduced;
- no database migrations are introduced;
- no production deployment is required.
