# Stage 53 - Production server inventory preflight audit

Status: draft
Branch: stage53-production-server-inventory-preflight-audit
Baseline commit: 468c645
Base develop checkpoint: 71758e2
Previous stage: v0.1.0-stage52-production-target-dns-alignment

## Summary

Stage 53 collected read-only production server inventory facts over SSH without executing a live production deployment.

## Safety result

- SSH login was verified.
- Only read-only inventory commands were executed.
- No deployment command was executed.
- No migrations were executed.
- No services or containers were restarted.
- No firewall, reverse proxy or TLS configuration was changed.
- No production secrets were printed or committed.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
```

## Server identity

```text
Hostname: 306733.fornex.cloud
SSH user: root
Initial directory: /root
OS: Ubuntu 24.04.4 LTS (Noble Numbat)
Kernel: Linux 6.8.0-110-generic x86_64
IPv4 eth0: 89.127.203.70
IPv6 eth0: 2a02:6b40:2000:26e4::1
```

## Capacity facts

```text
Root filesystem: 20G total, 7.8G used, 11G available, 42% used
Memory: 1.9Gi total, 1.1Gi used, 198Mi free, 875Mi available
Swap: 0B
```

## Docker facts

```text
Docker version: 29.1.3
Docker Compose version: 2.40.3+ds1-0ubuntu1~24.04.1
```

## Running containers

```text
obrportal-frontend   obrportal-frontend-static:prod             Up 3 days (healthy)   80/tcp, 127.0.0.1:5173->5173/tcp
obrportal-backend    obrportal-backend                          Up 3 days             127.0.0.1:8000->8000/tcp
obrportal-postgres   postgres:16-alpine                         Up 5 days (healthy)   127.0.0.1:5432->5432/tcp
obrportal-redis      redis:7-alpine                             Up 5 days (healthy)   127.0.0.1:6379->6379/tcp
obrportal-minio      minio/minio:RELEASE.2025-04-22T22-12-26Z   Up 5 days (healthy)   127.0.0.1:9000-9001->9000-9001/tcp
amnezia-awg          amnezia-awg                                Up 5 weeks            0.0.0.0:34503->34503/udp
```

## Project paths

```text
/opt exists
/opt/obrportal exists
/opt/obrportal-backups exists
/opt/amnezia exists
/opt/containerd exists
```

## /opt/obrportal notable files and directories

```text
backend/
frontend/
docs/
scripts/
backups/
tmp/
.git/
.github/
docker-compose.yml
docker-compose.override.yml
.env
.env.example
.env.backup-cors-20260526-143116
README.md
CHANGELOG.md
.gitignore
```

## Operational notes

- The server reports: System restart required.
- The server reports: 22 updates can be applied immediately.
- Update/reboot actions are intentionally not executed in Stage 53.
- Production .env exists on the server, but its contents were not printed and must not be committed.

## Remaining blockers before real deployment

- Confirm current /opt/obrportal git branch, commit and remote.
- Confirm whether current running containers already represent production service.
- Confirm reverse proxy configuration and TLS certificate ownership.
- Confirm backup procedure and retention policy.
- Confirm rollback target tag.
- Confirm maintenance window before any restart/update/deployment.

## Decision

Stage 53 audit confirms the server is reachable and already hosts an ObrPortal Docker stack. Stage 53 remains inventory-only; no production deployment is executed.
