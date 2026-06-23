# Stage 49 - Production server facts refresh baseline

Status: planned
Base branch: develop
Base checkpoint: 48aead3
Previous stage: v0.1.0-stage48-production-deployment-dry-run-complete
Scope: production server facts refresh without live production deployment

## Goal

Stage 49 refreshes production server facts before any real deployment stage is opened.

## Background

Stage 47 confirmed production readiness documentation and guards.
Stage 48 documented a production deployment dry-run plan.

Stage 49 does not execute production deployment. It prepares and verifies factual deployment inputs such as server path, domain, reverse proxy assumptions, backup location and environment variable readiness.

## Target behavior

- Identify actual or pending production server facts.
- Separate confirmed facts from unknown/pending facts.
- Verify which production assumptions are still placeholders.
- Keep secrets out of git.
- Keep application code unchanged.
- Do not run live production deployment.

## Audit focus

- Production server host/path assumptions.
- Git repository and branch/tag assumptions.
- Docker Compose service layout.
- Production .env requirements.
- Domain, DNS, TLS and reverse proxy readiness.
- Backup storage and rollback target assumptions.
- Health/readiness verification endpoints.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_server_facts.py
python .\scripts\check_production_server_preflight_execution.py
python .\scripts\check_production_domain_dns_verification.py
python .\scripts\check_production_domain_reverse_proxy_decision.py
python .\scripts\check_production_backup_verification.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production server facts refresh is documented.
- Confirmed facts and pending facts are separated.
- No secrets are committed.
- No live production deployment is executed.
- No application code changes are made unless a blocker is found.
- Secret scan and encoding guards pass.
- Docker stack remains healthy.
- Working tree is clean before final acceptance.
