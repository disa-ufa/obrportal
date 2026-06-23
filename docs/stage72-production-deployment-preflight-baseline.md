# Stage 72.4 - Production deployment preflight baseline

Status: planned
Branch: stage72-production-deployment-preflight-baseline
Base branch: develop
Previous accepted stage: Stage 72.3 - Production release planning acceptance
Base develop checkpoint: be97a41
Accepted planning tag: v0.1.0-stage72-production-release-planning
Scope: production deployment preflight only

## Goal

Stage 72.4 prepares a safe production deployment preflight before any production execution.

This stage must collect and document production readiness facts without deploying, restarting services, modifying production data, running migrations, printing secrets or touching unrelated services.

## Safety boundary

Stage 72.4 is preflight only.

It must not:

- deploy to production;
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

## Production execution lock

Production deployment remains blocked until a separate explicit execution stage is accepted.

Required phrase for future production deployment execution:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

This phrase is not used in Stage 72.4.

## Target release candidate

```text
v0.1.0-stage72-production-release-planning
```

Target release commit:

```text
be97a41
```

## Preflight facts to collect later

The following facts must be collected without printing secrets:

- production host identifier;
- production project directory;
- current production git HEAD;
- current production git branch;
- current production release tag, if any;
- production Docker Compose services status;
- production `.env` existence check only;
- server-only `docker-compose.override.yml` existence check only;
- Caddy configuration existence check only;
- PostgreSQL volume existence check;
- Redis volume existence check;
- MinIO volume existence check;
- backup directory existence check;
- available disk space;
- current running containers;
- current image names and tags;
- current migration status if available without data modification;
- `amnezia-awg` presence check only and must not be touched.

## Forbidden preflight output

The preflight output must not include:

- token values;
- passwords;
- database URLs;
- secret keys;
- full `.env` contents;
- full Caddyfile contents if it contains sensitive host details;
- private keys;
- cookies;
- authorization headers.

## Allowed safe command categories

Allowed command categories for later production preflight:

- `pwd`;
- `hostname`;
- `git rev-parse --short HEAD`;
- `git branch --show-current`;
- `git status --short`;
- `git tag --points-at HEAD`;
- `test -f .env` with yes/no output only;
- `test -f docker-compose.override.yml` with yes/no output only;
- `docker compose ps`;
- `docker volume ls` filtered by project names;
- `df -h`;
- `du -sh` for backup directory only;
- `systemctl is-active caddy`;
- `test -f /path/to/Caddyfile` with yes/no output only.

## No-go criteria

Production deployment must remain blocked if:

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

## Acceptance criteria

Stage 72.4 baseline is accepted when:

- preflight-only safety boundary is documented;
- production execution lock is documented;
- target release candidate is documented;
- safe facts to collect are documented;
- forbidden output is documented;
- no-go criteria are documented;
- no production deployment was executed;
- no production services were restarted;
- no production data was changed;
- no production secrets were printed;
- baseline guard passes;
- working tree is clean before final acceptance.

## Next stage

```text
Stage 72.5 - Production deployment preflight audit
```
