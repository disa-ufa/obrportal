# Stage 64 - Release metadata version alignment baseline

Status: planned
Base branch: develop
Base checkpoint: 54c5976
Previous stage: v0.1.0-stage63-product-development-backlog-selection
Scope: align runtime release metadata and version reporting

## Goal

Stage 64 aligns release metadata so runtime health/version endpoints and project metadata clearly report the current application release state.

## Background

Stage 61 deployed production successfully.
Stage 62 confirmed production stability.
Stage 63 selected release metadata/version alignment as the next product cycle.

Production currently runs the deployed release tag v0.1.0-stage57-production-protected-backup-execution, but /health reports an older development-style version string.

## Problem

Runtime version metadata is not aligned with the release/deployment history, which makes operational checks less clear.

## Target behavior

```text
Backend /health should expose a clear application version.
Version source should be explicit and testable.
Frontend/package release metadata should be reviewed and aligned if needed.
Smoke/tests should protect against accidental version drift.
Production deployment remains separate from this implementation stage.
```

## Investigation targets

```text
backend app settings/config
backend health endpoint
backend tests for health endpoint
frontend package.json
frontend build metadata if present
docker compose environment variables if version is injected
CI/smoke scripts that check release metadata
```

## Safety rule

Stage 64 is a local development stage. It must not deploy to production, modify production data, restart production services, run production migrations or change server configuration.

## Acceptance checks

Required checks before acceptance:

```text
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
docker compose ps
git status --short
```

## Acceptance criteria

- Current version metadata sources are identified.
- Backend /health version behavior is aligned or a precise implementation plan is documented.
- Tests/smoke checks are updated if code changes are made.
- No production changes are executed.
- No production secrets are printed or committed.
- Secret scan and encoding guards pass.
- Frontend build passes.
- Backend tests pass.
- Working tree is clean before final acceptance.
