# Release publication checklist

## Release tag

Release version: 0.1.0-stage6.
Final tag: v0.1.0-stage6.

## Final publication order

- Confirm develop and main are synchronized.
- Confirm working tree is clean.
- Confirm release candidate diagnostics pass.
- Confirm release versioning diagnostics pass.
- Confirm release readiness diagnostics pass.
- Confirm full local gate is green.
- Confirm CI is green on the final main commit.
- Create annotated release tag.
- Push release tag to origin.

## Release notes

- Use CHANGELOG.md as the source of release notes.
- Use docs/release-handoff.md as the deployment handoff source.
- Use docs/release-candidate-checklist.md as the RC readiness source.
- Record final tag and final commit SHA before production publication.

## Post-release smoke

- /health returns version 0.1.0-stage6.
- /api/v1/ready returns ready status for database, redis and storage.
- Public home page opens.
- Public catalog opens.
- Public document verification opens.
- Account page opens.
- Admin panel opens.
- Admin documents registry opens.
- Document generation and verification smoke passes.

## Rollback checkpoint

- Keep previous release tag and commit SHA before deployment.
- Keep database backups and persistent volumes outside disposable container lifecycle.
- Restore previous application revision if post-release smoke fails.
- Re-run migrations only according to release notes.

## Required commands

- python .\scripts\check_ci_local_gate.py
- python .\scripts\check_release_readiness.py
- python .\scripts\check_release_versioning.py
- python .\scripts\check_release_candidate.py
- python .\scripts\check_release_tag.py
- docker compose exec backend pytest app/tests -q
- python .\scripts\smoke_auth_rbac.py
- python .\scripts\smoke_document_generation_flow.py
- python .\scripts\smoke_documents_page.py
- docker compose exec frontend npm run build
- python .\scripts\check_frontend_bundle_encoding.py
- git tag -a v0.1.0-stage6 -m "Release v0.1.0-stage6"
- git push origin v0.1.0-stage6
