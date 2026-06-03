# Stage 61 - Production deployment execution baseline

Status: planned
Base branch: develop
Base checkpoint: 71c04b9
Previous stage: v0.1.0-stage60-production-deployment-execution-plan
Scope: production deployment execution baseline

## Goal

Stage 61 opens the real production deployment execution stage after backup, target selection, pre-deployment health check and deployment plan have been completed.

## Background

Stage 57 created and verified a protected production backup.
Stage 58 selected the deployment target release and rollback basis.
Stage 59 verified current production health.
Stage 60 documented the production deployment execution and rollback plan.

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
Deployment policy: explicit release tag only, not moving branch head
```

## Rollback basis

```text
Rollback production tag: v0.1.0-stage30-pre-launch-freeze-complete
Rollback production commit: f8bdba657fde6f1bbbe21e42989f4eff9f4e8984
Rollback backup path: /opt/obrportal-backups/protected/stage57-20260603-114647
```

## Go/no-go rule

Stage 61 baseline does not execute deployment. Real execution requires explicit confirmation after this baseline is committed.

## Required confirmation before execution

```text
1. Maintenance window is accepted.
2. Short downtime risk is accepted.
3. Deployment target tag is confirmed.
4. Rollback basis is confirmed.
5. Protected backup path is confirmed.
```

## Execution safety rules

- Do not print .env contents.
- Do not deploy from a moving branch head.
- Do not delete backups.
- Preserve docker-compose.override.yml.
- Stop immediately if target tag or protected backup is missing.
- Stop immediately if final pre-deployment health check fails.

## Planned execution summary

```text
1. Run final health check.
2. Confirm protected backup exists.
3. Confirm current production HEAD.
4. Fetch tags.
5. Checkout explicit target tag.
6. Preserve/restore docker-compose.override.yml if needed.
7. Validate docker compose config.
8. Build and start stack.
9. Verify backend /health.
10. Verify backend /api/v1/ready.
11. Verify frontend localhost.
12. Verify public HTTPS.
13. Roll back if critical verification fails.
```

## Forbidden during baseline

```text
No SSH deployment command is executed in this baseline.
No git fetch is executed on production in this baseline.
No git checkout is executed on production in this baseline.
No docker compose up/restart is executed on production in this baseline.
No migration is executed in this baseline.
```

## Acceptance checks

Required checks before committing baseline:

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

- Stage 61 baseline is documented.
- Real deployment is not executed during baseline.
- Deployment target and rollback basis are documented.
- Required manual confirmation is documented.
- No production secrets are printed or committed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
