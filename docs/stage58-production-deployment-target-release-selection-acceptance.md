# Stage 58 - Production deployment target release selection acceptance

Status: accepted
Branch: stage58-production-deployment-target-release-selection-audit
Baseline commit: 8e5a889
Audit commit: 645e1c8
Base develop checkpoint: 9f358cd
Previous stage: v0.1.0-stage57-production-protected-backup-execution

## Goal

Stage 58 selects the target release candidate for a future production deployment stage.

## Accepted results

- Stage 58 baseline was documented.
- Stage 58 audit was documented.
- Future deployment target release was selected.
- Rollback target and rollback backup basis were selected.
- Protected backup path was confirmed.
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

## Verified checks

- Secret scan passed.
- Text encoding guard passed.
- Source BOM guard passed.
- Production backup verification guard passed.
- Production release runbook guard passed.
- Production restore drill runbook guard passed.
- Docker Compose stack remained running during the audit.

## Remaining blockers before real deployment

- A separate deployment stage has not yet been opened.
- Maintenance window has not yet been confirmed.
- Final pre-deployment health checks must be run immediately before deployment.
- Post-deployment verification plan must be confirmed before deployment.
- Production server pending updates/restart remain separate operational concerns.

## Decision

Stage 58 is accepted as production deployment target release selection.

## Next possible cycle

```text
Stage 59 - Production pre-deployment health check
```
