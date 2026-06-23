# Production Data Initialization Runbook

production_data_initialization_runbook=ready
production_data_initialization_mode=additive_only
production_data_reset_allowed=no
postgres_backup_required=yes
reset_volumes_forbidden=yes
stage81_2_safe_additive_seed_required=yes

## Purpose

This runbook describes the safe production path for adding initial business data without resetting production state.

## Production preflight

Run on production inside /opt/obrportal before any data operation:

cd /opt/obrportal
git status --short
git rev-parse --short HEAD
docker compose ps
curl -fsS https://portal.rcdo02.ru/api/v1/ready

## Required backup

Create a PostgreSQL backup before any production data operation:

BACKUP_TS=20260608T173024Z
mkdir -p /opt/obrportal-backups/postgres
docker compose exec -T postgres pg_dump -U obrportal obrportal > /opt/obrportal-backups/postgres/postgres-before-data-init-.sql

## Pre-change counts

Record table counts before data changes:

docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as users from users;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as organizations from organizations;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as courses from courses;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as course_modules from course_modules;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as course_lessons from course_lessons;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as learning_groups from learning_groups;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as enrollments from enrollments;"
docker compose exec -T postgres psql -U obrportal -d obrportal -c "select count(*) as document_records from document_records;"

## Additive-only data rule

Any future production seed command must:

- insert only missing records;
- use stable natural keys such as email, inn, course slug, group code and document number;
- skip existing records;
- avoid deleting records;
- avoid truncating tables;
- avoid changing passwords unless explicitly requested;
- avoid modifying issued documents unless explicitly requested.

## Forbidden commands

Do not run on production:

docker compose down -v
.\scripts\local_bootstrap.ps1 -ResetVolumes
.\scripts\local_bootstrap.ps1 -ResetVolumes -WithDemoLearning

## Post-change checks

After any additive data command:

docker compose ps
curl -fsS https://portal.rcdo02.ru/api/v1/ready
curl -I https://portal.rcdo02.ru/

Then repeat table counts and compare with pre-change counts.

## Decision point

Stage 81.2 does not execute production data changes.

The next stage must decide whether to create real initial content manually through admin UI or implement a dedicated additive production seed command.
