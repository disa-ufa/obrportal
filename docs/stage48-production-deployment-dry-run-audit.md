# Stage 48 - Production deployment dry-run audit

Status: draft
Branch: stage48-production-deployment-dry-run-audit
Baseline commit: c2a9c4a
Base develop checkpoint: 8a347bc
Previous stage: v0.1.0-stage47-production-deployment-readiness-complete

## Summary

Stage 48 prepares a production deployment dry-run plan without executing a live production release.

## Safety rule

This stage is planning-only. It must not change a live production server unless a separate explicit production deployment stage is opened and accepted.

## Local-safe commands

These commands are safe to run on the local development machine:

```powershell
Set-Location C:\root\obrportal
git checkout develop
git pull --ff-only origin develop
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
docker compose ps
docker compose up -d --build
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
```

## Server-only dry-run checklist

These commands are server-only and must not be run locally unless the machine is intentionally acting as the deployment host:

```bash
cd /opt/obrportal
git status --short
git fetch origin --tags
git checkout develop
git pull --ff-only origin develop
cp .env.example .env.production.example.review
docker compose config
docker compose build
docker compose ps
```

## Production backup checkpoint

Before any real deployment, the operator must capture backups and evidence:

```bash
cd /opt/obrportal
mkdir -p backups
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "backups/predeploy-$(date +%Y%m%d-%H%M%S).sql"
docker compose ps > "backups/predeploy-compose-$(date +%Y%m%d-%H%M%S).txt"
git rev-parse HEAD > "backups/predeploy-git-head-$(date +%Y%m%d-%H%M%S).txt"
```

## Production deploy sequence draft

This sequence is for a future explicit production stage only:

```bash
cd /opt/obrportal
git fetch origin --tags
git checkout develop
git pull --ff-only origin develop
docker compose up -d --build
docker compose exec backend alembic upgrade head
docker compose ps
```

## Verification checkpoint

After any future deployment, verify health and critical flows:

```bash
curl -fsS http://127.0.0.1:8000/health
curl -fsS http://127.0.0.1:8000/api/v1/ready
docker compose logs --tail=100 backend
docker compose logs --tail=100 frontend
docker compose logs --tail=100 postgres
docker compose logs --tail=100 redis
```

## Rollback checkpoint

Rollback must be explicit and evidence-based:

```bash
cd /opt/obrportal
git log --oneline --decorate -5
git checkout <previous-known-good-tag-or-commit>
docker compose up -d --build
docker compose exec backend alembic downgrade -1
docker compose ps
```

## Dry-run findings

- Local development checks are safe and repeatable.
- Server-only commands are separated from local commands.
- Backup, deployment, verification and rollback checkpoints are documented.
- No live production deployment is executed in Stage 48.
- No application code changes are required for this audit step.

## Required follow-up before real production deployment

- Replace placeholder production paths with the real server path.
- Confirm production .env values manually without committing them.
- Confirm domain, reverse proxy and TLS configuration.
- Confirm backup storage location and retention policy.
- Confirm rollback target tag before deploying.
