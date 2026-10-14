# M2: dormant database-derived registry action scope preflight (2026-10-14)

Predecessor: Draft #183, commit `f64f36eddbc05dd2c1afea8afb99041914db28c2`. This is a **cumulative Draft PR**, targeting main solely for existing CI. Review incremental changes against #183. Do not merge out of stack order.

## Increment

`backend/app/services/registry_action_scope.py` stages a new, unused preflight:

1. Read the authoritative `registry_obligations` -> `enrollments` association by exact obligation IDs, without row locks.
2. Reject missing, duplicate or cross-registry targets and noncanonical UUIDs.
3. Derive actor, course, enrollment, learner and optional organization advisory source keys from **database values**, not client-supplied IDs.
4. Acquire the existing #183 sorted source -> writer decision -> obligation lockset, requiring READ COMMITTED and a caller-owned transaction.
5. Rediscover the same source association while locks are held; reject any changed scope, requiring rollback and a fresh whole-transaction retry.

This is only a **preflight and consistency comparison**. The consumer must NOT treat successful return as eligibility or permission. It does not commit, write, authorize, calculate a fingerprint, create exports or call a government system. No production/API caller is connected. No migration or feature flag was enabled. Existing history is unchanged.

## Known limits / activation blockers

- Critical: existing source writers **do not yet participate** in these advisory fences. They can change source values after rediscovery; no claim of commit-time freshness is made.
- The scope only includes the currently discoverable obligation, enrollment, course, user and organization IDs. Document rows, contextual records, Mintrud mappings/catalog, regulation generations, role/permission changes and absent-child insertions require a separately reviewed full fence protocol.
- This is not a server-owned transaction boundary and does not validate current RBAC, current canonical SHA-256, `required` decision, readiness, approval or history. It cannot be wired directly to live API routes.
- The prior lockset still expects to run before any conflicting row/advisory locks. Do not call it after legacy approval/batch locks. Legacy overlapping batch lock ordering is not fixed.
- Missing/reclassified legacy rows, historical snapshots, approval/export/submission continuation and two known XFAIL are unchanged. No global veto may be activated without the Stage17B reconciliation, approved migration manifest and copied-production restore/dry-run.

## Tests and next action

Pure unit tests assert DB-scope-derived fences, stable key order and fail-closed invalid targets. CI is the authoritative check for this branch; do not state tests passed before its exact-head workflow succeeds.

Next: coordinate source writers and action producers on the same lock ordering, then add real two-order PostgreSQL source-edit/first-insert races, RBAC revocation and current fingerprint checks in the unified service transaction, before production cutover review.
