# Stage 52 - Production target DNS alignment baseline

Status: planned
Base branch: develop
Base checkpoint: 2c1ec0e
Previous stage: v0.1.0-stage51-production-target-facts-completion
Scope: production target DNS alignment correction without live production deployment

## Goal

Stage 52 corrects and verifies the production target facts after Stage 51 identified a DNS mismatch.

## Background

Stage 51 recorded a mismatch between the initially provided IP and the DNS target.

Updated control panel evidence and network checks confirm that the intended production target is 89.127.203.70.

## Corrected production target facts

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
DNS A record: portal.rcdo02.ru -> 89.127.203.70
DNS A record: www.portal.rcdo02.ru -> 89.127.203.70
```

## Verified network facts

```text
Resolve-DnsName portal.rcdo02.ru -> 89.127.203.70
Test-NetConnection portal.rcdo02.ru -Port 443 -> TcpTestSucceeded=True
Test-NetConnection portal.rcdo02.ru -Port 80 -> TcpTestSucceeded=True
Test-NetConnection 89.127.203.70 -Port 22 -> TcpTestSucceeded=True
```

## Safety rule

Stage 52 is facts-correction and verification only. It does not execute a live production deployment.

## Still pending

- Production project directory on server.
- Reverse proxy choice and config.
- TLS certificate process and ownership.
- Production .env values.
- Backup directory and retention policy.
- Rollback target tag.

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

- Corrected production IP/domain facts are documented.
- DNS, HTTP, HTTPS and SSH reachability results are documented.
- Remaining deployment blockers are listed.
- No secrets are committed.
- No live production deployment is executed.
- No application code changes are made unless a blocker is found.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
