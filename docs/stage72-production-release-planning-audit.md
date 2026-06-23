# Stage 72.2 - Production release planning audit

Status: audit
Branch: stage72-production-release-planning-audit
Base branch: develop
Previous accepted stage: Stage 72.1 - Production release planning baseline acceptance
Base develop checkpoint: 5b5b848
Scope: production release planning audit only

## Goal

Stage 72.2 audits the production release plan before any production deployment execution.

This stage must confirm the target release boundary, backup-before-deploy plan, rollback plan, smoke checks, no-go criteria and production preservation rules.

## Safety boundary

Stage 72.2 is audit and planning only.

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

## Release candidate

Initial release candidate:

```text
develop at 5b5b848
```

Target production release tag to be created later:

```text
v0.1.0-stage72-production-release-planning
```

The exact tag must not be created until the audit is accepted.

## Known accepted checkpoints

```text
v0.1.0-stage70-release-readiness-checkpoint
v0.1.0-stage71-next-product-backlog-selection
5b5b848 - Stage 72.1 accepted in develop
```

## Required local audit commands

```text
git fetch origin --tags
git status --short
git branch -vv
git log --oneline --decorate -12
git tag --list "v0.1.0-stage*"
git diff --stat v0.1.0-stage70-release-readiness-checkpoint..HEAD
git diff --name-status v0.1.0-stage70-release-readiness-checkpoint..HEAD
python .\scripts\check_stage72_production_release_planning_baseline.py
python .\scripts\check_stage72_production_release_planning_baseline_acceptance.py
python .\scripts\smoke_admin_components.py
python .\scripts\smoke_frontend_admin_pages.py
python .\scripts\smoke_org_cabinet_page.py
python .\scripts\smoke_org_cabinet_route.py
python .\scripts\smoke_documents_page.py
python .\scripts\smoke_frontend_core.py
python .\scripts\check_source_bom.py
python .\scripts\check_text_encoding.py
python .\scripts\secret_scan.py
git diff --check
git status --short
```

## Production preflight information to confirm later

The following information must be confirmed before production execution:

- current production git HEAD;
- current production release tag, if any;
- current production Docker Compose status;
- production `.env` exists without printing contents;
- server-only `docker-compose.override.yml` exists without printing contents;
- Caddy configuration exists without printing contents;
- PostgreSQL volume exists;
- Redis volume exists;
- MinIO volume exists;
- backup directory exists or can be created;
- `amnezia-awg` is present and must not be touched.

## Backup-before-deploy plan

Before any future production deployment, the execution stage must create a protected backup containing:

- PostgreSQL dump;
- MinIO archive;
- production `.env` copy without printing;
- server-only compose override copy without printing;
- Caddyfile copy without printing;
- deployment metadata file;
- SHA256 checksums.

Deployment must stop if backup creation or verification fails.

## Rollback boundary

Rollback planning must preserve the ability to return to the previous production state.

Rollback metadata must include:

- previous production git HEAD;
- previous production release tag, if any;
- backup artifact path;
- database restore boundary;
- object storage restore boundary;
- service restart boundary;
- explicit no-destructive-rollback rule without separate confirmation.

## No-go criteria

Production deployment must be blocked if:

- local working tree is dirty;
- target release commit or tag is not confirmed;
- GitHub Actions are failing;
- required local guards fail;
- production backup-before-deploy fails;
- production `.env` is missing;
- server-only override is missing;
- Caddy is not active;
- Docker stack is unhealthy;
- unexpected migrations are detected without separate approval;
- secrets would be printed;
- `amnezia-awg` would be touched.

## Audit decision rule

Stage 72.2 can be accepted only after:

- local audit checks pass;
- diff boundary is documented;
- target release candidate is documented;
- backup plan is documented;
- rollback plan is documented;
- no-go criteria are documented;
- production preservation rules are documented;
- no production action was executed;
- no production data was changed;
- no production services were restarted;
- no production secrets were printed.

## Next stage

```text
Stage 72.3 - Production release planning acceptance
```
