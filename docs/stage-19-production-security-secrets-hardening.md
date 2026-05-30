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

## 3. Application security checklist - 2026-05-30

Goal: define application-level security checks before production operation without printing secret values.

Current git head before application security checklist: `cd057a8`.

Required application security checks:
1. `SECRET_KEY` / signing secret:
   - production `SECRET_KEY` must be strong, private and unique;
   - production `SECRET_KEY` must not use local/test/default values;
   - `SECRET_KEY` must be supplied through private deployment configuration;
   - `SECRET_KEY` must never be committed, printed or pasted into support messages.

2. JWT/token configuration:
   - access token expiration must be reviewed before production use;
   - token validation must reject expired/invalid tokens;
   - token payload must not include unnecessary sensitive data;
   - authentication errors must be controlled and must not expose stack traces.

3. CORS and URL configuration:
   - production frontend URL must be explicit;
   - production backend/API URL must be explicit;
   - CORS origins must be limited to intended production domains;
   - wildcard CORS must not be used for production unless explicitly justified and documented.

4. Admin credentials policy:
   - production admin account must not use default/test credentials;
   - admin password must be strong and stored only as a hash;
   - initial admin credential delivery must happen outside git/chat/logs;
   - disabled/test users must not retain production admin access.

5. Error and logging policy:
   - raw exceptions must not be displayed to operators or public users;
   - user-facing errors must stay friendly and safe;
   - logs must not include passwords, tokens, private keys or `.env` contents;
   - support/debug messages must include only non-secret context: endpoint, timestamp, status code and role.

6. Public access policy:
   - public pages must remain intentionally public;
   - document verification must expose only intended verification data;
   - account/admin/document download paths must require the correct authorization;
   - forbidden/unauthorized responses must not leak protected data.

Accepted decision:
- Stage 19.2 documents the application security checklist only;
- real production values must be reviewed privately during deployment;
- no real secrets are recorded in repository documentation.

Safety notes:
- This checkpoint documents application security only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage19_application_security_checklist_recorded=yes`.

Verification markers:
- `Stage 19.2 application security checklist - 2026-05-30`
- `stage19_application_security_checklist_recorded=yes`
- `stage19_secret_key_policy_defined=yes`
- `stage19_jwt_token_policy_defined=yes`
- `stage19_cors_url_policy_defined=yes`
- `stage19_admin_credentials_policy_defined=yes`
- `stage19_error_logging_policy_defined=yes`
- `stage19_public_access_policy_defined=yes`

## 4. Infrastructure security checklist - 2026-05-30

Goal: define infrastructure-level security checks before production operation without printing secret values.

Current git head before infrastructure security checklist: `0839194`.

Required infrastructure security checks:
1. PostgreSQL credentials:
   - production database username/password must be private;
   - database credentials must not be committed or printed;
   - database access must be limited to intended services/network;
   - backups must not contain exposed credentials in filenames or logs.

2. MinIO/object storage credentials:
   - production MinIO root/access credentials must be private;
   - MinIO credentials must not be committed or printed;
   - document buckets must not be deleted during routine deployment;
   - object storage backup must be handled as sensitive operational data.

3. Public port exposure:
   - publicly exposed ports must be intentional and documented;
   - backend/frontend exposure must match deployment architecture;
   - database, Redis and MinIO ports must not be publicly exposed unless explicitly protected and justified;
   - firewall/reverse-proxy rules must be reviewed before production operation.

4. Docker and container configuration:
   - Docker Compose must not contain real production secrets;
   - environment values in compose files must use variable references/placeholders;
   - production `.env` must remain private on the server;
   - container logs must not expose secret values.

5. Backup and artifact security:
   - PostgreSQL dumps must be stored outside git;
   - MinIO/object storage backups must be stored outside git;
   - backup archives must be access-controlled;
   - local smoke/debug logs must not be committed unless sanitized and intentionally documented.

6. Operational access:
   - server SSH access must be limited to authorized administrators;
   - deployment credentials must be stored outside the repository;
   - support/debug handoff must not include secrets;
   - incident response must include immediate secret rotation if exposure is suspected.

Accepted decision:
- Stage 19.3 documents infrastructure security policy only;
- real production credentials and network rules must be reviewed privately on the target server;
- no real secrets are recorded in repository documentation.

Safety notes:
- This checkpoint documents infrastructure security only.
- No runtime code was changed.
- No database migrations were added.
- No backend API contract changes were added.
- No authentication or RBAC changes were introduced.
- No destructive bulk action was added.
- Secrets were not printed.
- `stage19_infrastructure_security_checklist_recorded=yes`.

Verification markers:
- `Stage 19.3 infrastructure security checklist - 2026-05-30`
- `stage19_infrastructure_security_checklist_recorded=yes`
- `stage19_postgres_credentials_policy_defined=yes`
- `stage19_minio_credentials_policy_defined=yes`
- `stage19_public_ports_policy_defined=yes`
- `stage19_docker_env_policy_defined=yes`
- `stage19_backup_artifact_security_defined=yes`
- `stage19_operational_access_policy_defined=yes`
