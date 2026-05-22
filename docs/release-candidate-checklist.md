# Release candidate checklist

## Release candidate version

Current release candidate: 0.1.0-stage6.
Expected tag: v0.1.0-stage6.

## Tag readiness

- Confirm develop and main are synchronized.
- Confirm working tree is clean.
- Confirm release versioning diagnostics pass.
- Confirm release readiness diagnostics pass.
- Create annotated tag only after green local gate and green CI.

## CI status readiness

- CI workflow must include release candidate guard.
- CI workflow must include release versioning guard.
- CI workflow must include release readiness guard.
- CI workflow must include CI/local gate guard.
- CI workflow must run backend pytest, smoke scripts, frontend build and bundle encoding guard.

## Post-release verification

- /health returns version 0.1.0-stage6.
- /api/v1/ready returns ready status for database, redis and storage.
- Public home page opens.
- Public catalog opens.
- Public document verification opens.
- Account page opens.
- Admin panel opens.
- Document generation and verification smoke passes.
- Release tag points to the expected main commit.

## Rollback readiness

- Keep previous release tag and commit SHA before deployment.
- Keep database backups and persistent volumes outside disposable container lifecycle.
- Restore previous application revision if post-release verification fails.
- Re-run migrations only according to release notes.

## Required commands

- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_release_versioning.py
- python .\scripts\check_release_candidate.py
- docker compose exec backend pytest app/tests -q
- python .\scripts\smoke_auth_rbac.py
- docker compose exec frontend npm run build
- python .\scripts\check_frontend_bundle_encoding.py
- git tag -a v0.1.0-stage6 -m "Release v0.1.0-stage6"
- git push origin v0.1.0-stage6
