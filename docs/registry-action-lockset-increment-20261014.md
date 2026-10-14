# M2 increment: opt-in multi-obligation lockset (no activation)

Base: Draft PR #182, commit `695bb3c5e286059398e95afc4e95cfcbb44f1b3e`.

This PR introduces `app.services.registry_action_lockset` as a small, intentionally unconnected transaction primitive. It validates a caller-supplied scope, requires READ COMMITTED and an already-open session transaction, then acquires **sorted advisory source fences**, the same decision advisory keys used by `persist_registry_applicability`, and **individually sorted obligation FOR UPDATE locks** with `populate_existing=True`. All target IDs, enrollment IDs, registries, duplicate pairs, and mandatory enrollment fences are checked **before** locking. On mismatched discovered obligation scope, the caller must roll back and re-resolve, not silently broaden scope under a partial lockset.

It never commits, inserts, approves, exports, or returns submission authorization. No existing service or API calls it. No configuration flag was enabled or existing migration introduced. Thus the legacy decision-first bypass and two XFAIL remain.

## Critical limits before wiring

- The proposed resource keys are **not** yet shared by course, enrollment, learner, organization, document, Mintrud mapping, authorization or rule-configuration writers. Locks do **not** fence their writes until all producers adopt the same protocol.
- A future caller must resolve every source dependency (including absent child rows), acquire source locks before any obligation/decision row locks, then **re-discover the full source scope** and retry if changed. This helper requires enrollment fence coverage but does not prove completeness of other source fences.
- The existing applicability writer acquires a decision advisory key before obligation locks. The helper preserves this relative order; it does not make legacy batch/approval/source paths share the source/decision protocol.
- The current legacy batch builders still acquire their obligation locks by `IN (...) FOR UPDATE` without a proven common order. Invoking this helper after those locks would be unsafe and may deadlock. Existing paths must be refactored together, not partially wrapped.
- Returned rows confer **no eligibility**. Future common service boundary must recheck authenticated actor and current RBAC, required/needs_review/not_required, provenance/version, canonical fingerprint/current inputs, readiness/approval snapshots and history under consistent transaction locks.
- `READ COMMITTED` is required here because an old transaction snapshot can miss a newly inserted decision. Existing stable-snapshot `REPEATABLE READ` helper cannot be combined blindly with it.
- Historical submission recording, existing artifact retrieval and result reconciliation must remain available under separately reviewed authorization semantics. FRDO auto occupational_safety_training remains needs_review.
- No production, local working database, historical rows, current Docker volume or worktree changed. Do not merge any cumulative draft PR out of order.

## Tests

- Pure normalization tests reject missing enrollment fences, invalid registry, duplicate target and noncanonical UUID, and prove sorted keys.
- Existing PostgreSQL integration module adds multi-obligation reverse-input concurrency tests for FRDO and Mintrud. They verify actual lock contention via `pg_blocking_pids`, both transactions complete, and obligation status remains unchanged. Dedicated test fixture uses uniquely named disposable databases only.

## Next M2 increment

Add reviewed source-scope discovery and make **all** source writers and new-action producers participate in one lock order; add reverse-order overlapping-batch tests, first-insert/absent-child races, RBAC revocation and current fingerprint tests. Only after historical reconciliation and copied-production dry-run may a global API gate be activated.
