# Stage 20 - Final release candidate and production launch checklist

## 1. Baseline - 2026-05-30

Goal: start Stage 20 after completing Stage 19 production security/secrets hardening.

Current accepted baseline:
- Stage 14 documents/certificates/verification is complete;
- Stage 15 admin UX/operator workflow is complete;
- Stage 16 release readiness/regression is complete;
- Stage 17 production deployment readiness is complete;
- Stage 18 production runbook/operator handoff is complete;
- Stage 19 production security/secrets hardening is complete;
- Stage 19 final tag is expected: `v0.1.0-stage19-production-security-secrets-hardening-complete`;
- current git head at Stage 20 baseline creation: `8e205d3`.

Stage 20 purpose:
- prepare final release candidate checklist;
- verify all accepted stage guards before launch;
- define final production launch checklist;
- define final smoke and security confirmation;
- define final release tag procedure;
- document known non-blocking warnings;
- avoid runtime changes until final release candidate acceptance.

Planned Stage 20 scope:
1. Release candidate baseline:
   - accepted stages/tags summary;
   - required docs and guards summary;
   - required final checks before launch.

2. Final launch checklist:
   - clean working tree;
   - synchronized `develop` and `main`;
   - green GitHub Actions;
   - final local guards;
   - backup confirmation;
   - production `.env` private confirmation;
   - service health confirmation;
   - smoke confirmation.

3. Final release candidate acceptance:
   - no runtime changes;
   - no database migrations;
   - no secret exposure;
   - final tag after acceptance.

Out of scope for Stage 20 baseline:
- no database migrations;
- no backend API contract changes;
- no frontend UI feature changes;
- no RBAC changes;
- no destructive bulk actions;
- no real secret rotation inside git;
- no production deployment command execution without explicit confirmation.

Safety notes:
- This baseline creates documentation and a diagnostic guard only.
- Runtime code is not changed.
- Secrets must not be printed.
- `.env` must stay uncommitted.
- `stage20_final_release_candidate_baseline=yes`.

Verification markers:
- `Stage 20 final release candidate launch checklist baseline - 2026-05-30`
- `stage20_final_release_candidate_baseline=yes`
- `stage20_runtime_changed=no`
- `stage20_depends_on_stage14_complete=yes`
- `stage20_depends_on_stage15_complete=yes`
- `stage20_depends_on_stage16_complete=yes`
- `stage20_depends_on_stage17_complete=yes`
- `stage20_depends_on_stage18_complete=yes`
- `stage20_depends_on_stage19_complete=yes`
