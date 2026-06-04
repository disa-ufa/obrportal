# Stage 72.8 - Production preflight fact collection plan audit

Status: audit
Branch: stage72-production-preflight-fact-collection-plan-audit
Base branch: develop
Previous accepted stage: Stage 72.7 - Production preflight fact collection plan
Base develop checkpoint: eda18d5
Accepted planning tag: v0.1.0-stage72-production-release-planning
Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight
Scope: read-only production fact collection plan audit only

## Goal

Stage 72.8 audits the Stage 72.7 read-only production preflight fact collection plan.

This stage confirms that the prepared command list is safe, read-only, non-destructive and does not print secrets.

## Safety boundary

Stage 72.8 is audit and planning only.

It must not:

- connect to production;
- execute SSH commands;
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

## Audited target release candidate

```text
v0.1.0-stage72-production-release-planning
```

Target release commit:

```text
be97a41
```

Current fact collection planning checkpoint:

```text
eda18d5
```

## Audited command list result

The Stage 72.7 command list is accepted as a plan because it only collects read-only facts:

- host identifier;
- project directory;
- git HEAD, branch, status and tags;
- yes/no checks for `.env`, `docker-compose.override.yml` and Caddyfile;
- Caddy active/inactive status;
- Docker Compose service status;
- filtered Docker volume names;
- disk space summary;
- backup directory size or missing marker;
- running container names, images and statuses;
- `amnezia-awg` presence yes/no marker.

## Secret-safety audit

The planned command list does not intentionally print:

- token values;
- passwords;
- database URLs;
- secret keys;
- full `.env` contents;
- private keys;
- cookies;
- authorization headers;
- full server-only configuration contents.

The plan uses existence checks instead of printing file contents.

## Forbidden command audit

The plan explicitly forbids:

```text
cat .env
cat docker-compose.override.yml
cat Caddyfile
cat /etc/caddy/Caddyfile
docker compose up
docker compose down
docker compose restart
docker compose pull
docker compose build
docker volume rm
docker system prune
git reset --hard
git clean -fd
alembic upgrade
psql write queries
systemctl restart
systemctl stop
systemctl start
```

## No-go audit

Future production fact collection must remain blocked if:

- SSH target is unclear;
- production project directory is unclear;
- the command list is changed to include write operations;
- the command list is changed to print secrets;
- the operator cannot guarantee secrets will not be printed;
- commands would restart services;
- commands would run migrations;
- commands would modify files;
- commands would touch `amnezia-awg`.

## Audit decision

The Stage 72.7 production preflight fact collection plan is safe to accept as a planning artifact.

Stage 72.8 does not authorize SSH execution.

Stage 72.8 does not authorize production fact collection execution.

Stage 72.8 does not authorize production deployment.

Stage 72.8 does not authorize production backup execution.

Stage 72.8 does not authorize production service restart.

Stage 72.8 does not authorize production data modification.

## Required local audit checks

```text
python .\scripts\check_stage72_production_preflight_fact_collection_plan.py
python .\scripts\check_stage72_production_preflight_fact_collection_plan_audit.py
python .\scripts\check_stage72_production_deployment_preflight_baseline.py
python .\scripts\check_stage72_production_deployment_preflight_audit.py
python .\scripts\check_stage72_production_deployment_preflight_acceptance.py
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
Stage 72.9 - Production preflight fact collection plan acceptance
```
