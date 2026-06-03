# Stage 47 - Production deployment readiness hardening baseline

Status: planned
Base branch: develop
Base checkpoint: d977d36
Previous stage: v0.1.0-stage46-post-ci-stabilization-roadmap-complete
Scope: production deployment readiness hardening without application feature changes

## Goal

Stage 47 verifies and hardens production deployment readiness after the CI stabilization track.

## Background

Stage 42-45 stabilized frontend lazy route chunks, route guards, CI encoding and smoke guard compatibility.
Stage 46 accepted the post-CI stabilization roadmap and selected production deployment readiness as the next cycle.

The project is now on a clean develop checkpoint with GitHub Actions green and a healthy local Docker Compose stack.

## Target behavior

- Production deployment documentation matches the current Docker Compose setup.
- Environment template is complete and safe for production adaptation.
- Reverse proxy and domain readiness notes are current.
- Backup, restore and monitoring checklists are current.
- No secrets are committed.
- Application code remains unchanged unless a production readiness blocker is found.

## Audit focus

- Review .env.example and production environment requirements.
- Review Docker Compose service assumptions.
- Review production deployment runbooks and server checklists.
- Review reverse proxy, domain and DNS readiness documents.
- Review backup, restore and monitoring documentation.
- Review CI guards that protect production readiness documentation.

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
python .\scripts\check_production_release_runbook.py
python .\scripts\check_production_incident_runbook.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production deployment readiness audit is documented.
- Any stale production runbook assumptions are identified.
- Any required follow-up actions are explicitly listed.
- No application code changes are made unless justified by a blocker.
- Secret scan and encoding guards pass.
- Docker stack remains healthy.
- Working tree is clean before final acceptance.
