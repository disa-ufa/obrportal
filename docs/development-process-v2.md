# Development process v2 - accelerated stage workflow

Status: active
Project: ObrPortal
Applies from: Stage 75
Last revised: 2026-07-14

## 1. Purpose

This document replaces the micro-stage workflow with a larger stage-package workflow.

The previous process was safe but slow because every small change created a separate stage document, guard, pull request, merge and production result record.

The new process keeps safety boundaries but reduces ceremony:

- one stage covers a meaningful product package;
- one implementation branch per package;
- one pull request per package;
- one production deploy result per deployed package;
- one release manifest records planned, implemented and deployed state;
- one generic manifest guard replaces most per-stage guard scripts.

## 2. Stage package rule

A stage should now represent a product slice, not a single UI line change.

Examples:

- public portal official content polish;
- organization documents publishing;
- learner account workflow improvements;
- admin operations workflow improvements;
- production maintenance and upgrade pass.

Small changes inside one package should be merged together when they share the same risk level and deployment type.

## 3. Documentation types

### Planning documentation

Can be prepared in advance:

- roadmap;
- stage scope;
- acceptance criteria;
- deploy checklist;
- rollback checklist;
- smoke checklist.

### Implementation documentation

Created with the code change:

- changed files;
- runtime scope;
- checks passed;
- safety boundaries;
- known limitations.

### Production evidence documentation

Created only after the real production action:

- server head before and after;
- deployed branch;
- Docker status;
- health and ready responses;
- public route response codes;
- content checks;
- whether backend, database or migrations were touched.

## 4. Safety boundaries

The following remain mandatory:

- no secrets in docs, logs or commits;
- no production `.env` output;
- no `docker compose down -v` in normal deployment;
- no database migration without explicit approval;
- no backend restart for frontend-only content changes;
- no RBAC or auth weakening;
- no unverified legal document numbers or license details on public pages;
- server-only paths such as `backups/`, `tmp/` and `docker-compose.override.yml` stay uncommitted.

## 5. Branch and PR policy

Default target branch for active development:

```text
main
```

Feature branches should use descriptive package names, for example:

```text
stage75-public-portal-content-polish
```

Pull requests must target `main`. Merging to `main` does not deploy automatically. Production deployment remains a separate explicit action.

## 6. Preferred stage flow

1. Create or update the release manifest.
2. Add or update package documentation.
3. Implement code changes.
4. Run local checks.
5. Open PR into `main`.
6. Merge after checks pass.
7. Deploy according to the package type.
8. Record production evidence in the release manifest and package document.

## 7. Deployment categories

### Documentation-only

No runtime deployment required.

### Frontend-only

Allowed actions:

```bash
git pull --ff-only origin main
docker compose build frontend
docker compose up -d --no-deps frontend
```

Not allowed:

```bash
docker compose down -v
alembic upgrade head
backend restart unless separately approved
```

### Backend/API

Requires backend tests, API contract review, migration check and explicit production plan.

### Database migration

Requires backup confirmation, migration plan, rollback plan and explicit approval.

## 8. Current adoption checkpoint

The accelerated workflow remains active.

Current branch policy:

```text
development_base=main
production_branch=main
merge_to_main_does_not_auto_deploy=yes
production_deployment_requires_explicit_decision=yes
```

Confirmed production state after the 2026-07-14 release:

```text
production_branch=main
production_head=fa090cd
production_host=portal.rcdo02.ru
public_base_url=https://portal.rcdo02.ru
frontend_health=healthy
backend_health=ok
ready_status=ok
last_migration=6427_user_password_tokens
invitation_email_delivery=verified
password_setup_e2e=verified
backup_status=verified
docker_cleanup_performed=no
```

The next product stage is Stage 82.23:
First real course end-to-end pilot.
