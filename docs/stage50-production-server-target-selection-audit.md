# Stage 50 - Production server target selection audit

Status: draft
Branch: stage50-production-server-target-selection-audit
Baseline commit: 5406554
Base develop checkpoint: 639516a
Previous stage: v0.1.0-stage49-production-server-facts-refresh-complete

## Summary

Stage 50 documents production target selection decisions before any real production deployment stage is opened.

## Safety rule

This stage is selection-only. It does not execute a live production deployment and does not store secrets in git.

## Decision matrix

| Area | Decision status | Decision | Follow-up |
| --- | --- | --- | --- |
| Production server target | deferred | Not selected in this stage | Select host/IP before real deployment. |
| Production project path | deferred | Placeholder remains /opt/obrportal | Confirm real server directory. |
| Deployment source | selected | GitHub repository https://github.com/disa-ufa/obrportal | Use release tag or develop only by explicit deployment decision. |
| Deployment branch policy | selected | Use explicit stable tag when possible | Avoid deploying untagged work unless emergency. |
| Current stable candidate | selected | v0.1.0-stage49-production-server-facts-refresh-complete | Replace with Stage 50 tag after acceptance. |
| Domain | deferred | Not selected in this stage | Confirm production domain. |
| DNS target | deferred | Not selected in this stage | Confirm A/AAAA/CNAME target after server selection. |
| Reverse proxy | deferred | Decision required | Select nginx/caddy/traefik/platform proxy. |
| TLS/certificate process | deferred | Decision required | Select Lets Encrypt/platform certificate/manual certificate flow. |
| Production .env handling | selected | Server-local .env only | Never commit production secrets. |
| Backup directory | deferred | Not selected in this stage | Confirm path and permissions on server. |
| Backup retention | deferred | Not selected in this stage | Define retention before deployment. |
| Rollback target | deferred | Not selected in this stage | Select previous known-good tag before real deployment. |
| Live deployment | not applicable | Not executed in Stage 50 | Open a separate explicit deployment stage. |

## Selected decisions

- Deployment source is the GitHub repository.
- Production secrets must remain server-local and outside git.
- Future deployment should prefer an explicit stable tag over an untagged branch head.

## Deferred decisions

- Production host/IP.
- Production project path.
- Production domain and DNS target.
- Reverse proxy choice.
- TLS/certificate process.
- Backup directory and retention policy.
- Rollback target tag.

## Real deployment blockers

- Production host/IP is not selected.
- Production path is not confirmed.
- Production domain/DNS is not confirmed.
- Reverse proxy and TLS are not selected.
- Backup location and retention are not confirmed.
- Rollback target tag is not selected.

## Non-blocking notes

- These blockers do not block Stage 50 because Stage 50 is documentation-only target selection.
- No application code changes are required.
- No live production deployment is executed.
