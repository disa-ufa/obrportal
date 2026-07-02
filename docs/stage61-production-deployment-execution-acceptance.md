# Stage 61 - Production deployment execution acceptance

Status: accepted
Branch: stage61-production-deployment-execution-audit
Baseline commit: 20a218f
Audit commit: 1f6b898
Base develop checkpoint: 71c04b9
Previous stage: v0.1.0-stage60-production-deployment-execution-plan

## Goal

Stage 61 executes the production deployment to the selected explicit release tag.

## Accepted results

- Stage 61 baseline was documented.
- Stage 61 audit was documented.
- Production deployment was executed successfully.
- Deployment used explicit release tag, not moving branch head.
- Target tag commit was verified before checkout.
- Protected backup was verified before deployment.
- docker-compose.override.yml was preserved and restored.
- Production .env contents were not printed.
- Backups were not deleted.
- Docker images were rebuilt for backend and frontend.
- Updated production stack was started.
- Backend health check passed.
- Backend readiness check passed.
- Frontend local check passed.
- Public HTTPS check passed.
- Critical public routes check passed.
- Rollback was not required.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
Production URL: https://portal.rcdo02.ru
```

## Deployment result

```text
Result: success
Target release tag: v0.1.0-stage57-production-protected-backup-execution
Target commit: 9f358cd487b81ecb0b4179a359a3138410fdedee
Evidence directory: /opt/obrportal-backups/protected/stage61-deploy-20260603-150307
```

## Final production git state

```text
HEAD: 9f358cd487b81ecb0b4179a359a3138410fdedee
describe: v0.1.0-stage57-production-protected-backup-execution
Expected untracked production-local artifacts:
?? backups/
?? docker-compose.override.yml
```

## Final health checks

```text
GET http://127.0.0.1:8000/health -> HTTP 200
GET http://127.0.0.1:8000/api/v1/ready -> HTTP 200
HEAD http://127.0.0.1:5173/ -> HTTP 200
HEAD https://portal.rcdo02.ru -> HTTP/2 200
```

## Final public route verification

```text
/ 200
/catalog 200
/login 200
/register 200
/admin 200
```

## Rollback status

```text
Rollback was not required.
Rollback production tag remains: v0.1.0-stage30-pre-launch-freeze-complete
Rollback backup path remains: /opt/obrportal-backups/protected/stage57-20260603-114647
```

## Verified checks

- Secret scan passed.
- Text encoding guard passed.
- Source BOM guard passed.
- Production backup verification guard passed.
- Production release runbook guard passed.
- Production restore drill runbook guard passed.
- Production server preflight execution guard passed.
- Local Docker Compose stack remained running during the audit.

## Notes

- Production repository is intentionally in detached HEAD state at the deployed release tag.
- backups/ and docker-compose.override.yml remain expected untracked production-local artifacts.
- Temporary local deployment logs were removed and are not committed.

## Decision

Stage 61 is accepted as successful production deployment execution.

## Next possible cycle

```text
Stage 62 - Post-deployment monitoring and product development resume
```
