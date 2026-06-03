# Stage 51 - Production target facts completion baseline

Status: planned
Base branch: develop
Base checkpoint: 6fd19a5
Previous stage: v0.1.0-stage50-production-server-target-selection-complete
Scope: production target facts completion without live production deployment

## Goal

Stage 51 completes known production target facts before any real deployment stage is opened.

## Confirmed facts

```text
Production server IP: 31.172.68.71
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
```

## Background

Stage 50 accepted production target selection preparation but deferred concrete host, domain, DNS, reverse proxy, TLS, backup and rollback facts.

Stage 51 fills the confirmed host/domain facts and keeps remaining deployment decisions explicit.

## Safety rule

Stage 51 is facts-only and verification-only. It does not execute a live production deployment.

## Target behavior

- Record confirmed production server IP.
- Record confirmed production domain and HTTPS URL.
- Verify local DNS resolution for the domain.
- Verify basic network reachability for selected ports where appropriate.
- Keep production secrets outside git.
- Keep application code unchanged.
- Do not run live production deployment.

## Still pending

- Production project directory on server.
- Reverse proxy choice and config.
- TLS certificate process and ownership.
- Production .env values.
- Backup directory and retention policy.
- Rollback target tag.
- SSH access method and operator account.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_server_facts.py
python .\scripts\check_production_domain_dns_verification.py
python .\scripts\check_production_domain_reverse_proxy_decision.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production IP/domain facts are documented.
- DNS/reachability verification results are documented.
- Remaining deployment blockers are listed.
- No secrets are committed.
- No live production deployment is executed.
- No application code changes are made unless a blocker is found.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
