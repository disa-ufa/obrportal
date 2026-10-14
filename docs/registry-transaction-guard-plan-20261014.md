# Registry transaction guard: safe increment and blocked activation

This is a repository audit and implementation proposal, not a rollout approval.
The original decision-first legacy bypass remains reproducible and XFAIL. No
global fail-closed gate is enabled by this increment.

## Verified baseline

- Main: `aa4a36780eed12b898f8f8d30f50dcb3aff24466`.
- Draft [#180](https://github.com/disa-ufa/obrportal/pull/180):
  `00d835b0d72582dd736b21c971fa76637b13ab2e`;
  [CI #2779](https://github.com/disa-ufa/obrportal/actions/runs/38442278814)
  completed successfully on that head.
- A subsequent Draft [#181](https://github.com/disa-ufa/obrportal/pull/181)
  already exists: `dfb41d1304ba88b0301aab8407210817e06e367f`;
  [CI #2780](https://github.com/disa-ufa/obrportal/actions/runs/38444700885)
  completed successfully on that head. It adds a disabled, negative-decision
  attempt veto, not a complete gate. Its default remains false.
- This increment starts at #181. #167–181 are a cumulative unmerged stack;
  review the incremental diff against #181. Main is the PR target only because
  the existing CI pull-request filter accepts main/develop. Do not merge the
  cumulative stack out of order. #166 is independent.

## What is fixed here

`FOR UPDATE` does not itself refresh SQLAlchemy objects already in an identity
map. A transaction can wait for another transaction's lock, then still inspect
its own previously loaded `pending_data` or `required` object.

Three SELECTs now use `populate_existing=True`: the writer's obligation and
decision reads, and the dormant export guard's decision read. Normal autoflush
behavior is retained. Neither function commits or changes transaction isolation.
The writer's misleading enrollment-lock comment is corrected: it locks the
matching obligation, not the parent enrollment.

Confirmed failures before this fix:

1. With a cached pending obligation, the writer did not raise its historical
   conflict after a competing approval/export status committed. New tests fail
   with `DID NOT RAISE`, after observing the actual blocker/waiter PIDs.
2. With a cached automatic decision, the writer tried to overwrite a newer
   manual revision and hit the event-version uniqueness constraint instead of
   the intended provenance conflict. The database constraint prevented commit;
   this was not evidence of a committed manual-decision overwrite.
3. The dormant gate granted on cached fingerprint A even after the competing
   decision committed fingerprint B. The new test fails with `DID NOT RAISE`.

This fix protects checks against stale ORM identities under READ COMMITTED. It
does not solve unlocked source writes, first inserts without an obligation,
older isolation snapshots, dirty caller objects used with autoflush disabled,
or direct SQL bypass of service policy. The gate still requires its caller to
lock the obligation first. It remains unwired to live mutation services.

## Actual backend entry points and cutover coverage

All route paths below are relative to `/api/v1/admin`; `r` is `frdo` or `mintrud`.
Handlers are in `backend/app/api/v1/admin.py`. Service filenames below are in
`backend/app/services`. RBAC already uses registry-specific permissions; it is
not a substitute for applicability and readiness.

| Entry point | Current implementation | Required future treatment |
| --- | --- | --- |
| `POST /r/obligations/{id}/approve` | `approve_admin_frdo_obligation`, `approve_admin_mintrud_obligation`: obligation lock, readiness, approval capture | Common transaction guard before approval; `r.approve` |
| `POST /r/obligations/{id}/export` | `prepare_admin_registry_export_attempt` -> `create_registry_submission_attempt` -> attachment | Guard before serialization, attempt insertion and file creation; `r.export` |
| `POST /r/obligations/{id}/portal-artifact` | Registry formatter/validator -> common attempt -> attachment -> `mark_registry_exported` | Same guard and commit-bound checks for the exact artifact source; `r.export` |
| `POST /mintrud/batches` | `compliance_registry_batches.create_mintrud_registry_submission_batch` | Guard the entire obligation set before any XML batch/item/file creation |
| `POST /frdo/batches` | `frdo_po_batches.create_frdo_registry_submission_batch` | Guard the entire obligation set before any XLSX batch/item/file creation |
| `POST /mintrud/batches/{id}/imported` | Batch/items/obligations, current approval and frozen snapshots, changes to exported | Explicit new-export/finalization policy; same guard for managed records |
| `POST /r/batches/{id}/submitted` | Separate FRDO and Mintrud lifecycle services | Distinguish authorization to transmit from recording a past external fact; approved legacy continuation policy required |
| `POST /r/obligations/{id}/attempts/{attempt_id}/submitted` | `mark_registry_submission`: obligation then attempt lock, artifact integrity | Same distinction; never erase a real historical submission because classification changed |
| Attempt `/result`, Mintrud batch `/result`, FRDO batch `/results` | Lifecycle result recording | Preserve evidence; authorize reconciliation without requiring current applicability `required` |
| Attempt/batch `GET .../download` | RBAC, registry/association, integrity of existing bytes | Historical retrieval stays available under existing permission; new transmission/download semantics need separate explicit action |
| `attach_registry_submission_artifact`, `mark_registry_exported` called directly | Low-level services, no caller identity authorization | Include in guarded service boundary; a previous check or user-supplied grant cannot authorize a later transaction |
| Context/validate/reopen, completion and source edits | Existing readiness and invalidation, partially overlapping locks | Participate in source serialization; no silent reclassification or status reset |

Both batch creation services are independent of `create_registry_submission_attempt`.
The #181 attempt flag therefore cannot protect batches or approval. Both batch
creation loaders currently use `IN (...) FOR UPDATE` without SQL `ORDER BY`.
Sorting the input list does not order PostgreSQL row-lock acquisition. Batch
lifecycle currently locks batch -> items -> obligations; the standalone attempt
attachment service locks only the attempt. All must be reviewed together.

## Proposed common transaction protocol (not activated)

Implement one service boundary, provisionally
`registry_mutation_transaction(actor_id, action, obligation_ids)`, used by every
new approval/export producer. It owns a fresh transaction and all checks through
commit; never return a reusable authorization token to a later request. Lower
level mutation functions become internal to that boundary, with direct-call
tests proving they cannot bypass it. This API name is a proposal, not present code.

1. **Resolve scope without mutation.** Normalize and deduplicate IDs; resolve the
   enrollment, registry, course, learner, organization, batch and applicable
   catalog/rule dependencies. Reject registry mismatches. Do not use request
   fingerprints, cached DTOs, or a stored legacy status as authority.
2. **Acquire source fences before row locks.** Every source writer and every
   new-action transaction must acquire the same transaction-scoped resource
   locks in a globally sorted key order. Candidate keys include course (also
   mapping membership), enrollment (also absent document/context/obligation),
   learner (also absent profile), organization, catalog/rule generation and
   actor authorization scope. A parent resource key covers first inserts and
   deletes; locking an absent child row does not. Re-read the discovered scope
   after acquiring fences. If it changed, roll back and retry the whole
   transaction with the new scope; do not acquire additional earlier-order
   locks while holding later ones.
3. **Use one row-lock order.** After source fences, acquire enrollment/registry
   decision advisory keys in sorted order; existing batch rows by ID; obligation
   rows by ID; applicability rows by enrollment/registry; attempts/items by ID.
   New rows are inserted after validation. Refresh ORM state on every policy
   read. Specify `FOR UPDATE OF` where joins would otherwise lock unrelated
   tables. Never acquire the writer advisory key after an obligation lock.
   Existing batch/attachment/source paths must be refactored to this order as a
   coordinated change; adding one isolated source lock can introduce deadlocks.
4. **Revalidate RBAC under the same transaction.** Resolve the authenticated
   actor and current `r.approve`/`r.export` permission inside the boundary, along
   with any existing scope restrictions. Role/permission revocation must share
   the actor/role authorization fence, or a reviewed authorization-version
   protocol. Current request dependency checks alone do not prove commit-time
   authorization. Test another-registry permission, revocation and inactive user.
5. **Read fresh canonical inputs with fences held.** Use READ COMMITTED plus the
   source protocol and populate fresh identities or use scalar projections.
   Include canonical input schema, rule version, program type, requirement mode,
   effective date, document type, scenario, organization and Mintrud mapping.
   Readiness/approval data also includes learner identity, profile, reporting
   configuration and actual document/context fields. Rule/config generation
   must be pinned across deployments or stored/versioned; process-local settings
   changing independently cannot be protected by an obligation lock.
6. **Check applicability, readiness and approval together.** Require explicit
   `required`, valid provenance, fresh canonical fingerprint, and permission.
   Then evaluate readiness and current approval/frozen batch snapshot for the
   action. `required` alone grants nothing. Approval captures the newly verified
   snapshot; export validates it. Recheck the guarded inputs before mutation/
   flush and keep all fences until commit. An unlocked second fingerprint read
   is insufficient: a writer can commit between that read and our commit.
7. **All-or-nothing side effects.** Validate every batch member before inserting
   any items or publishing any file. Build bytes from the validated immutable
   snapshot. Store file hashes and audit decision/version/fingerprint, actor,
   action and source generation with the mutation. On any check/commit failure,
   roll back DB writes and remove only files created by this operation. A future
   outbox/staging design must address crash-orphaned files and external I/O;
   never make an external submission inside a retried DB transaction.
8. **Bounded retries.** Retry the entire side-effect-free transaction on reviewed
   `40001`/`40P01` conflicts with a small bounded backoff and idempotency key.
   Do not retry a permission/applicability/readiness conflict as success. Return
   403 for permission denial and stable 409 reasons for policy/freshness conflicts.

The existing `load_consistent_registry_applicability_inputs` helper requires
REPEATABLE READ/SERIALIZABLE. It is a stable visibility tool, not this mutation
protocol. Combining it with the READ COMMITTED-only attempt veto is invalid.
Older snapshots may miss a first decision inserted while waiting on an obligation
that was locked but not updated. This increment does not change isolation or
claim to fix that gap in the dormant full gate/writer.

Source writers to include before activation: course program/mode/document/title
edits; course Mintrud mappings and catalog edits; learner profile/user and
organization edits; enrollment/completion changes; document issuance/replacement;
FRDO/Mintrud contexts and scenario; readiness refresh; rework; decision writers;
authorization changes; rule/config changes. In particular, `update_admin_course`
currently prelocks/invalidates approvals for title changes, not program/mode
changes. Existing invalidation often selects only already-approved obligations,
so it does not protect a competing first approval or future child insertion.

## Historical migration and activation blockers

No approved historical transfer manifest or executed copied-history dry run was
found in this stack. The read-only reconciliation report is not such approval.
Do not enable either a global gate or the #181 partial flag on this evidence.

The required reviewed manifest must identify each enrollment/registry and its
decision/provenance/fingerprint/rule generation, and separately declare whether
existing approval/artifact may continue its lifecycle. Include existing status,
approval/invalidation fields, all attempts, batch membership and artifact hashes
in before/after evidence. Distinguish:

- verified records eligible for **new** operations;
- historical approved/exported/submitted records whose authorized continuation
  must be preserved;
- unresolved decisions requiring operator/legal review.

No blanket exemption based on record age, row existence, status or missing
classification is a safe new-export policy. No blanket denial is an acceptable
historical migration. A server-owned per-record rollout cohort requires reviewed
membership, completeness checks, append-only audit, stop/rollback rules and a
separate reconciliation writer. Unknown records keep their existing behavior
until that approved cutover; this limitation remains visible as XFAIL.
Never delete/rewrite past approvals, submissions, attempts or batch membership.

`occupational_safety_training` for FRDO in auto mode remains `needs_review` until
legal review. This increment does not infer exclusion from Mintrud applicability
or change this classification. Uncommitted Stage17B work was not inspected or used.

## Verification and next increment

- 42 new PostgreSQL cases cover both registries, retained stale identities,
  actual blocker/waiter PIDs, commit/rollback, approved/exported/submitted status,
  approval fields on a pending row, attempts, batch membership, manual provenance,
  idempotence/versioning, changed negative decisions and changed fingerprints.
- Full dedicated PostgreSQL suite after fixture correction: 90 passed, 2 XFAIL.
  The original #180 markers are unchanged. No unexpected SQL exception is hidden
  as an expected failure.
- Targeted unit/HTTP/contract suite: 52 passed. New ASGI HTTP tests exercise real
  route dependencies and 409/rollback from the actual staged veto. DB/approval
  lookups are test doubles in HTTP tests; real DB concurrency is tested separately.
  Cross-registry permission is denied with 403 on all 17 mutation routes above,
  before DB writes. This is not a full live API/PG readiness test.
- Local PG uses a unique disposable container with tmpfs data and a random local
  port; the fixture creates/drops only unique synthetic databases there. No
  existing database, production connection, Docker volume, protected worktree,
  merge, deploy or external submission is used.

Next reviewable increment: agree the source and authorization fence protocol,
then implement it with the common boundary still disabled. Add two-order races
for every approval/export/batch producer versus decision and each source writer;
overlapping batches in reverse input order; missing context/document/mapping
inserts; permission revocation; stale identity and stale transaction snapshots;
batch member failure with no partial file/item writes; and historical retrieval/
submission/result preservation. Use real API + PostgreSQL tests for readiness,
RBAC and rollback before any activation. Turn the original XFAIL into a passing
assertion only for a reviewed managed cohort after historical transfer approval;
retain a distinct legacy-compatibility test until its cutover is authorized.
