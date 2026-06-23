# Stage 48 - Production deployment dry-run planning baseline

Status: planned
Base branch: develop
Base checkpoint: 8a347bc
Previous stage: v0.1.0-stage47-production-deployment-readiness-complete
Scope: production deployment dry-run planning without live production release

## Goal

Stage 48 prepares a safe production deployment dry-run plan after production readiness documentation and guards were accepted in Stage 47.

## Background

Stage 47 confirmed that production readiness documentation and 27 production guards pass locally.

Stage 48 does not execute a live production deployment. It prepares a dry-run checklist and command sequence that can be reviewed before any real server changes.

## Target behavior

- Define a dry-run deployment sequence.
- Identify commands that are safe to run locally.
- Identify commands that must only be run on the production server.
- Identify backup, rollback and verification checkpoints.
- Keep application code unchanged.
- Commit no secrets.

## Audit focus

- Current Docker Compose service layout.
- Current environment template and required production variables.
- Current migration and seed process.
- Current reverse proxy and domain assumptions.
- Current backup and restore checkpoints.
- Current health, readiness and smoke verification commands.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_deployment_runbook.py
python .\scripts\check_production_operations_runbook.py
python .\scripts\check_production_restore_drill_runbook.py
python .\scripts\check_production_monitoring_runbook.py
docker compose ps
git status --short
```

## Acceptance criteria

- Dry-run plan is documented.
- Production-only commands are clearly separated from local-safe commands.
- Backup and rollback checkpoints are included.
- Verification commands are included.
- No live production deployment is executed.
- No application code changes are made unless a blocker is found.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
