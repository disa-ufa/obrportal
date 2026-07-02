# Production Safe Backend Deploy Runbook

production_safe_backend_deploy_runbook=ready
safe_backend_only_deploy=yes
volume_removal_command_blocked=yes
postgres_backup_required=yes
stage80_5_destructive_volume_command_guard=yes

## Purpose

This runbook describes the safe production path for backend-only releases such as Stage 80.4.

It is designed to preserve PostgreSQL and MinIO volumes while allowing a backend image rebuild and backend container restart.

## Preflight

Run these commands on the production server inside /opt/obrportal: cd /opt/obrportal, git branch --show-current, git rev-parse --short HEAD, git status --short, docker compose ps.

Expected state: branch is develop, only server-owned untracked paths are present, PostgreSQL Redis MinIO backend and frontend are running or intentionally being updated.

## Backup before deployment

Create deployment, environment, and PostgreSQL backup artifacts before changing containers.

Use pg_dump before backend deployment: docker compose exec -T postgres pg_dump -U obrportal obrportal > /opt/obrportal-backups/postgres/postgres-before-backend-deploy.sql

## Safe update

Use targeted backend commands only: git fetch origin develop --tags, git pull --ff-only origin develop, docker compose build backend, docker compose up -d backend.

## Forbidden normal-deploy command

Do not use docker compose down -v during normal production deployment.

It removes named volumes and can erase PostgreSQL and MinIO data.

## Post-deploy checks

Run docker compose ps, curl http://127.0.0.1:8000/health, curl http://127.0.0.1:8000/api/v1/ready, curl https://portal.rcdo02.ru/api/v1/ready, and check public routes / /catalog /login /admin.

Expected result: backend is running, frontend remains obrportal-frontend-static:prod, PostgreSQL Redis and MinIO are healthy, public routes return HTTP 200, ready endpoint returns database=ok redis=ok storage=ok.
