# Stage 19 - Production security and secrets hardening

## 1. Baseline - 2026-05-30

Goal: start Stage 19 after completing Stage 18 production runbook/operator handoff.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 17 production deployment readiness is complete;
- Stage 18 production runbook/operator handoff is complete;
- Stage 18 final tag is expected: `v0.1.0-stage18-production-runbook-operator-handoff-complete`;
- current git head at Stage 19 baseline creation: `c92fc7f`.

Stage 19 purpose:
- verify production security posture before real operation;
- verify secrets and `.env` hygiene;
- verify `.env.example` contains placeholders only;
- verify documentation does not contain real secrets;
- verify Docker/env configuration does not expose sensitive values;
- verify authentication/JWT/CORS security checklist;
- define rules for safe production configuration handling.

Planned Stage 19 scope:
1. Secrets inventory:
   - `.env` must stay uncommitted;
   - `.env.example` must contain placeholders only;
   - tokens/passwords/private keys must not be committed;
   - logs must not print secrets.

2. Application security checklist:
   - `SECRET_KEY` must be production-strong and private;
   - JWT/token configuration must be reviewed before deployment;
   - CORS/frontend/backend URL settings must match production domain;
   - admin credentials must not be default/test credentials in production.

3. Infrastructure security checklist:
   - database credentials must be private;
   - MinIO credentials must be private;
   - public ports must be intentionally exposed;
   - backup artifacts must not be committed.

4. Release safety:
   - no destructive commands without explicit confirmation;
   - no production `.env` in git;
   - no secret values in support/debug messages;
   - final security acceptance before tag.

Out of scope for Stage 19 baseline:
- no database migrations;
- no backend API contract changes;
- no frontend UI feature changes;
- no RBAC changes;
- no destructive bulk actions;
- no real secret rotation inside git.

Safety notes:
- This baseline creates documentation and a diagnostic guard only.
- Runtime code is not changed.
- Secrets must not be printed.
- `.env` must stay uncommitted.
- `stage19_production_security_secrets_hardening_baseline=yes`.

Verification markers:
- `Stage 19 production security secrets hardening baseline - 2026-05-30`
- `stage19_production_security_secrets_hardening_baseline=yes`
- `stage19_runtime_changed=no`
- `stage19_depends_on_stage14_complete=yes`
- `stage19_depends_on_stage15_complete=yes`
- `stage19_depends_on_stage16_complete=yes`
- `stage19_depends_on_stage17_complete=yes`
- `stage19_depends_on_stage18_complete=yes`

## 2. Secrets inventory and git hygiene - 2026-05-30

Goal: record Stage 19.1 secrets inventory without reading or printing real secret values.

Current git head before secrets inventory: `512425a`.

Local `.env` status:
- local `.env` exists: `true`;
- local `.env` is ignored by git: `true`;
- local `.env` is tracked by git: `false`.

Accepted `.env` decision:
- local `.env` may exist for Docker/local development;
- `.env` must be ignored by git;
- `.env` must not be tracked by git;
- `.env` contents must not be printed in terminal output, logs, docs or support messages;
- production `.env` must be stored privately outside the repository.

`.env.example` decision:
- `.env.example` may contain variable names and safe placeholders;
- `.env.example` must not contain real production passwords, tokens, private keys or access keys;
- `.env.example` is the public template for required deployment variables.

Git hygiene checks:
- `.gitignore` must include `.env`;
- production secrets must not be committed;
- backup artifacts must not be committed;
- local smoke logs must not be committed unless sanitized and intentionally documented;
- diagnostic scripts must avoid printing secret values.

Secrets handling rules:
- never paste real production `.env` into chat, issues, commits or logs;
- rotate any secret immediately if it was exposed;
- use deployment secrets/private server files for production values;
- use placeholders in documentation;
- record only presence/absence and safety status, not values.

Safety notes:
- This checkpoint documents secrets inventory and git hygiene only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage19_secrets_inventory_recorded=yes`.

Verification markers:
- `Stage 19.1 secrets inventory git hygiene - 2026-05-30`
- `stage19_secrets_inventory_recorded=yes`
- `stage19_env_local_allowed_if_ignored=yes`
- `stage19_env_not_tracked_required=yes`
- `stage19_env_example_placeholders_only=yes`
- `stage19_no_secret_values_printed=yes`
- `stage19_git_hygiene_rules_defined=yes`
