# Stage 81.3 - Production data preflight snapshot

stage81_3_production_data_preflight_snapshot_status=implementation_ready
stage81_3_release_manifest_required=yes
stage81_3_guard_required=yes
stage81_3_runtime_changes=no
stage81_3_frontend_runtime_changes=no
stage81_3_backend_runtime_changes=no
stage81_3_database_changes=no
stage81_3_migrations_added=no
stage81_3_production_deploy_required=no
stage81_3_production_data_changed=no
stage81_3_backup_created=yes
stage81_3_snapshot_report_recorded=yes
stage81_3_next_stage=81.4

## Scope

Stage 81.3 records the production data preflight snapshot before any production data initialization.

This stage is documentation and guard only.

## Production evidence

Snapshot report:

`/opt/obrportal/tmp/stage81_3_production_data_preflight_snapshot_20260608T123756Z.txt`

PostgreSQL backup:

`/opt/obrportal-backups/postgres/postgres-before-stage81-3-data-preflight-20260608T123756Z.sql`

Recorded production state:

- host: `portal.rcdo02.ru`;
- IP: `89.127.203.70`;
- branch: `develop`;
- head: `c427665`;
- tag at head: `v0.1.0-stage81-2-production-data-init-plan`;
- ready endpoint: `database=ok`, `redis=ok`, `storage=ok`;
- public routes `/`, `/catalog`, `/login`, `/admin`, `/documents/verify`: HTTP 200;
- containers were not restarted;
- migrations were not run;
- production data was not changed;
- PostgreSQL backup was created and verified.

## Production table counts

Snapshot counts:

- users: 3;
- roles: 9;
- permissions: 43;
- role_permissions: 110;
- user_roles: 2;
- audit_events: 63;
- organizations: 0;
- learning_groups: 0;
- learning_group_members: 0;
- courses: 0;
- course_modules: 0;
- course_lessons: 0;
- enrollments: 0;
- lesson_progress: 0;
- document_records: 0;
- document_generation_events: 0.

Database version:

`6421_org_doc_profile`

## Notes

The production business tables are empty and ready for intentional additive initialization.

One inactive user record has an unexpected email-like value that appears to contain a shell prompt fragment. It must not be manually removed without a separate backup-backed cleanup decision.

## Safety decision

Stage 81.3 only records the snapshot. It does not initialize production data.

Forbidden in this stage:

- `docker compose down -v`;
- `ResetVolumes`;
- destructive reseed;
- table truncation;
- manual user cleanup;
- migration execution;
- container rebuild or restart.

## Acceptance

Stage 81.3 is accepted when:

- release manifest current_stage is 81.3;
- production checkpoint remains Stage 80.4 runtime;
- Stage 81.2 remains recorded as the additive-only production data plan;
- snapshot report path is recorded;
- PostgreSQL backup path is recorded;
- backup verification is recorded;
- table counts are recorded;
- no backend runtime changes are introduced;
- no frontend runtime changes are introduced;
- no database migrations are introduced;
- no production deployment is required.
