# M2.2.2 — proposed complete transaction and lock-order contract (2026-10-14)

**Status: DESIGN ONLY — not implemented, not a production-ready protocol.** This increment follows the M2.2.1 audit (Draft #193 at 18ae9d278bd2faab31cab38927f929c9f3fcf812), stacked after #192. Compare incremental diff against #193, not main. The objective is to decide all global ordering requirements *before* changing any writer or exporter. This document is not an RBAC grant, history migration approval, or instruction to enable the applicability gate.

## A. One protocol for all cooperating operations

1. Enter an entirely **fresh READ COMMITTED transaction** with no prior advisory or row locks, pending ORM mutations, implicit autoflush, savepoints, or uncommitted file side effects. Keep commit/rollback ownership in the top-level transactional caller. Prevent autoflush during scope discovery; a Python session state check alone cannot prove no earlier SQL locks occurred.
2. Read **only scalar DB projections** for identity and old/new dependency discovery. Gather a *complete union* of all source resources needed by the intended operation (including the actor and any shared mutable permission/rule/catalog/config generations) before acquiring the first lock. Resolve a batch by a non-locking batch/items lookup where necessary. Validate ID canonicality, registry, parent ownership, organization, and old/new membership. Discovery must include first-insert parent keys even when child/obligation/decision rows are absent.
3. Acquire **all** source advisory fences, canonicalized/deduplicated and lexicographically sorted by the identical key/namespace normalization in every reader and writer. Acquire one key per SQL call; ordering the rows of a single SQL statement cannot substitute for lock ordering. Do not mix v1 and a hypothetical v2 namespace without an explicit coordinated cutover: different namespaces DO NOT serialize each other.
4. Re-read the full scalar dependency scope. If scope/old-new membership changed, rollback and retry from a **new transaction**; never add another earlier-ordered source key while later locks are held.
5. Acquire all application decision advisory keys, sorted by exact enrollment + registry namespace; include both registries for source writers where relevant, even for missing decisions or obligations. Never acquire a source key after the first decision key. Decision writer must eventually join this order; current standalone decision-first writer is incompatible.
6. Acquire affected obligation rows **individually in ascending canonical UUID order**, using SELECT ... FOR UPDATE, populating fresh ORM state or scalar data. Multi-obligation IN (...) FOR UPDATE without individually ordered requests is not accepted as a deterministic lock-order guarantee. Missing obligations remain protected by existing enrollment source + decision advisory fences, not by locking a nonexistent row.
7. Lock remaining mutable rows in the **same, predeclared global row-family order** for all paths that intersect. Proposed order is: (a) applicability decision records, by enrollment+registry; (b) batch rows by batch ID; (c) attempts by attempt ID; (d) batch items by immutable item ID (not UI position); (e) document/context/source detail rows by family and ID, with any FK-induced locks explicitly reviewed. Obligations always precede these families. If a legacy path cannot follow this order, migrate it under one reviewed change before sharing a mutation boundary. Specific SQL ordering, implicit FK locks, and the interaction of inserts must be confirmed in real PostgreSQL tests; this ordering is **proposed**, not proven complete.
8. Re-read locked lifecycle rows and child membership, canonical fingerprint, applicable rule/config generation, current RBAC, readiness and approval **inside the same transaction**. A successful scope lock alone is never permission to approve/export. Reject any stale or inconsistent read with rollback. Keep all locks until commit/rollback. For new attempts/batches prepare immutable validated bytes and protect DB+file staging/cleanup; never perform an external government submission as part of a retried DB transaction.
9. On SQLSTATE 40001/40P01 use only a bounded whole-transaction retry with an idempotency key, *before irreversible file/network effects*. Do not retry a policy conflict, missing permission, or needs_review as an implied success. Return stable 403 vs 409 according to cause. Never continue using pre-rollback ORM objects or previously discovered keys.

## B. Source-key namespace and generation protocol

The currently implemented v1 source kinds are **actor, course, enrollment, learner, organization**. Those keys alone are insufficient for shared RBAC and catalog/config changes. Proposed coordinated extension, without changing keys already used by existing dormant code:

| Shared key/class proposal | Who acquires it | Why mandatory |
| --- | --- | --- |
| actor:{user UUID} | Every new approval/export caller and every user activation/organization or per-user grant writer | Single-user account state; not enough for shared role edits |
| shared authorization generation key (reserved canonical UUID) | **Every** registry mutation requiring RBAC AND every role, role-permission, permission, user-role write that could alter registry access | Coarse global first phase is acceptable initially; role edits must not bypass it. Future fine-grained scheme requires separately proved dependency locking |
| course:{UUID}, enrollment:{UUID}, learner:{UUID}, organization:{UUID} | Mutations/exports touching each actual participant, including both old and new IDs on reassignment | Enrollment and organization membership, profile, data fields and absent-child parents |
| Mintrud catalog generation key (reserved UUID) and course key | Registry actions requiring mapping/catalog values, mapping writers, catalog edits/imports | Membership lookup is protected by course; **shared catalog row edits** also need a shared generation |
| rule/config generation key (reserved UUID) | Both registries when using classification/readiness/reporting configuration, and every authorized change to that configuration | Avoid replacing rule values across otherwise current fingerprints |

Any new v1 kinds, reserved UUIDs, and migration of permissions/catalog/settings writers require a **single subsequent approved implementation**; do not independently invent overlapping namespaces. Config stored only in environment variables cannot be protected merely by PostgreSQL advisory locks: deploy-time generation pinning and release barrier, or DB-owned versioned configuration, is required. Capture generation in applicability/snapshot evidence.

## C. Operation-specific requirements

| Operation family | Necessary discovery and ordering | Policy check |
| --- | --- | --- |
| Document create/edit/delete/regenerate | Trusted child resolver; union old+new enrollment/course/learner/organization roots; first insertion fenced by parent; after global obligation phase, lock document and affected context/file metadata in the declared order | Preserve established history; only valid document transitions. File staging/cleanup after validated protected snapshot |
| FRDO/Mintrud context edit/upsert | Unlocked obligation -> enrollment discovery, source+decision keys, obligation lock, then context; first insertion protected by parent | No obligation-first legacy lock before source phase |
| Course/profile/enrollment/completion/catalog mutation | Discover all affected enrollments for **both** registries including pending/absent obligations; old+new parents for reassignments; source fences first | Refresh readiness/approval after locks, not as a separate unprotected follow-up |
| Applicability decision writer | Enrollment and dependent source roots before its existing decision key; obligation then applicability row | Preserve manual/legacy provenance and all historical evidence; no automatic rewriting of submitted records |
| New approve/export/portal artifact/attempt | Actor + authorization/catalog/rule/source generations, all dependencies, decision keys and obligations first | Require current explicit required, fingerprint, permission, readiness, approval when exporting; no reusable grant |
| New Mintrud XML / FRDO XLSX batch | Discover **entire** member set first; source locks for whole union; sorted decisions and one-by-one obligations, then batch/items as ordered above | All-or-nothing validation and file generation; reject entire batch on one invalid member |
| Existing batch submitted/imported/result and attempt results | Read-only discover existing batch/items/attempt -> obligation association; acquire same obligations-before-batches/attempts/items protocol; revalidate association under locks | Authorize *recording historical facts* separately from *starting new transmission*; do not demand today's required just to preserve received results |
| Existing stored file download | Existing RBAC+artifact integrity and historical access policy; if download itself authorizes new transmission, use new-action boundary | Ordinary historic retrieval must not rewrite history or be blocked solely by later applicability change |

### Cross-row issue to resolve before code activation

Batch result paths currently lock batch -> items -> obligations. Standalone result paths lock obligation -> attempt. Proposed global order is obligations -> applicability -> batch -> attempt -> items -> child rows. It is NOT enough to change only the initial SELECT; all direct and indirect callers, ORM autoflush, event listeners, foreign-key row/key-share locks, background jobs, and low-level attachment services must be inventoried and brought into the same protocol or strictly isolated behind proof of no overlapping locks.

A batch's member list is read without a row lock for discovery, then must be re-read after fences and after final row locks. If it differs, abort the **entire** transaction; never mix partial old/new member locks. Result-only paths must retain ability to reconcile records already submitted or accepted, even if their current applicability is needs_review/not_required/absent.

## D. PostgreSQL evidence required for implementation acceptance

1. Instrument actual advisory key order and emitted individual row-lock queries (not just Python sorted input).
2. Use two independent DB sessions, real pg_blocking_pids blocker/waiter pair and pg_stat_activity Lock wait evidence; both operation orders plus writer commit/rollback.
3. Opposite-side races: course/profile/enrollment/catalog/config/decision/document/context/role writer versus approval, individual export and new batches, both registries.
4. Overlapping reverse-order 2+ member batches, including one invalid member, and legacy batch-result versus new attempt/obligation mutation.
5. Missing first obligation, decision, profile, document and context; mid-wait reassignments and changed mapping membership; fresh transaction after 409.
6. Authz revocation/deactivation and shared role change concurrent with export, including organization policy and another-registry permission denial.
7. Real API+PG tests for canonical fingerprint, readiness and approval, permissions and 403/409 response; no hidden mutation on denial.
8. File and DB failure injection: no partial batch/items/artifact publication and safe cleanup; unchanged historical approvals, submissions and result evidence.
9. Preserve original two legacy XFAIL until a proven managed-cohort integration with approved historical classification; no test deletion or broad xfail.
10. Re-run full CI on exact implementation HEAD, with migrations and real PostgreSQL. Pass in an isolated test environment only; no production/real external submission.

## E. Stop/go decisions for next work

- **M2.2.2 documentation acceptance:** reviewers agree complete source/decision/row phase order, actor/shared-role and catalog/config semantics, legacy continuation policy, first-insert coverage and explicit unresolved implicit-FK checks; CI on exact documentation commit passes. This does **not** imply proof of absence of PostgreSQL deadlocks.
- **M2.2.3 / writer integration later:** no live route changes until all lock parties are updated together; add SQL-level PG evidence before any partial activation.
- **M2/M3/production later:** independent verified applicability rules, historical backfill and Stage17B review, co-operative writers, RBAC/readiness and file atomicity are separate gates. Do not turn on global export veto or partial attempt flag here.
- **Allowed in this PR:** one Markdown design document only. No source, tests, migration, existing DB, docker environment, production endpoint, branch merges, or actual registry transmission.

**Proposed M2.2.2 verdict:** DESIGN_PREPARED; accept only after exact-head CI and review of this ordering proposal. 
