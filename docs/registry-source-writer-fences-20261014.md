# M2: shared dormant source-writer fences (2026-10-14)

**Stacked on Draft PR #184** at `611f48aea21cb17359c2646ac275f5c987144c4e`. Target main for CI only; review the incremental diff against #184 and **do not merge out of order**.

## Audit finding

The existing `PATCH /api/v1/admin/courses/{course_id}` invalidates registry approvals when the course title changes, but not when `regulatory_program_type`, `frdo_requirement_mode`, `mintrud_requirement_mode` or `document_type` changes. Document and Mintrud context handlers obtain obligation/related row locks, with independent ordering. Adding the new source advisory fence to just one of those routes may reverse their established lock acquisition order against batch/approval paths and deadlock. No production source route was changed.

## Increment

The dormant `registry_action_lockset` now shares a pure `normalize_registry_source_fences` function across action and source-writer callers. `acquire_registry_source_write_fences` accepts exactly these source keys in sorted global order, requires a caller-owned READ COMMITTED transaction, and takes individually ordered PostgreSQL transaction-scoped advisory locks, **without DB writes or commits**.

The action lockset uses the same key normalizer and advisory acquisition helper. Existing decision keys/obligation row locking are unchanged. No live API calls the writer helper. The resulting primitive is not a deployment-ready freshness guarantee.

New unit tests check identical lock namespaces, sorting/deduplication and invalid inputs. New PostgreSQL concurrency tests, for each registry, create only synthetic test rows and use `pg_blocking_pids` to prove that a participating source writer waits for an action transaction and completes after release. CI on the exact PR head must be checked separately.

## Remaining blockers

- Adoption must be coordinated across course edits, learner/organization edits, enrollments and completion, document first inserts and updates, Mintrud catalog/mapping/context edits, authorization changes and rule/config versions, plus all new approval/export/batch entry points. A single handler integration is not safe.
- Order must remain **source fences -> decision advisory keys -> obligation rows -> other rows**, including old batch lifecycle services and any course/document invalidation path. Currently legacy paths use different orders.
- Existing writers are not protected; there is no complete current RBAC/readiness/fingerprint gate, no validated historical cohort and no cleared decision-first bypass. Two XFAIL must remain. No feature flag or legacy route changes were made.
- No deployment, production or pre-existing local DB change, external submission, merge or migration. Historical approvals and attempts are preserved.

Next: design a coordinated writer/action migration including first-insert fencing and deterministic batch order, then add actual end-to-end PostgreSQL races for source edits, permission revocation and stale fingerprints before enabling any route.
