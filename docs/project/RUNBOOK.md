# ObrPortal — runbook

Last reviewed: 2026-08-12

This runbook defines a safe baseline for orienting, running and validating ObrPortal. Production operations are **not yet certified**; the production section is therefore a required checklist rather than a claim that rollout/rollback has been rehearsed.

## 1. Orient before changing anything

From the repository checkout:

```powershell
git fetch --all --prune
git status -sb
git log -1 --oneline
git branch --show-current
```

Then read:

1. `AGENTS.md`
2. `docs/project/STATUS.md`
3. the relevant architecture/decision/roadmap sections.

Before branch integration work, compare the actual refs on GitHub. Do not assume `main`, an old stage branch or a release branch is automatically the latest whole-product state.

## 2. Local development baseline

The repository's development compose stack provides:

- PostgreSQL;
- Redis;
- MinIO;
- FastAPI backend;
- Vite frontend.

If `.env` does not exist, create it from `.env.example` and replace only the values appropriate for the local environment. Never commit the real `.env`.

Typical startup:

```powershell
docker compose config --quiet
docker compose up -d --build
```

Check containers:

```powershell
docker compose ps
```

Default local endpoints are documented in `ENVIRONMENT.md`.

## 3. Database migrations

Before testing a branch that changes/depends on schema:

```powershell
docker compose exec backend alembic current
docker compose exec backend alembic upgrade head
```

For a fresh local database, seed canonical roles/permissions/data required by current tests/workflows when applicable:

```powershell
docker compose exec backend python -m app.db.seed
```

Rules:

- never edit production data merely to make a migration pass;
- never drop a database without explicit approval;
- when a migration is added, validate both clean-database migration and the supported upgrade path;
- record the expected Alembic head in release notes/preflight where relevant.

## 4. Basic health checks

Backend:

```powershell
Invoke-RestMethod http://localhost:8000/health
```

Frontend:

```powershell
Invoke-WebRequest http://localhost:5173/ -UseBasicParsing
```

Use the repository's readiness/system endpoints and smoke scripts appropriate to the branch for deeper checks.

## 5. Quality checks

Prefer targeted checks while developing, then broader checks before integration.

The repository contains check/smoke scripts; use the versions present on the branch being tested rather than copying stale commands from chat history.

Where `scripts/check-all.ps1` is present/current, use it as the branch's consolidated local quality entry point:

```powershell
.\scripts\check-all.ps1
```

Also inspect GitHub Actions for the exact commit/PR. A green CI result on a different branch does not certify the branch you are working on.

## 6. Public registration validation

Public registration is disabled by default. Do not enable it in the normal environment simply to run exploratory tests if an isolated environment can be used.

Minimum validation matrix:

- registration status reflects feature flag;
- valid registration returns the intended neutral accepted response;
- user creation/role assignment is correct;
- duplicate/existing identity does not leak sensitive account existence;
- resend preserves neutral behavior;
- rate limits behave correctly;
- setup token expires/is one-time;
- setup activates/verifies the user as designed;
- login succeeds after setup;
- audit events are written;
- real email delivery is verified separately before production certification.

For isolated release testing, use separate host ports/database/Redis namespace and verify mounts/commit explicitly. Do not run a compose file with fixed container names/ports alongside the normal stack unless it has been safely adapted.

## 7. SMTP/email validation

Never paste or commit the SMTP password into source-controlled files.

Before enabling real delivery, verify non-secret configuration:

- sender address/name;
- SMTP host;
- port;
- TLS/SSL mode;
- username;
- target environment/base URL.

Then store the password only in local/CI/production secrets and run one controlled end-to-end test:

1. submit registration through the public UI;
2. receive the actual email;
3. open the setup link generated for the correct frontend base URL;
4. set password;
5. log in;
6. verify user state and relevant audit completion;
7. verify resend/recovery email behavior as required.

## 8. Branch/PR integration procedure

Before merging a feature/release slice:

1. identify exact base/head SHAs;
2. compare against current `main`;
3. determine whether another active branch contains overlapping/divergent work;
4. run the head's own tests/CI;
5. verify migration implications;
6. verify controlled-feature defaults remain safe;
7. update `STATUS.md`/`DECISIONS.md` if necessary;
8. merge only after explicit approval.

Do not treat PR #117's registration verification as proof that the broader `feature/pilot-course-readiness` HEAD is green; they are separate lines after the audited `main` baseline.

## 9. Release candidate preflight

A release candidate should record at least:

- Git commit SHA;
- branch/tag;
- Alembic revision;
- frontend/backend build versions;
- configuration/feature flags (without secrets);
- CI result;
- smoke result;
- backup status;
- rollback target/procedure;
- known limitations.

## 10. Production deployment — NOT YET CERTIFIED

Before first production rollout, convert this checklist into environment-specific commands and rehearse them.

### Required before deploy

- [ ] production topology decided and documented;
- [ ] DNS/domain/TLS/reverse proxy decided;
- [ ] production DB and Redis access secured;
- [ ] object storage configured;
- [ ] SMTP configured and tested;
- [ ] secrets stored outside Git;
- [ ] current DB backup completed;
- [ ] restore procedure tested on a non-production target;
- [ ] migration impact reviewed;
- [ ] release candidate commit frozen;
- [ ] rollback target identified;
- [ ] maintenance/communication plan defined if needed.

### Deployment pattern

The intended safe pattern is:

1. deploy a known commit;
2. keep controlled new features disabled;
3. apply/verify migrations;
4. verify health/readiness;
5. run authenticated/public smoke checks;
6. inspect logs/errors;
7. enable controlled features separately only after approval;
8. run feature-specific smoke again.

### Rollback trigger examples

Define exact thresholds for the target environment, including at least:

- startup/readiness failure;
- migration failure;
- severe authentication/RBAC regression;
- data corruption risk;
- inability to complete the core pilot journey;
- abnormal error rate after rollout.

Rollback must account for whether a database migration is backward-compatible. Do not blindly roll application code back across an incompatible migration.

## 11. Backup/restore — required work

Production readiness requires evidence of restoration, not merely a configured backup job.

Document and rehearse:

- PostgreSQL backup command/tool and retention;
- restore into a clean non-production database;
- validation of restored schema/data;
- S3/object-storage retention/backup where required;
- Redis persistence requirements (if any durable state is intentionally stored there);
- who owns backup monitoring and restore authorization.

## 12. After a successful integration/release

Update:

- `STATUS.md` — new canonical state and next priority;
- `ROADMAP.md` — completed/next milestones;
- `DECISIONS.md` — only if a durable decision changed;
- `ARCHITECTURE.md`/`ENVIRONMENT.md`/this runbook — if operational contracts changed.

The goal is that a new chat or developer can reconstruct the current project state from Git without replaying historical conversations.
