# M2.2.1 — registry lock-order audit (2026-10-14)

**Scope:** static code review of exact stacked tip `25cf17f47ff195940654a846ee80414d52caf847` (Draft #192). Parent for this **documentation-only** increment is #192; #166 is separate and #167–192 are cumulative. Compare changes against #192, **not main**. No historical DB, runtime production caller, or full local worktree inspected. Static lock order establishes *risks*, not proof that a deadlock occurred.

**Decision:** `M2.2.1_AUDIT_READY_FOR_CI`; no production activation or merge. M2.2.2 must agree a **complete** global protocol before any endpoint adopts part of it.

## 1. Staged (dormant) primitives — exact acquisition order

| Component | Actual stages | Return value, limits |
| --- | --- | --- |
| `services/registry_action_lockset.py` | Normalize canonical UUIDs; deduplicate and **lexicographically sort** `registry-source:v1:{kind}:{uuid}` keys; acquire each with separate `pg_advisory_xact_lock(hashtextextended(key,0))`; then sorted `registry-applicability:{enrollment}:{registry}` keys; then lock each obligation via its own `SELECT ... FOR UPDATE` in ascending obligation UUID, with `populate_existing=True` | `acquire_registry_new_action_lockset` returns locked obligation rows only, **not export authorization**. Requires READ COMMITTED, no preceding late-phase lock. No batch/attempt/actor-role/config protocol; preconditions do not prohibit a previously flushed write |
| `services/registry_action_scope.py` | Unlocked scalar obligation→enrollment→course/learner/organization/linked-document/context discovery and Mintrud course mapping memberships; builds actor+source fences/targets from DB; invokes action lockset; repeats discovery and compares whole scope | Missing child and mapping rows are tracked; mismatch fails. `discover_registry_action_scope` only asserts active transaction, **not** clean/no-autoflush/fresh transaction; SQLAlchemy could autoflush pending ORM changes before the intended first lock. Must fix before live adoption. Does not enforce current RBAC/readiness/applicability itself |
| `services/registry_source_write_scope.py` | From existing course/learner/enrollment roots discover all enrollments and both registries regardless of status; acquire all sorted source keys; re-discover; acquire both decision keys for each enrollment even if obligations absent; lock all obligation rows in ascending ID; re-discover again | Rejects dirty/new/deleted ORM state and nested transaction; requires READ COMMITTED. Not a mutation, does not lock future batch/attempt or catalog/rule/role changes. No caller may prelock rows or flush source writes |
| `services/registry_child_source_scope.py` | Read trusted document/context parent links from scalar DB projections; for reassignment union old+new enrollment roots; call source-write scope (source → decisions → obligations); reread exact child/parent evidence and fail on change | Supports document creation, existing linked document, context lookup and upsert/first insert; verifies proposed course and enrollment separately since #192. Rejects inconsistent obligations. No direct child-row `FOR UPDATE` on returned document/context: subsequent writers must follow full coordinated protocol. Does not approve/submit or commit |

**Phase rule:** all source keys collected **before** taking any source key; all decision keys **before** row locks; obligation rows individually in deterministic order; any changed discovery requires rollback and a *new* transaction. Never add a new earlier-sorted key after acquiring later keys, including when an old/new enrollment link changes. A successful scope result is not proof of commit-time freshness until **every** competing writer participates.

## 2. Live writer and lifecycle entrypoint inventory

File names below relative to `backend/app`.

| Entrypoint / service | Observed order | Incompatibility / scope gap |
| --- | --- | --- |
| `api/v1/admin.py:update_admin_course` + `compliance_registry_approval_invalidation` | For title edits: lock selected **approved** obligation rows first, then edit course/invalidate; other applicable program/mode edits do not have equivalent prelock | Existing rows-first handling cannot simply acquire source fence later; pending/first obligations and both-registry scope are unprotected |
| `api/v1/admin.py:update_admin_document`, regenerate/delete/create | Existing document lookup; for selected fields prelock approved obligation rows, edit document, invalidate, and potentially write/delete file | Old/new enrollment source fences would have to be acquired **before** row lock or file mutation. Approval-only prelock is not a first-insert fence. Standalone documents need separate policy |
| `api/v1/admin.py:update_admin_frdo_obligation_context` and `update_admin_mintrud_obligation_context` | Fetch obligation with `for_update=True` **before** locking/editing existing context or first insert | Order obligation → context is incompatible with future source → decision → obligation protocol if a new fence is appended late |
| `api/v1/account.py:update_account_learner_profile` + `compliance_registry_readiness_propagation` | Prelock selected approved obligations; then update profile/refresh readiness. Readiness refresh joins `RegistryObligation` and `Enrollment` using `FOR UPDATE` **without OF** | Needs all affected learner/enrollments before DB changes; SQL join may lock extra tables and introduce hidden row locks; revise `FOR UPDATE OF` and lock order |
| `services/registry_applicability_writer.py:persist_registry_applicability` | Advisory **decision** key → obligation `FOR UPDATE` → applicability row `FOR UPDATE` → audit event | Protects first decision and historical evidence; **does not take source keys** or serialize independent course/document/profile writers. Appending source keys after decision/row would invert staged protocol |
| `services/compliance_registry_attempts.py:create_registry_submission_attempt` | Obligation `FOR UPDATE` then create attempt; `attach_registry_submission_artifact` locks attempt only; result/submitted/exported helper locks obligation then attempt | Existing attempt paths have no complete source/decision guard and attachment alone has no authority to authorize export. Result recording is distinct from permission to prepare a *new* filing |
| `services/compliance_registry_batches.py:create_mintrud_registry_submission_batch` | Multi-obligation `IN (...) FOR UPDATE` query (without SQL `ORDER BY`) → snapshot/file/item creation; does **not** use standalone attempt helper | Input list ordering is not lock ordering. Batch membership and file side effects need a single guarded boundary |
| `services/frdo_po_batches.py:create_frdo_registry_submission_batch` | Same pattern: `IN (...) FOR UPDATE` without SQL `ORDER BY` → XLSX/item/file | Same risk. A shared per-ID locking protocol should replace unordered batch acquisition |
| Mintrud batch `imported/submitted/result`, FRDO batch `submitted/results` | Existing batch row `FOR UPDATE` → batch items `FOR UPDATE` (often position-ordered) → obligations `FOR UPDATE` (some IN selects) | Separate **batch→items→obligations** order. Must design distinct legacy/result continuation vs new export; cannot assume it safely interleaves with new obligation-first paths |
| Role/permission/courses catalog/config mutations | Request-layer permission check; roles, shared permissions, Mintrud catalog/mapping, report settings do not adopt common fences | Actor fence alone cannot protect revocation of shared role. Rule/catalog/config generations and optional organization scoping must be designed before commit-bound authorization |

**Important precision:** this inventory is based on listed code paths; it is **not** a proof that every SQL/worker/import mutation is covered. Complete the call graph and direct low-level-service call inventory in M2.2.2 / writer integration planning.

## 3. Conflict/risk register

| ID | Priority | Grounded finding | Failure scenario to test (not an observed deadlock) |
| --- | --- | --- | --- |
| L01 | P0 | Legacy context writer locks obligation before any source/decision fence | One transaction holds obligation and later requests earlier source fence, while cooperating action holds source and waits for obligation → potential lock cycle |
| L02 | P0 | Decision writer starts at decision key, then obligation, but no source fence | Race with source change or cycle if an external caller appends source fences after decision lock |
| L03 | P0 | Batch creation locks multiple obligations via one unordered `IN FOR UPDATE` | Two overlapping reverse-request batches may acquire rows differently; lock-wait/deadlock must be tested with real PostgreSQL |
| L04 | P0 | Batch lifecycle batch→item→obligation vs standalone obligation→attempt/other row paths | Competing new-action + result operations need a reviewed global row order and historical continuation semantics |
| L05 | P0 | Scope action discovery lacks explicit no-autoflush and clean precondition | ORM pending write can flush during initial SELECT, preceding intended first advisory lock |
| L06 | P0 | Only approved obligations are prelocked on several edits, and readiness join locks both joined rows | Concurrent first approval/child insert not fenced; implicit extra row locks can break assumed order |
| L07 | P0 | Existing writers do not adopt shared fences; actor and role edits not fenced | Passing dormant PG tests does not establish commit-time freshness/RBAC for live HTTP API |
| L08 | P1 | Future source scope omits catalog value and deployment/rule generation | A course mapping fence alone cannot serialize edits of shared catalog code or changing process-local settings |
| L09 | P1 | Child resolver checks parent before and after staged source locks, but standalone/old+new/absence must remain explicit | Attaching a new enrollment lock after old obligation lock would break global order |
| L10 | P1 | Freshness/approval/artifact/file writes and retries remain separate transactions/side effects | Commit after successful scope read may still act on stale rule or leave orphaned file; needs guarded snapshot and cleanup protocol |

## 4. Proposed M2.2.2 decision checklist (NO implementation in this PR)

1. **Define complete lock classes:** canonical sorted source fences (actor + shared role authorization, course + Mintrud catalog and mapping, learner, enrollment, organization, rule/config generations, absent-child parent keys); sorted decisions per enrollment and registry; ordered row locks including batches/obligations/attempts/items and their existing-history policy.
2. **Declare one global row-lock order for ALL branches**, not merely individual services. Model cycles for batch→item→obligation and obligation→attempt; choose a safe scheme for historical result-only operations and publish SQL-level acquisition order.
3. **Require fresh READ COMMITTED transaction**, no earlier locks, no pending ORM/implicit autoflush; fresh scalar scope before and after fences, with rollback and new-transaction retry on changed dependency/membership.
4. **Enumerate source writers & edge cases:** admin courses, course mappings/catalog, learner/profile/imports, enrollment/completion, document creation/edit/delete/regenerate and files, FRDO/Mintrud context upserts, readiness/rework/approval invalidation, first obligation/decision, admin role/permission edits and configuration generation.
5. **Separate new filing from historical continuation**: prepare/approve/new attempt/new batch vs later submitted/result/download of existing evidence; no blanket requirement that historical result reporting needs today's `required`.
6. **Set test gates:** real PG two-order blocking-PID races for every opposite-side pair, reverse-order overlapping batches, first child/obligation/decision, role revocation, stale identity, rolled-back writer, no partial file/items on failure; real API tests for RBAC/readiness/fingerprint and 403/409; remove legacy XFAIL only when actually fixed for approved cohort.
7. **Define rollout blockers:** independently reviewed normative rules, copied-history dry run, Stage17B classification, operator-approved migration manifest, dormant guard until source writers all cooperate; no merging stacked branches out of order.

## M2.2.1 acceptance gate

- [x] Review 4 staged modules and exact lock methods.
- [x] Identify live routes/services by code and contrast with future ordering.
- [x] Separate proven code order from *hypothesized* deadlock/race scenarios.
- [x] List next protocol decisions, affected writers, and mandatory tests.
- [ ] Confirm CI for this documentation-only commit.
- [ ] Review audit and accept M2.2.1 before starting M2.2.2.

This is a static review only. No app behavior, existing tests, flags, database, artifacts, UI, deployment, protected local Stage17B worktree or branch `main` is changed.
