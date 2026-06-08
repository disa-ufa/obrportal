# Stage 81.4 - Production data cleanup decision and content strategy

stage81_4_production_data_cleanup_content_strategy_status=implementation_ready
stage81_4_release_manifest_required=yes
stage81_4_guard_required=yes
stage81_4_runtime_changes=no
stage81_4_frontend_runtime_changes=no
stage81_4_backend_runtime_changes=no
stage81_4_database_changes=no
stage81_4_migrations_added=no
stage81_4_production_deploy_required=no
stage81_4_production_data_changed=no
stage81_4_manual_cleanup_allowed=no
stage81_4_additive_content_strategy_required=yes
stage81_4_next_stage=81.5

## Scope

Stage 81.4 records the production data cleanup decision and the initial content strategy after the Stage 81.3 production data preflight snapshot.

This stage is documentation and guard only.

## Background

Stage 81.3 confirmed that production runtime is healthy and business tables are empty.

Known production state from Stage 81.3:

- users: 3;
- organizations: 0;
- learning_groups: 0;
- courses: 0;
- course_modules: 0;
- course_lessons: 0;
- enrollments: 0;
- document_records: 0;
- alembic version: `6421_org_doc_profile`;
- snapshot report: `/opt/obrportal/tmp/stage81_3_production_data_preflight_snapshot_20260608T123756Z.txt`;
- PostgreSQL backup: `/opt/obrportal-backups/postgres/postgres-before-stage81-3-data-preflight-20260608T123756Z.sql`.

## Cleanup decision

One inactive user record has an unexpected email-like value containing a shell prompt fragment.

Decision:

- do not delete this record manually;
- do not edit this record directly in SQL;
- do not clean it during content initialization;
- defer cleanup to a separate backup-backed cleanup stage;
- require a dedicated cleanup plan, explicit target ID, backup, pre/post counts, and audit notes before any cleanup.

## Content strategy decision

Production content initialization must be additive-only.

Preferred path for first real content:

1. create or verify organization information;
2. create real course/program records;
3. create course modules;
4. create course lessons;
5. create learning groups if needed;
6. create learner accounts or import source;
7. create enrollments;
8. complete admin review before issuing documents.

Allowed implementation paths:

- manual filling through the admin UI;
- a future additive production seed command that only creates missing records and skips existing records.

Forbidden content paths:

- demo reset on production;
- `ResetVolumes`;
- `docker compose down -v`;
- destructive reseed;
- truncating tables;
- replacing production storage;
- bypassing auth or RBAC;
- creating fake issued documents as real production documents.

## Stage 81.5 recommendation

Stage 81.5 should decide the first production content source:

- manual admin UI filling; or
- dedicated additive seed for real initial organization/course data.

## Acceptance

Stage 81.4 is accepted when:

- release manifest current_stage is 81.4;
- production checkpoint remains Stage 80.4 runtime;
- Stage 81.3 snapshot evidence remains recorded;
- cleanup decision is recorded as deferred/no manual cleanup;
- additive content strategy is recorded;
- no backend runtime changes are introduced;
- no frontend runtime changes are introduced;
- no database migrations are introduced;
- no production deployment is required;
- no production data is changed.
