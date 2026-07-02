# Stage 52 - Production target DNS alignment audit

Status: draft
Branch: stage52-production-target-dns-alignment-audit
Baseline commit: 3916d0c
Base develop checkpoint: 2c1ec0e
Previous stage: v0.1.0-stage51-production-target-facts-completion

## Summary

Stage 52 verifies corrected production target DNS alignment after Stage 51 identified a mismatch.

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

## Corrected finding

The Stage 51 DNS mismatch is resolved by correcting the intended production server IP to 89.127.203.70.

```text
Previous incorrect target: 31.172.68.71
Corrected production target: 89.127.203.70
Domain alignment: portal.rcdo02.ru -> 89.127.203.70
```

## Confirmed facts

- The production domain resolves to the corrected production server IP.
- HTTP port 80 is reachable on the production domain.
- HTTPS port 443 is reachable on the production domain.
- SSH port 22 is reachable on the corrected production server IP.
- The DNS and SSH blockers from Stage 51 are resolved for the corrected target.

## Still pending before real deployment

- Production project directory on server.
- Reverse proxy choice and config.
- TLS certificate process and ownership.
- Production .env values.
- Backup directory and retention policy.
- Rollback target tag.
- Server inventory and current running services review.

## Safety decision

Stage 52 remains facts-correction and verification only. No live production deployment is executed.
