# Stage 60 - Production deployment execution plan baseline

Status: planned
Base branch: develop
Base checkpoint: 86f4b9a
Previous stage: v0.1.0-stage59-production-pre-deployment-health-check
Scope: production deployment execution planning without executing deployment

## Goal

Stage 60 prepares the exact production deployment execution plan after backup, release target selection and pre-deployment health checks have passed.

## Background

Stage 57 created and verified a protected production backup.
Stage 58 selected the deployment target release and rollback basis.
Stage 59 verified current production health.

Stage 60 does not deploy. It documents the exact deployment sequence, verification checks and rollback trigger points.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
```

## Selected deployment target

```text
Target release tag: v0.1.0-stage57-production-protected-backup-execution
Target commit: 9f358cd
Deployment source: https://github.com/disa-ufa/obrportal
```

## Rollback basis

```text
Rollback production tag: v0.1.0-stage30-pre-launch-freeze-complete
Rollback production commit: f8bdba657fde6f1bbbe21e42989f4eff9f4e8984
Rollback backup path: /opt/obrportal-backups/protected/stage57-20260603-114647
```

## Safety rule

Stage 60 is planning-only. It must not execute production deployment, pull code on production, checkout branches, rebuild images, restart services, run migrations or change server configuration.

## Deployment execution plan draft

```text
1. Confirm maintenance window.
2. Confirm protected backup path exists.
3. Confirm current production health one more time.
4. Fetch tags on production.
5. Checkout explicit target tag.
6. Preserve docker-compose.override.yml after checkout if needed.
7. Build/pull required images.
8. Run database migrations only if required by release notes.
9. Start updated stack.
10. Verify containers.
11. Verify backend /health.
12. Verify backend /api/v1/ready.
13. Verify public HTTPS endpoint.
14. Verify frontend/admin critical routes.
15. If verification fails, execute rollback plan.
```

## Rollback trigger points

```text
Backend container fails to start.
Frontend container fails to start.
Database migration fails.
/health is not HTTP 200.
/api/v1/ready is not HTTP 200.
Public HTTPS endpoint is not HTTP 200.
Critical frontend route returns blank page or server error.
```

## Forbidden commands in this stage

```text
ssh root@89.127.203.70 "git fetch"
ssh root@89.127.203.70 "git checkout"
ssh root@89.127.203.70 "docker compose up"
ssh root@89.127.203.70 "docker compose restart"
ssh root@89.127.203.70 "docker compose exec backend alembic upgrade head"
```

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_backup_verification.py
python .\scripts\check_production_release_runbook.py
python .\scripts\check_production_restore_drill_runbook.py
python .\scripts\check_production_server_preflight_execution.py
docker compose ps
git status --short
```

## Acceptance criteria

- Deployment execution plan is documented.
- Rollback trigger points are documented.
- Deployment target and rollback basis are documented.
- No production secrets are printed or committed.
- No live production deployment is executed.
- No server modification commands are executed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
