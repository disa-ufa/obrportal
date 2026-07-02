# Stage 55 - Production override and backup preservation preflight audit

Status: draft
Branch: stage55-production-override-backup-preservation-audit
Baseline commit: 3689308
Base develop checkpoint: b3874d2
Previous stage: v0.1.0-stage54-production-repository-state-preflight

## Summary

Stage 55 inspected production-only untracked files and backup directories before any future repository update or deployment stage.

## Safety result

- Only read-only inspection commands were executed.
- No production .env contents were printed.
- No production secrets were printed or committed.
- No files were edited, moved, copied or removed.
- No git pull, git fetch or git checkout was executed.
- No docker compose up/down/restart was executed.
- No migrations were executed.
- No services or containers were restarted.
- No live production deployment was executed.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Production working tree

```text
git status --short:
?? backups/
?? docker-compose.override.yml
```

## docker-compose.override.yml

```text
Path: /opt/obrportal/docker-compose.override.yml
Owner: root root
Size: 717 bytes
Modified: May 26 16:58
```

## Override content summary

```text
backend: restart unless-stopped, port bound to 127.0.0.1:8000
postgres: restart unless-stopped, port bound to 127.0.0.1:5432
redis: restart unless-stopped, port bound to 127.0.0.1:6379
minio: restart unless-stopped, ports bound to 127.0.0.1:9000 and 127.0.0.1:9001
frontend: restart unless-stopped, Dockerfile.prod, image obrportal-frontend-static:prod
frontend: port bound to 127.0.0.1:5173
frontend: volumes overridden to empty list
frontend: command overridden to nginx daemon off
frontend: depends_on backend
```

## Override preservation decision

- docker-compose.override.yml is production-specific and must be preserved before any future git operation.
- The override intentionally restricts service ports to localhost.
- The override changes frontend production behavior to static nginx image obrportal-frontend-static:prod.
- The override should be copied into a protected backup before any future deployment update.

## Local backups under /opt/obrportal/backups

```text
pre-stage30-20260530-124746/docker-compose.yml.before-stage30
pre-stage30-20260530-124746/docker-compose.override.yml.before-stage30
pre-stage30-20260530-124746/.env.before-stage30
pre-stage30-20260530-124746/git-head-before.txt
pre-stage30-20260530-124746/git-head-before-oneline.txt
pre-stage30-20260530-124746/docker-ps-before.txt
pre-stage30-20260530-124746/docker-compose-ps-before.txt
pre-stage30-20260530-124746/postgres-before-stage30.sql
post-hardening-20260527-132749/postgres.dump
post-hardening-20260527-132749/postgres.dump.sha256
post-hardening-20260527-132749/metadata.txt
post-hardening-20260527-132749/docker-compose.override.yml
post-hardening-20260527-132749/docker-compose.resolved.yml
post-hardening-20260527-132749/docker-compose.ps.txt
post-hardening-20260527-132749/docker-images.txt
```

## Global backups under /opt/obrportal-backups

```text
proxy/Caddyfile.before-stage-8-11-20260523135914
compose/docker-compose.override.failed-stage-8-14-20260523202500.yml
caddy/Caddyfile.before-stage-8-15-20260523204057
caddy/Caddyfile.before-stage-8-15-host-fix-20260523204358
protected/stage_10_11_5_pre_init_20260524190057.tar.gz
protected/stage_10_11_5_pre_init_20260524190057.tar.gz.sha256
protected/stage_10_11_5a_pre_init_retry_20260524190539.tar.gz
protected/stage_10_11_5a_pre_init_retry_20260524190539.tar.gz.sha256
```

## Docker Compose services

```text
minio
postgres
redis
backend
frontend
```

## Notes

- The first multi-line docker compose ps command ended with a CRLF-related command parsing error.
- The error was caused by Windows CRLF in the SSH script and did not change the server.
- docker compose ps was re-run separately as a read-only command.

## Findings

- docker-compose.override.yml is a production-specific untracked file.
- backups/ contains important pre-stage30 and post-hardening artifacts.
- /opt/obrportal-backups contains proxy, caddy, compose and protected backup artifacts.
- Some backup entries reference .env backup files by name, but contents were not printed.
- Both docker-compose.override.yml and backups/ must be preserved before any future repository update.

## Blockers before repository update or deployment

- Decide whether docker-compose.override.yml should remain untracked, be added to .gitignore, or be documented as server-local.
- Create an explicit protected backup of docker-compose.override.yml before any future git operation.
- Confirm backup retention and storage policy.
- Confirm rollback target tag.
- Confirm deployment target branch/tag.

## Decision

Stage 55 audit confirms production override and backup artifacts exist and must be preserved. Stage 55 remains read-only; no production deployment is executed.
