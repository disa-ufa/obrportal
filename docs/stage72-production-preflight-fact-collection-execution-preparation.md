# Stage 72.10 - Production preflight fact collection execution preparation

Status: planned
Branch: stage72-production-preflight-fact-collection-execution-preparation
Base branch: develop
Previous accepted stage: Stage 72.9 - Production preflight fact collection plan acceptance
Base develop checkpoint: 940c23d
Accepted planning tag: v0.1.0-stage72-production-release-planning
Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight
Accepted fact collection plan tag: v0.1.0-stage72-production-preflight-fact-collection-plan
Scope: read-only production fact collection execution preparation only

## Goal

Stage 72.10 prepares the separate procedure for a future read-only production preflight fact collection execution.

This stage does not execute SSH commands and does not connect to production.

It only documents the operator checklist, confirmation phrase, execution boundary, safe command block and stop conditions.

## Safety boundary

Stage 72.10 is execution preparation only.

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

## Production deployment lock

Production deployment remains blocked.

The following phrase is reserved only for a future deployment execution stage and is not used in Stage 72.10:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

## Production fact collection execution lock

Future read-only production fact collection requires a separate explicit confirmation phrase:

```text
CONFIRM PRODUCTION FACT COLLECTION
```

This phrase is documented here but must not be used to execute commands during Stage 72.10.

## Target release candidate

```text
v0.1.0-stage72-production-release-planning
```

Target release commit:

```text
be97a41
```

Current accepted fact collection planning checkpoint:

```text
940c23d
```

## Operator prerequisites for future execution

Before any future read-only production fact collection execution, the operator must confirm:

- SSH target is known;
- production project directory is known;
- command list matches the accepted Stage 72.7 plan;
- no command prints `.env` contents;
- no command prints server-only config contents;
- no command restarts services;
- no command modifies files;
- no command runs migrations;
- no command deploys application changes;
- no command touches `amnezia-awg`.

## Future execution wrapper

The future execution stage must use a clearly bounded SSH session.

Template only, not for execution in Stage 72.10:

```text
ssh <production-user>@<production-host>
cd <production-project-directory>
<run accepted read-only command block>
exit
```

The placeholder values must be resolved only in a later confirmed execution stage.

## Accepted read-only command block for future execution

The following block is the accepted read-only command list from Stage 72.7.

It must not be executed during Stage 72.10.

```bash
echo "== host =="
hostname

echo "== project directory =="
pwd

echo "== git =="
git rev-parse --short HEAD
git branch --show-current
git status --short
git tag --points-at HEAD

echo "== required files existence only =="
if [ -f .env ]; then echo "env_file_exists=yes"; else echo "env_file_exists=no"; fi
if [ -f docker-compose.override.yml ]; then echo "compose_override_exists=yes"; else echo "compose_override_exists=no"; fi
if [ -f Caddyfile ]; then echo "caddyfile_in_project_exists=yes"; else echo "caddyfile_in_project_exists=no"; fi
if [ -f /etc/caddy/Caddyfile ]; then echo "caddyfile_etc_exists=yes"; else echo "caddyfile_etc_exists=no"; fi

echo "== caddy status =="
systemctl is-active caddy || true

echo "== docker compose services =="
docker compose ps

echo "== docker volumes, filtered =="
docker volume ls --format "{{.Name}}" | grep -Ei "obrportal|postgres|redis|minio|caddy|pg|db" || true

echo "== disk space =="
df -h .

echo "== backup directory size if present =="
if [ -d backups ]; then du -sh backups; else echo "backups_dir_exists=no"; fi
if [ -d backup ]; then du -sh backup; else echo "backup_dir_exists=no"; fi

echo "== running containers names/images =="
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

echo "== amnezia-awg presence check only =="
if systemctl list-units --type=service --all | grep -q "amnezia"; then echo "amnezia_service_seen=yes"; else echo "amnezia_service_seen=no"; fi
```

## Future output handling rules

The future execution output must be reviewed before being stored or pasted into project documentation.

If output accidentally contains secrets, it must not be committed, pasted into chat, or stored in the repository.

Allowed output categories:

- host identifier;
- project directory;
- git status;
- yes/no existence checks;
- service status;
- Docker service list;
- filtered volume names;
- disk usage;
- backup directory size;
- container names, images and statuses;
- `amnezia-awg` yes/no presence marker.

Forbidden output categories:

- token values;
- passwords;
- database URLs;
- secret keys;
- full `.env` contents;
- private keys;
- cookies;
- authorization headers;
- full server-only configuration contents.

## Stop conditions

Future fact collection execution must stop if:

- SSH target is unclear;
- production project directory is unclear;
- command list differs from accepted Stage 72.7 plan;
- command would print secrets;
- command would restart services;
- command would run migrations;
- command would modify files;
- command would deploy changes;
- command would touch `amnezia-awg`.

## Acceptance criteria

Stage 72.10 is accepted when:

- execution preparation boundary is documented;
- production deployment lock is documented;
- production fact collection confirmation phrase is documented;
- operator prerequisites are documented;
- accepted read-only command block is documented;
- output handling rules are documented;
- stop conditions are documented;
- no SSH command was executed;
- no production connection was made;
- no production deployment was executed;
- no production secrets were printed;
- guard passes;
- working tree is clean before final acceptance.

## Next stage

```text
Stage 72.11 - Production preflight fact collection execution preparation audit
```
