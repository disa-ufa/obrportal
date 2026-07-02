# Stage 64 - Release metadata version alignment acceptance

Status: accepted
Branch: stage64-release-metadata-version-alignment-audit
Baseline commit: ee01379
Implementation commit: d9d743b
Audit commit: f1b1426
Base develop checkpoint: 54c5976
Previous stage: v0.1.0-stage63-product-development-backlog-selection

## Goal

Stage 64 aligns release metadata so runtime health/version endpoints and project metadata clearly report the current application release state.

## Accepted results

- Stage 64 baseline was documented.
- Stage 64 implementation was completed.
- Stage 64 audit was documented.
- Runtime development version was advanced from 0.1.0-stage31-dev to 0.1.0-stage64-dev.
- Backend settings.app_version default was updated.
- Backend /health continues to use settings.app_version.
- FastAPI(version=...) continues to use settings.app_version.
- .env.example APP_VERSION was updated.
- Frontend package metadata was updated.
- Frontend package-lock metadata was updated.
- Release versioning guard was updated.
- Stage 64 release metadata alignment guard was added.
- Backend health test now verifies payload version against settings.app_version.
- No production deployment was executed.
- No production data was changed.
- No production services were restarted.
- No production secrets were printed or committed.

## Version alignment

```text
Old development version: 0.1.0-stage31-dev
New development version: 0.1.0-stage64-dev
Legacy release line preserved: 0.1.0-stage6
Backend version source: settings.app_version
Health version source: settings.app_version
Frontend package metadata: aligned
```

## Files changed

```text
.env.example
backend/app/core/config.py
backend/app/tests/test_health.py
frontend/package.json
frontend/package-lock.json
scripts/check_release_versioning.py
scripts/check_stage64_release_metadata_alignment.py
docs/stage64-release-metadata-version-alignment-baseline.md
docs/stage64-release-metadata-version-alignment-audit.md
```

## Local runtime verification

```text
GET http://127.0.0.1:8000/health -> HTTP 200
{"status":"ok","app":"ObrPortal","environment":"local","version":"0.1.0-stage64-dev"}

GET http://127.0.0.1:8000/api/v1/ready -> HTTP 200
{"status":"ok","database":"ok","redis":"ok","storage":"ok"}
```

## Verified checks

```text
docker compose up -d --build backend frontend
docker compose exec frontend npm run build
docker compose exec -e TEST_BASE_URL=http://127.0.0.1:8000 backend pytest app/tests -q
python .\scripts\check_stage64_release_metadata_alignment.py
python .\scripts\check_release_versioning.py
python .\scripts\secret_scan.py
python .\scripts\check_text_encoding.py
python .\scripts\check_source_bom.py
```

## Test result

```text
Frontend build: passed
Backend pytest: 215 passed, 4 warnings
Stage 64 metadata guard: passed
Release versioning guard: passed
Secret scan: passed
Text encoding guard: passed
Source BOM guard: passed
```

## Safety result

- Changes were validated locally only.
- Production remains deployed at the previously accepted production release tag.
- Production deployment of Stage 64 is not part of this stage.

## Decision

Stage 64 is accepted as release metadata version alignment.

## Next possible cycle

```text
Stage 65 - Product development continuation after metadata alignment
```
