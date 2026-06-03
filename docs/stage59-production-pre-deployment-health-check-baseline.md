# Stage 59 - Production pre-deployment health check baseline

Status: planned
Base branch: develop
Base checkpoint: 38e375b
Previous stage: v0.1.0-stage58-production-deployment-target-release-selection
Scope: production pre-deployment health check without deployment

## Goal

Stage 59 verifies the current production health immediately before any future production deployment stage.

## Background

Stage 57 created and verified a protected production backup.
Stage 58 selected the future deployment target release and rollback basis.

Stage 59 does not deploy. It checks current production availability and records pre-deployment health facts.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
```

## Selected future deployment target

```text
Target release tag: v0.1.0-stage57-production-protected-backup-execution
Target commit: 9f358cd
Rollback production tag: v0.1.0-stage30-pre-launch-freeze-complete
Rollback backup path: /opt/obrportal-backups/protected/stage57-20260603-114647
```

## Safety rule

Stage 59 is health-check-only. It must not pull code, checkout branches, rebuild images, restart services, run migrations, edit files or change server configuration.

## Target behavior

- Verify public HTTPS endpoint responds.
- Verify DNS and network reachability.
- Verify backend health endpoint.
- Verify backend readiness endpoint.
- Verify Docker Compose containers are running on production.
- Verify frontend/backend localhost bindings on production.
- Keep production secrets outside git.
- Do not run live production deployment.

## Planned checks

```text
Resolve-DnsName portal.rcdo02.ru
Test-NetConnection portal.rcdo02.ru -Port 443
Test-NetConnection portal.rcdo02.ru -Port 80
Invoke-WebRequest https://portal.rcdo02.ru
ssh root@89.127.203.70 "cd /opt/obrportal && docker compose ps"
ssh root@89.127.203.70 "curl -fsS http://127.0.0.1:8000/health"
ssh root@89.127.203.70 "curl -fsS http://127.0.0.1:8000/api/v1/ready"
ssh root@89.127.203.70 "curl -fsSI http://127.0.0.1:5173/"
```

## Forbidden commands in this stage

```text
cat .env
printenv
git pull
git fetch
git checkout
docker compose up
docker compose down
docker compose restart
docker compose exec backend alembic upgrade head
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

- Pre-deployment health results are documented.
- Public production URL health is documented.
- Backend health/readiness results are documented.
- Production Docker Compose status is documented.
- No production secrets are printed or committed.
- No live production deployment is executed.
- No server modification commands are executed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
