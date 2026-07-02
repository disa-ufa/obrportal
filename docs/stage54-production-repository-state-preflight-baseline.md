# Stage 54 - Production repository state preflight baseline

Status: planned
Base branch: develop
Base checkpoint: d791a10
Previous stage: v0.1.0-stage53-production-server-inventory-preflight
Scope: production repository state preflight without deployment

## Goal

Stage 54 checks the current repository state on the production server before any real deployment stage is opened.

## Production target

```text
Production server IP: 89.127.203.70
Production SSH target: root@89.127.203.70
Production project path: /opt/obrportal
Production domain: portal.rcdo02.ru
```

## Safety rule

Stage 54 is read-only repository inspection. It must not pull code, checkout branches, edit files, read .env contents, run migrations, rebuild images, restart services or change server configuration.

## Target behavior

- Verify /opt/obrportal is a git repository.
- Record current branch and commit.
- Record whether the working tree is clean.
- Record tags and latest local history.
- Record sanitized origin URL without exposing credentials.
- Record Docker Compose service names without rendering environment secrets.
- Keep production secrets outside git.
- Keep application code unchanged.
- Do not run live production deployment.

## Server read-only commands planned

```bash
cd /opt/obrportal
pwd
git status --short
git branch --show-current
git rev-parse HEAD
git log --oneline --decorate -8
git tag --list "v0.1.0-stage5*" | tail -20
git remote get-url origin | sed -E "s#(https://)[^/@]+@#\1***@#"
docker compose ps
docker compose config --services
```

## Forbidden commands in this stage

```text
cat .env
printenv
git pull
git fetch
git checkout
docker compose up
docker compose down
docker compose restart
docker compose exec backend alembic upgrade head
```

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
python .\scripts\check_production_server_preflight_execution.py
docker compose ps
git status --short
```

## Acceptance criteria

- Production repository state is documented.
- No secrets are printed or committed.
- No live production deployment is executed.
- No server modification commands are executed.
- No application code changes are made.
- Secret scan and encoding guards pass.
- Working tree is clean before final acceptance.
