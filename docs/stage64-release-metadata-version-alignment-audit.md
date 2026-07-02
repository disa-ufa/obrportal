# Stage 64 - Release metadata version alignment audit

Status: draft
Branch: stage64-release-metadata-version-alignment-audit
Baseline commit: ee01379
Base develop checkpoint: 54c5976
Previous stage: v0.1.0-stage63-product-development-backlog-selection

## Summary

Stage 64 aligned local runtime release metadata and version reporting from the old development marker to the current Stage 64 development marker.

## Implementation result

```text
Result: success
Old development version: 0.1.0-stage31-dev
New development version: 0.1.0-stage64-dev
Backend version source: settings.app_version
Health version source: settings.app_version
Frontend package metadata: aligned
Production deployment: not executed
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
```

## Backend metadata alignment

```text
backend/app/core/config.py default APP_VERSION moved to 0.1.0-stage64-dev.
backend /health continues to return settings.app_version.
backend FastAPI(version=...) continues to use settings.app_version.
backend health test now asserts payload["version"] == settings.app_version.
```

## Frontend metadata alignment

```text
frontend/package.json version -> 0.1.0-stage64-dev
frontend/package-lock.json top-level version -> 0.1.0-stage64-dev
frontend/package-lock.json root package version -> 0.1.0-stage64-dev
```

## Guard alignment

```text
scripts/check_release_versioning.py DEVELOPMENT_VERSION -> 0.1.0-stage64-dev
scripts/check_stage64_release_metadata_alignment.py added
Legacy release line remains: 0.1.0-stage6
```

## Local runtime verification

```text
GET http://127.0.0.1:8000/health -> HTTP 200
{"status":"ok","app":"ObrPortal","environment":"local","version":"0.1.0-stage64-dev"}

GET http://127.0.0.1:8000/api/v1/ready -> HTTP 200
{"status":"ok","database":"ok","redis":"ok","storage":"ok"}
```

## Checks passed

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

- No production deployment was executed.
- No production data was changed.
- No production services were restarted.
- No production secrets were printed or committed.
- Changes were validated locally only.

## Decision

Stage 64 audit confirms release metadata/version alignment is implemented and locally verified.
