# Stage 58 - Production deployment target release selection baseline

Status: planned
Base branch: develop
Base checkpoint: 9f358cd
Previous stage: v0.1.0-stage57-production-protected-backup-execution
Scope: production deployment target release selection without deployment

## Goal

Stage 58 selects the target release candidate for a future production deployment stage.

## Background

Stage 57 created and verified a protected production backup.

Production is currently known to be running an older Stage 30 checkpoint, while local develop is at Stage 57.

Stage 58 does not deploy. It only selects and documents the intended deployment target and rollback target.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Current protected backup

```text
/opt/obrportal-backups/protected/stage57-20260603-114647
```

## Proposed deployment target

```text
Target release tag: v0.1.0-stage57-production-protected-backup-execution
Target commit: 9f358cd
Deployment source: GitHub repository https://github.com/disa-ufa/obrportal
```

## Proposed rollback target

```text
Rollback production tag: v0.1.0-stage30-pre-launch-freeze-complete
Rollback backup path: /opt/obrportal-backups/protected/stage57-20260603-114647
```

## Safety rule

Stage 58 is selection-only. It must not SSH into production for deployment, pull code, checkout branches, rebuild images, restart services, run migrations or change server configuration.

## Target behavior

- Select target release tag for future deployment.
- Select rollback target from current production state.
- Confirm protected backup path to use before deployment.
- Keep production secrets outside git.
- Keep application code unchanged.
- Do not run live production deployment.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_backup_verification.py
python .\scripts\check_production_release_runbook.py
python .\scripts\check_production_restore_drill_runbook.py
docker compose ps
git status --short
```

## Acceptance criteria

- Target release tag is documented.
- Rollback target is documented.
- Protected backup path is documented.
- No production secrets are printed or committed.
- No live production deployment is executed.
- No server modification commands are executed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
