# M2: absent-child scope comparison (2026-10-14)

**Cumulative Draft after PR #185**, SHA `91f2fb799826b7b25d46d703928d5a4a367d097d`. Target main solely for CI. Review incremental diff against #185; do not merge out of order.

## Issue and minimal increment

The #184 action preflight compared the obligation-to-enrollment association only. An initially absent document or registry context could be inserted while an action waited for parent-source advisory fences and stay invisible to the scope comparison. Similarly, Mintrud course-program membership could be added/removed without the scope equality check noticing.

`registry_action_scope.py` now reads linked document presence by enrollment, FRDO/Mintrud context presence by obligation, and Mintrud course-to-program membership, including an empty set. These read-only values are carried in the immutable preflight snapshot and rechecked after acquiring source and decision fences and refreshed obligation row locks. The preflight refuses changed scope; caller must roll back and retry from a fresh READ COMMITTED transaction. The preflight does NOT automatically create source fences for absent children; the relevant enrollment or course parent fence is already required by the scoped lockset.

Tests include pure comparison changes (document, context, mappings and mismatched registry/course) plus a PostgreSQL two-transaction scenario with a cooperative writer inserting a previously absent registry context while the action is starting. The PostgreSQL scheduling variant allows the reader to start after the writer commits; it verifies completion or the correct conflict, **not a guaranteed forced stale-snapshot interleaving**. A future deterministic blocker/waiter test should use explicit synchronization on the actual preflight gap and verify `pg_blocking_pids`.

## Limits

- No live API, writer, approval, batch, document generation or external registry path was wired or altered. No eligibility or commit-time freshness guarantee is claimed.
- This compares *child existence/membership*, not all mutable document/context values. A context field or catalog schema/active change is not automatically detected. All canonical fingerprint, permissions and readiness must still be checked atomically in the future guarded boundary.
- Existing source writers do not participate in the new advisory protocol. Without coordinated adoption, writes can occur after rediscovery or mid-transaction.
- No migration, production/local existing DB action, historical rewrite, global gate, merge or external submission. Historical approved/submitted/exported facts are unchanged; two legacy XFAIL remain.

Next: deterministic first-insert race tests; versioned scalar source snapshot and writer protocol; batch lock order migration; permission/fingerprint checks inside a server-owned transaction; Stage17B reconciliation before activation.
