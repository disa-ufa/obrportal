# Production restore drill runbook

Status: drafted
Stage: 11.2
Production domain: portal.rcdo02.ru
Production hardened tag: v0.1.0-stage10-production-hardened

## 1. Purpose

This runbook defines a safe restore drill procedure for ObrPortal production backups.

The restore drill must validate backup usability without changing production data.

## 2. Safety rules

The restore drill must be isolated from production.

Forbidden actions on production:

- docker compose down -v;
- deleting production volumes;
- restoring a dump into the production database;
- changing production .env;
- exposing postgres, redis, minio, backend or frontend ports publicly;
- printing secrets;
- committing backup files to git.

## 3. Backup source

Accepted backup source is the post-hardening backup:

- /opt/obrportal/backups/post-hardening-20260527-132749/postgres.dump;
- /opt/obrportal/backups/post-hardening-20260527-132749/postgres.dump.sha256;
- /opt/obrportal/backups/post-hardening-20260527-132749/metadata.txt.

The checksum must be verified before any restore attempt.

## 4. Isolated restore target

Allowed restore target:

- temporary local container;
- temporary isolated database;
- no production volume mounts;
- no production port exposure;
- temporary database removed after drill.

The drill must not use the production postgres container as restore target.

## 5. Restore drill procedure

Required steps:

- verify backup checksum;
- create temporary isolated postgres container or database;
- restore dump into the temporary isolated target;
- run simple integrity checks;
- document table count;
- document alembic revision if available;
- remove temporary isolated resources;
- keep production running.

## 6. Acceptance criteria

Restore drill is accepted when:

- checksum verification passes;
- restore into isolated target succeeds;
- temporary database contains application tables;
- no production container is destroyed;
- production /api/v1/ready remains green;
- public /login remains HTTP 200;
- public /admin remains HTTP 200;
- temporary resources are removed;
- secrets are not printed.

## 7. Rollback and cleanup

Cleanup procedure:

- stop temporary restore container;
- remove temporary restore container;
- remove temporary restore volume if one was created;
- do not remove production volumes;
- do not remove production backup.

## 8. Evidence

Each restore drill must create a report in:

- /opt/obrportal/tmp

The report must include:

- backup path;
- checksum result;
- restore target type;
- restore result;
- table count or schema check result;
- production smoke result after drill;
- cleanup result.
