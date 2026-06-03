# Stage 50 - Production server target selection acceptance

Status: accepted
Branch: stage50-production-server-target-selection-audit
Baseline commit: 5406554
Audit commit: 34fbea6
Base develop checkpoint: 639516a
Previous stage: v0.1.0-stage49-production-server-facts-refresh-complete

## Goal

Stage 50 documents production target selection decisions before any real production deployment stage is opened.

## Accepted results

- Production server target selection baseline was documented.
- Production server target selection audit was documented.
- Deployment source was selected as the GitHub repository.
- Deployment policy prefers an explicit stable tag when possible.
- Production secrets must remain server-local and outside git.
- Deferred production decisions were explicitly listed.
- No live production deployment was executed.
- No application code changes were made.
- No secrets were committed.

## Verified checks

- Secret scan passed.
- Text encoding guard passed.
- Source BOM guard passed.
- Production server facts guard passed.
- Production domain DNS verification guard passed.
- Production domain reverse proxy decision guard passed.
- Production backup verification guard passed.
- Docker Compose stack remained running during the audit.

## Selected decisions

- Deployment source: https://github.com/disa-ufa/obrportal.
- Deployment branch/tag policy: prefer explicit stable tag.
- Production .env handling: server-local .env only.

## Deferred decisions

- Production server host/IP.
- Production project path.
- Production domain and DNS target.
- Reverse proxy choice.
- TLS/certificate process.
- Backup directory and retention policy.
- Rollback target tag.

## Decision

Stage 50 is accepted as target-selection preparation.

## Next possible cycle

```text
Stage 51 - Production deployment target facts completion or next product feature cycle
```

## Notes

- A real deployment remains blocked until host, path, domain, reverse proxy, TLS, backup and rollback decisions are completed.
- Future production secrets must stay server-local and must not be committed to git.
