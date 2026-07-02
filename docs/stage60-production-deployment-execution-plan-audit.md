# Stage 60 - Production deployment execution plan audit

Status: draft
Branch: stage60-production-deployment-execution-plan-audit
Baseline commit: e33e7ab
Base develop checkpoint: 86f4b9a
Previous stage: v0.1.0-stage59-production-pre-deployment-health-check

## Summary

Stage 60 defines the exact production deployment execution plan after backup, release target selection and pre-deployment health checks have passed.

## Safety result

- This stage is planning-only.
- No production deployment was executed.
- No production SSH deployment command was executed.
- No production .env contents were printed.
- No git fetch, pull or checkout was executed on production.
- No Docker images were rebuilt on production.
- No containers or services were restarted on production.
- No database migrations were executed on production.
- No production server configuration was changed.

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
Rollback requires matching .env, docker-compose.yml, docker-compose.override.yml and postgres.dump
```

## Preconditions before real deployment stage

```text
1. Maintenance window is confirmed.
2. Protected backup path exists and was verified.
3. Current production health is still green.
4. Target release tag exists on origin.
5. Rollback basis is accepted.
6. Post-deployment verification checklist is ready.
```

## Future deployment execution sequence

```text
1. SSH into production server.
2. cd /opt/obrportal.
3. Record current git HEAD and docker compose ps again.
4. Verify protected backup directory exists.
5. Verify docker-compose.override.yml exists before update.
6. Fetch tags from origin.
7. Checkout explicit target tag v0.1.0-stage57-production-protected-backup-execution.
8. Restore/preserve docker-compose.override.yml if checkout affects working tree.
9. Validate docker compose config.
10. Build updated backend and frontend images.
11. Start updated stack with docker compose up -d --build.
12. Run database migrations only if release notes require them.
13. Verify docker compose ps.
14. Verify backend /health.
15. Verify backend /api/v1/ready.
16. Verify frontend localhost endpoint.
17. Verify public HTTPS endpoint.
18. Verify critical public/admin routes.
19. If verification passes, document deployment acceptance.
20. If verification fails, execute rollback plan.
```

## Future rollback execution sequence

```text
1. Stop updated stack only if required by failure state.
2. Checkout rollback production tag v0.1.0-stage30-pre-launch-freeze-complete.
3. Restore .env from protected backup without printing contents.
4. Restore docker-compose.yml from protected backup if needed.
5. Restore docker-compose.override.yml from protected backup.
6. Restore Postgres dump only if deployment/migration changed database state.
7. Start rollback stack.
8. Verify docker compose ps.
9. Verify /health.
10. Verify /api/v1/ready.
11. Verify public HTTPS endpoint.
12. Document rollback result.
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
Data integrity check fails.
```

## Deployment go/no-go decision

- Go only if maintenance window is confirmed and final health check is green.
- No-go if backup path is missing or checksum evidence is unavailable.
- No-go if target tag is missing.
- No-go if docker-compose.override.yml preservation is unclear.
- No-go if rollback owner/decision is not confirmed.

## Decision

Stage 60 audit defines the future deployment and rollback execution plan. No production deployment is executed in Stage 60.
