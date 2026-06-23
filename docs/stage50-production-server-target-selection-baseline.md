# Stage 50 - Production server target selection baseline

Status: planned
Base branch: develop
Base checkpoint: 639516a
Previous stage: v0.1.0-stage49-production-server-facts-refresh-complete
Scope: production server target selection without live production deployment

## Goal

Stage 50 selects and documents the intended production target before any real deployment stage is opened.

## Background

Stage 47 confirmed production readiness documentation and guards.
Stage 48 documented a production deployment dry-run plan.
Stage 49 refreshed production server facts and identified pending deployment blockers.

Stage 50 does not execute a live deployment. It documents target server, path, domain, reverse proxy, TLS, backup and rollback decisions or keeps them explicitly pending.

## Target behavior

- Select or explicitly defer the production server target.
- Select or explicitly defer the production project path.
- Select or explicitly defer domain/DNS/TLS/reverse proxy decisions.
- Select or explicitly defer backup and rollback targets.
- Keep production secrets outside git.
- Keep application code unchanged.
- Do not run live production deployment.

## Audit focus

- Production host/IP target.
- Production project directory.
- Deployment branch or release tag policy.
- Domain and DNS target.
- Reverse proxy choice.
- TLS/certificate process.
- Backup directory and retention.
- Rollback target selection.
- Production .env handling.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_server_facts.py
python .\scripts\check_production_domain_dns_verification.py
python .\scripts\check_production_domain_reverse_proxy_decision.py
python .\scripts\check_production_backup_verification.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production target selection is documented.
- Confirmed and deferred production decisions are separated.
- No secrets are committed.
- No live production deployment is executed.
- No application code changes are made unless a blocker is found.
- Secret scan and encoding guards pass.
- Docker stack remains healthy.
- Working tree is clean before final acceptance.
