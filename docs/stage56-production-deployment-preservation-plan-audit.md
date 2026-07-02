# Stage 56 - Production deployment preservation plan audit

Status: draft
Branch: stage56-production-deployment-preservation-plan-audit
Baseline commit: ee76dda
Base develop checkpoint: e6cb609
Previous stage: v0.1.0-stage55-production-override-backup-preservation

## Summary

Stage 56 defines the preservation plan required before any future production repository update or deployment stage.

## Safety result

- This stage is planning-only.
- No production .env contents are printed.
- No production files are copied, moved, removed or edited.
- No git pull, git fetch or git checkout is executed on production.
- No Docker images are rebuilt.
- No containers or services are restarted.
- No database migrations are executed.
- No live production deployment is executed.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Current known production state

```text
Production repository path: /opt/obrportal
Production repository branch: main
Production repository checkpoint: v0.1.0-stage30-pre-launch-freeze-complete
Current local develop checkpoint before Stage 56: e6cb609
Current local tag before Stage 56: v0.1.0-stage55-production-override-backup-preservation
Production working tree has untracked backups/ and docker-compose.override.yml
```

## Must-preserve artifacts

```text
/opt/obrportal/.env
/opt/obrportal/docker-compose.yml
/opt/obrportal/docker-compose.override.yml
/opt/obrportal/backups/
/opt/obrportal-backups/
Current production git HEAD
Current production docker compose ps output
Current production docker images list
Current production Postgres dump
```

## Preservation sequence for a future explicit backup stage

```text
1. Create a timestamped protected backup directory on the server.
2. Record current git HEAD and short git log.
3. Record git status --short.
4. Record docker compose ps.
5. Record docker images.
6. Copy docker-compose.yml into the protected backup directory.
7. Copy docker-compose.override.yml into the protected backup directory.
8. Copy .env into the protected server-local backup directory without printing its contents.
9. Create a Postgres dump.
10. Create sha256 checksums for backup artifacts.
11. Verify backup files exist and have non-zero size.
12. Only after verification, open a separate deployment stage.
```

## Rollback target rules

```text
Preferred rollback target: current production HEAD before deployment.
Current known production rollback candidate: v0.1.0-stage30-pre-launch-freeze-complete.
Rollback target must be recorded before any git checkout or pull.
Rollback must include matching .env, compose files and database backup.
Rollback must not rely only on git history.
```

## Deployment source rules

```text
Do not deploy an unverified branch head directly.
Prefer an explicit release tag from develop.
Confirm CI is green for the selected tag.
Confirm production backup is complete before updating code.
Confirm docker-compose.override.yml remains preserved after repository update.
```

## Blockers before real deployment

- No explicit target release tag has been selected.
- Production backup has not yet been freshly created for the future deployment.
- Production .env preservation has not yet been executed in a protected backup stage.
- docker-compose.override.yml preservation has not yet been executed in a protected backup stage.
- Current production database dump has not yet been freshly created.
- Rollback target has not yet been formally accepted.
- Maintenance window has not yet been confirmed.
- Server pending updates/restart are still separate operational concerns.

## Future stage recommendation

```text
Stage 57 - Production protected backup execution
```

## Decision

Stage 56 audit defines the required preservation plan. Real backup creation and real deployment remain blocked until opened as separate explicit stages.
