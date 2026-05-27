# Production restore drill runbook

Status: accepted
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

Additional safety requirements:

- do not run destructive cleanup on production;
- do not use production database as a restore target;
- do not mount production postgres volume into a temporary container;
- do not publish temporary restore container ports to public interfaces;
- temporary restore credentials must not be reused as production credentials;
- production services must not be stopped for the drill.

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

## 9. Isolated restore drill result - 2026-05-27

Status: accepted

Isolated restore drill was completed and accepted.

Initial restore attempt result:

- first restore attempt failed safely because production owner role obrportal did not exist in the temporary isolated database;
- temporary restore container was removed;
- production remained healthy after the failed attempt;
- production_after_failed_restore_drill=ok.

Accepted successful restore drill evidence:

- production git head during drill: d872522;
- backup source: /opt/obrportal/backups/post-hardening-20260527-132749/postgres.dump;
- checksum_verification=passed;
- restore container was started with network=none;
- restore_ports_published=no;
- dump_copied=yes;
- restore_result=passed;
- restore_owner_mode=no_owner_no_privileges;
- public_table_count=17;
- restored core tables included alembic_version, courses, document_records, enrollments, permissions, roles and users;
- restored_alembic_revision=6421_org_doc_profile;
- temporary container ports were empty;
- temporary_restore_container_removed=yes;
- production /api/v1/ready remained database=ok, redis=ok, storage=ok;
- public /login returned HTTP 200 after drill;
- public /admin returned HTTP 200 after drill;
- production_volumes_untouched=yes;
- restore_drill_isolated=yes;
- restore_drill_cleanup_done=yes;
- restore_drill_result=passed;
- secrets_printed=no.

Accepted production reports:

- /opt/obrportal/tmp/stage_11_2_1a_post_failed_restore_drill_smoke_20260527142238.txt
- /opt/obrportal/tmp/stage_11_2_2_isolated_restore_drill_no_owner_20260527142258.txt
