# Stage 72.7 - Production preflight fact collection plan

Status: planned
Branch: stage72-production-preflight-fact-collection-plan
Base branch: develop
Previous accepted stage: Stage 72.6 - Production deployment preflight acceptance
Base develop checkpoint: 138efb2
Accepted planning tag: v0.1.0-stage72-production-release-planning
Accepted preflight tag: v0.1.0-stage72-production-deployment-preflight
Scope: read-only production fact collection plan only

## Goal

Stage 72.7 prepares the exact read-only production preflight fact collection command list.

This stage does not execute SSH commands and does not connect to production.

The command list prepared here may be used later only in a separate confirmed production fact collection stage.

## Safety boundary

Stage 72.7 is planning only.

It must not:

- connect to production;
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

## Production execution lock

Production deployment remains blocked.

The following phrase is reserved only for a future deployment execution stage and is not used in Stage 72.7:

```text
CONFIRM PRODUCTION DEPLOYMENT
```

## Target release candidate

```text
v0.1.0-stage72-production-release-planning
```

Target release commit:

```text
be97a41
```

Current preflight planning checkpoint:

```text
138efb2
```

## Future production fact collection rules

When a later stage explicitly authorizes production fact collection, the commands must:

- be read-only;
- avoid printing secret values;
- avoid printing full server-only configuration files;
- avoid service restarts;
- avoid migrations;
- avoid Docker pull/build/up/down/restart commands;
- avoid destructive filesystem commands;
- avoid touching `amnezia-awg`.

## Exact read-only command list for later execution

The following command list is prepared for a later production fact collection stage.

It must be executed only after separate approval.

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

## Explicitly forbidden commands

The following command patterns are forbidden during preflight fact collection:

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

## Expected safe output

The future output should contain only:

- host identifier;
- current directory;
- git HEAD, branch, status and tags;
- yes/no file existence checks;
- Caddy active/inactive status;
- Docker Compose service status;
- filtered Docker volume names;
- disk space summary;
- backup directory size or missing marker;
- running container names, images and statuses;
- `amnezia-awg` presence yes/no marker.

## Forbidden output

The future output must not contain:

- token values;
- passwords;
- database URLs;
- secret keys;
- full `.env` contents;
- private keys;
- cookies;
- authorization headers;
- full server-only configuration contents.

## No-go criteria

Future production fact collection must be blocked if:

- the command list is modified to include write operations;
- SSH target is unclear;
- production project directory is unclear;
- the operator cannot guarantee secrets will not be printed;
- commands would restart services;
- commands would run migrations;
- commands would modify files;
- commands would touch `amnezia-awg`.

## Acceptance criteria

Stage 72.7 is accepted when:

- exact read-only command list is documented;
- forbidden command list is documented;
- forbidden output list is documented;
- no-go criteria are documented;
- no SSH command was executed;
- no production connection was made;
- no production deployment was executed;
- no production secrets were printed;
- guard passes;
- working tree is clean before final acceptance.

## Next stage

```text
Stage 72.8 - Production preflight fact collection plan audit
```
