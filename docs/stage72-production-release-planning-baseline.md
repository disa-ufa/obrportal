# Stage 72 - Production release planning for Stage 70 checkpoint baseline

Status: planned
Base branch: develop
Previous accepted stage: Stage 71 - Next product backlog selection
Selected next cycle: Stage 72 - Production release planning for Stage 70 checkpoint
Scope: production release planning only

## Goal

Stage 72 defines the production release plan for the Stage 70 release readiness checkpoint.

This stage must prepare the release decision, deployment target, backup basis, rollback boundary, smoke checks and no-go criteria before any production execution.

## Background

Stage 70 accepted the current development state as locally release-ready for the verified scope.

Stage 71 selected production release planning as the next safe product development direction.

Production has not been changed during Stage 71.

## Safety boundary

Stage 72 is planning only.

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

Production execution requires a separate explicit confirmation and a separate execution stage.

Required phrase for future execution:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

## Planning scope

Stage 72 must define:

1. Target release commit or tag.
2. Current production deployed checkpoint.
3. Difference between production and target release.
4. Backup-before-deploy requirement.
5. Rollback boundary.
6. Server-only file preservation rules.
7. Production smoke checks.
8. No-go criteria.
9. Post-deployment monitoring checklist.
10. Acceptance criteria for moving to deployment preflight.

## Target release candidate

Initial candidate:

```text
Stage 70 release readiness checkpoint
```

The exact commit/tag must be confirmed during Stage 72 audit before any deployment execution.

## Required production preservation rules

The deployment plan must preserve:

- production `.env`;
- `docker-compose.override.yml`;
- Caddy configuration;
- persistent PostgreSQL volume;
- persistent Redis volume;
- persistent MinIO volume;
- existing backup directory;
- `amnezia-awg`.

## Backup-before-deploy requirement

Before any future production deployment:

- create protected backup;
- include PostgreSQL dump;
- include MinIO archive;
- include production `.env` copy without printing;
- include server-only compose override copy without printing;
- include Caddyfile copy without printing;
- record SHA256 checksums;
- verify archive integrity;
- stop if backup fails.

## Rollback boundary

Rollback planning must define:

- previous accepted production tag;
- previous production git HEAD;
- backup artifact path;
- restore decision boundary;
- service restart boundary;
- database restore boundary;
- no destructive rollback without separate explicit plan.

## No-go criteria

Future deployment must be blocked if:

- local working tree is dirty;
- target release is not confirmed;
- GitHub Actions are failing;
- required local guards fail;
- production backup-before-deploy fails;
- production `.env` is missing;
- server-only override is missing;
- Caddy is not active;
- Docker stack is unhealthy;
- production readiness is not green before deployment;
- unexpected migrations are detected without separate approval;
- secrets are printed;
- `amnezia-awg` would be touched.

## Required local checks

```text
git fetch origin --tags
git status --short
git branch -vv
git log --oneline --decorate -10
git tag --list "v0.1.0-stage70*"
python .\scripts\check_stage72_production_release_planning_baseline.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_org_cabinet_page.py
python .\scripts\smoke_org_cabinet_route.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_release_versioning.py
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
docker compose ps
```

## Acceptance criteria

Stage 72 baseline is accepted when:

- production release planning scope is documented;
- planning-only safety boundary is documented;
- target release candidate is identified as requiring confirmation;
- backup-before-deploy requirement is documented;
- rollback boundary is documented;
- no-go criteria are documented;
- server preservation rules are documented;
- no production action was executed;
- no production data was changed;
- no production services were restarted;
- no production secrets were printed or committed;
- baseline guard passes;
- working tree is clean before final acceptance.
