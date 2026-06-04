# Stage 72.5 - Production deployment preflight audit

Status: audit
Branch: stage72-production-deployment-preflight-audit
Base branch: develop
Previous accepted stage: Stage 72.4 - Production deployment preflight baseline
Base develop checkpoint: 7f09f92
Accepted planning tag: v0.1.0-stage72-production-release-planning
Scope: production deployment preflight audit only

## Goal

Stage 72.5 audits the production deployment preflight plan before any production fact collection or execution.

This stage confirms that the preflight checklist is safe, non-destructive and does not require printing secrets, restarting services, modifying data or touching unrelated infrastructure.

## Safety boundary

Stage 72.5 is audit and planning only.

It must not:

- deploy to production;
- connect to production for execution;
- restart production services;
- modify production data;
- run production migrations;
- print production `.env`;
- print secrets;
- overwrite server-only files;
- delete Docker volumes;
- run destructive SQL;
- change DNS;
- touch `amnezia-awg`.

## Target release candidate

```text
v0.1.0-stage72-production-release-planning
```

Target release commit:

```text
be97a41
```

Current develop checkpoint for preflight planning:

```text
7f09f92
```

## Audited preflight scope

The preflight baseline requires collecting only safe production readiness facts later.

The approved fact categories are:

- production host identifier;
- production project directory;
- current production git HEAD;
- current production git branch;
- current production release tag, if any;
- Docker Compose services status;
- `.env` existence check only;
- `docker-compose.override.yml` existence check only;
- Caddy configuration existence check only;
- PostgreSQL volume existence check;
- Redis volume existence check;
- MinIO volume existence check;
- backup directory existence check;
- available disk space;
- current running containers;
- current image names and tags;
- migration status if available without data modification;
- `amnezia-awg` presence check only.

## Forbidden output audit

The preflight process must not output:

- token values;
- passwords;
- database URLs;
- secret keys;
- full `.env` contents;
- private keys;
- cookies;
- authorization headers;
- full server-only configuration contents if they contain sensitive values.

## Safe command audit

The preflight command list is acceptable only if commands are read-only and non-destructive.

Allowed examples:

```text
pwd
hostname
git rev-parse --short HEAD
git branch --show-current
git status --short
git tag --points-at HEAD
test -f .env
test -f docker-compose.override.yml
docker compose ps
docker volume ls
df -h
du -sh backups
systemctl is-active caddy
```

Forbidden examples:

```text
docker compose up
docker compose down
docker compose restart
docker compose pull
docker compose build
docker volume rm
git reset --hard
git clean -fd
alembic upgrade
psql with write queries
cat .env
cat docker-compose.override.yml
cat Caddyfile
```

## No-go audit

Production deployment must remain blocked if any of the following are true:

- target release tag is missing;
- local working tree is dirty;
- GitHub Actions are failing;
- production git HEAD cannot be determined;
- production `.env` is missing;
- server-only override is missing;
- Caddy is inactive or missing;
- Docker Compose stack is unhealthy;
- PostgreSQL volume is missing;
- Redis volume is missing;
- MinIO volume is missing;
- backup directory cannot be prepared;
- disk space is insufficient;
- unexpected migrations are detected;
- secrets are printed during preflight;
- `amnezia-awg` would be touched.

## Audit decision

The Stage 72.4 preflight baseline is safe to accept as a planning baseline.

Stage 72.5 does not authorize production deployment.

Stage 72.5 does not authorize production backup execution.

Stage 72.5 does not authorize production service restart.

Stage 72.5 does not authorize production data modification.

## Required local audit checks

```text
python .\scripts\check_stage72_production_deployment_preflight_baseline.py
python .\scripts\check_stage72_production_deployment_preflight_audit.py
python .\scripts\check_stage72_production_release_planning_baseline.py
python .\scripts\check_stage72_production_release_planning_baseline_acceptance.py
python .\scripts\check_stage72_production_release_planning_audit.py
python .\scripts\check_stage72_production_release_planning_acceptance.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Next stage

```text
Stage 72.6 - Production deployment preflight acceptance
```
