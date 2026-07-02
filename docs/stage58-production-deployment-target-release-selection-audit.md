# Stage 58 - Production deployment target release selection audit

Status: draft
Branch: stage58-production-deployment-target-release-selection-audit
Baseline commit: 8e5a889
Base develop checkpoint: 9f358cd
Previous stage: v0.1.0-stage57-production-protected-backup-execution

## Summary

Stage 58 selects the deployment target release and rollback target for a future production deployment stage.

## Safety result

- This stage is selection-only.
- No SSH deployment command was executed.
- No production .env contents were printed.
- No git pull, git fetch or git checkout was executed on production.
- No Docker images were rebuilt.
- No containers or services were restarted.
- No database migrations were executed.
- No live production deployment was executed.
- No application code changes were made.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Selected deployment target

```text
Target release tag: v0.1.0-stage57-production-protected-backup-execution
Target commit: 9f358cd
Deployment source: https://github.com/disa-ufa/obrportal
Deployment branch policy: deploy explicit release tag, not an unverified branch head
```

## Selected rollback target

```text
Rollback production tag: v0.1.0-stage30-pre-launch-freeze-complete
Rollback production commit: f8bdba657fde6f1bbbe21e42989f4eff9f4e8984
Rollback backup path: /opt/obrportal-backups/protected/stage57-20260603-114647
Rollback rule: rollback must include matching .env, compose files and database backup
```

## Protected backup confirmation

```text
Backup path: /opt/obrportal-backups/protected/stage57-20260603-114647
Backup contains .env, docker-compose.yml, docker-compose.override.yml, git evidence, docker evidence, postgres.dump and sha256sums.txt
Backup SHA256 verification passed during Stage 57
```

## Release selection rationale

- The selected target is the latest accepted develop checkpoint after protected backup execution.
- The target is tagged and pushed to origin.
- The target is safer than deploying a moving branch head.
- Production is currently materially behind the selected target, so deployment must be handled as a separate explicit stage.

## Deployment blockers still remaining

- A separate deployment stage has not yet been opened.
- Maintenance window has not yet been confirmed.
- Production server pending updates/restart remain separate operational concerns.
- Final pre-deployment health checks must be run immediately before deployment.
- Post-deployment verification plan must be confirmed before deployment.

## Decision

Stage 58 audit selects v0.1.0-stage57-production-protected-backup-execution as the future deployment target and v0.1.0-stage30-pre-launch-freeze-complete plus the Stage 57 protected backup as the rollback basis. No production deployment is executed.
