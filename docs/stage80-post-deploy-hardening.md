# Stage 80.5 - Post deploy hardening after Stage 80.4 recovery

stage80_5_post_deploy_hardening_status=implementation_ready
stage80_5_release_manifest_required=yes
stage80_5_guard_required=yes
stage80_5_runtime_changes=no
stage80_5_frontend_runtime_changes=no
stage80_5_backend_runtime_changes=no
stage80_5_database_changes=no
stage80_5_migrations_added=no
stage80_5_safe_backend_deploy_runbook=yes
stage80_5_destructive_volume_command_guard=yes
stage80_5_next_stage=81.1

## Scope

Stage 80.5 records the production recovery evidence after Stage 80.4 and adds a safer operator workflow for backend-only deployments.

This stage is documentation and guard only: no frontend runtime changes, no backend runtime changes, no database migrations, no auth or RBAC changes, no storage changes.

## Production evidence recorded

Stage 80.4 was recovered and deployed on production after an accidental volume-removal command.

Recorded production state: portal.rcdo02.ru, 89.127.203.70, branch develop, production head be38083, backend ok, ready database=ok redis=ok storage=ok, public routes / /catalog /login /admin /documents/verify HTTP 200.

PostgreSQL restored from /opt/obrportal-backups/postgres/postgres-before-stage80-4-20260608T105519Z.sql.

MinIO restore skipped because the available archive contained only MinIO system metadata and no user document files.

## Safety decision

Normal production deployment must use targeted service updates only.

The command docker compose down -v is destructive for production volumes and must not be used in normal deployment.

The safe path for Stage 80.4 style backend-only deployment is docker compose build backend and docker compose up -d backend.

## Acceptance

Stage 80.5 is accepted when release manifest records Stage 80.4 as production_recovered_and_deployed, current stage is 80.5, production checkpoint is Stage 80.4 at head be38083, safe backend deployment runbook exists, guard verifies safety markers, and no runtime or migration changes are introduced.
