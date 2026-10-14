# Registry backend applicability: attempt veto and remaining integration work

## Baseline and stack

Audit of repository code, synthetic tests and GitHub CI, not of production data.
Main remains `aa4a36780eed12b898f8f8d30f50dcb3aff24466` (merge #165), CI #2755
succeeded. PR #166 is independent. Every consecutive head from #167 through #180
is an ancestor of the next head; all these PRs are open Drafts targeting main.
The new branch starts exactly at #180 `00d835b0d72582dd736b21c971fa76637b13ab2e`.
Main targeting is for the existing CI branch filter, not permission to merge a
cumulative stack out of order. Review this increment against #180, and reconcile
the effective diff after any earlier PR merges. Do not merge or deploy this work.

| PR | Scope | CI on current head observed during this audit |
| --- | --- | --- |
| #166 | Independent Mintrud mapping UI fix | #2756 success |
| #167 | Applicability vocabulary | #2757 success |
| #168 | Additive schema/history | No run/check on its exact head |
| #169 | Read-only historical inventory | #2758 success |
| #170 | Transactional writer | #2759 success |
| #171 | Disposable PostgreSQL coverage | #2760 success |
| #172 | Read-only preview API | #2762 success |
| #173 | Unconnected full gate helper | #2763 success |
| #174 | Canonical fingerprint | #2764 success |
| #175 | DB inputs | #2769 success |
| #176 | Stable snapshot | #2770 success |
| #177 | Read-only reconciliation plan | #2776 success |
| #178 | Writer protects historical evidence | #2777 success |
| #179 | Legacy-first concurrency | #2778 success |
| #180 | Decision-first legacy bypass characterization | #2779 success, known XFAIL remains |

#168 is exercised cumulatively by later migrations/tests; that is not an
independent green check for its exact head. No PR was retargeted or merged.

## Route and transaction inventory

Paths below are relative to `/api/v1/admin`. `r` means each of `frdo`, `mintrud`.
All referenced services live in `backend/app/services`, handlers in
`backend/app/api/v1/admin.py`. Permission names remain registry-specific.

| Entry point | Existing protection / writes | Applicability gap after this increment |
| --- | --- | --- |
| `POST /r/obligations/{id}/approve` | `r.approve`; locks obligation, readiness, approval snapshot, audit, commit | No persisted-decision or canonical-input gate |
| `POST /r/obligations/{id}/export` | `r.export`; locks obligation; current approval; common `prepare_admin_registry_export_attempt`; attempt, artifact, audit, commit with rollback/cleanup | New **disabled** attempt veto only; no full freshness authorization |
| `POST /r/obligations/{id}/portal-artifact` | `r.export`; obligation lock, approval check, serializer/validator, common attempt creation, artifact; `mark_registry_exported` repeats lifecycle/approval/integrity checks | Same partial veto before attempt insertion/file attachment; disabled by default |
| `POST /mintrud/batches`, `POST /frdo/batches` | `r.export`; lock obligation set, validate approvals, freeze item snapshots; persist batch/items and file | Do NOT call `create_registry_submission_attempt`; entirely outside this veto |
| `POST /mintrud/batches/{id}/imported` | Locks batch, items, obligations; checks current approval and frozen item match; changes obligations to exported | No applicability check |
| `POST /mintrud/batches/{id}/submitted` | Requires imported batch/exported obligations and frozen item match; stores submission evidence | No fresh applicability check; historical transition policy needed |
| `POST /frdo/batches/{id}/submitted` | Batch/items, obligations ordered by ID; all approvals/frozen items validated before changes | No applicability check |
| `POST /r/obligations/{id}/attempts/{attempt_id}/submitted` | Obligation then attempt locks, artifact checksum and exported lifecycle | No applicability check; recording an external fact needs its own historical policy |
| Attempt `/result`, Mintrud batch `/result`, FRDO batch `/results` | Existing lifecycle/result validation and locks; record accepted/rejected/correction evidence | Preserve already-submitted evidence; do not blindly attach a new-export gate here |
| `GET /r/obligations/{id}/attempts/{attempt_id}/download`, `GET /r/batches/{id}/download` | `r.export`, association/registry checks, file integrity; retrieve existing bytes | No current applicability/fingerprint check; historical retrieval versus new transmission must be separated explicitly |
| `/validate`, `/context`, `/reopen`; course/profile/document/mapping edits | Existing readiness/context/invalidation/rework logic | Must participate in a future shared source-version protocol; veto does not classify or refresh decisions |

`create_registry_submission_attempt` itself has never been an authorization
service: it does not perform RBAC/readiness/approval validation. Its callers do.
The new veto does not make direct low-level calls safe for external submission.

## What this increment does

`REGISTRY_ATTEMPT_APPLICABILITY_VETO_ENABLED` defaults to **false** in server
settings. It is not a request field and is not enabled in environment templates,
Compose, CI environment, deployment configuration or a migration. Tests enable it
temporarily in process. Enabling it on a working environment still requires
historical reconciliation and separate authorization.

When explicitly enabled, existing attempt creation acquires its existing
obligation row lock, verifies READ COMMITTED, reads the stored decision for the
same enrollment AND registry, and rejects `not_required` or `needs_review` before
inserting any attempt. The existing exception type flows into API HTTP 409 and
transaction rollback. Invalid stored values also reject; DB errors propagate.
No approval, existing attempt, batch, artifact or decision/event is rewritten.

`required` and a missing decision retain legacy behavior. This is intentionally
only an additional veto, **not** the fail-closed gate from #173 and not production
readiness. It does not validate source, rule version, fingerprint, effective date
or manual provenance. A stale `required` decision remains unsafe; a stale negative
decision can still veto and needs reviewed correction. Existing XFAIL tests stay
unchanged and still fail as expected with the default configuration.

## Concurrency findings and tested boundaries

1. Writer #178 takes enrollment/registry advisory lock, then the matching
   obligation row, then the applicability row; it protects historical fields,
   ANY attempt and ANY batch membership. Despite its old comment, it does not
   lock the parent enrollment. Do not add its advisory lock after the attempt's
   obligation lock: that would introduce an inverse-order deadlock.
2. On this existing-obligation path the common obligation lock serializes writer
   and attempt. Decision-first commit is rejected by the enabled veto, including
   a first decision insert and a previously cached `required` revised to a veto.
   Decision rollback permits legacy attempt creation. Attempt-first commit makes
   the writer reject reclassification and preserves the attempt; attempt rollback
   permits the decision. Tests cover both registries and both negative decisions.
3. These new tests wait for `pg_blocking_pids` to identify the exact blocker and
   waiter, with bounded timeouts and task cleanup. Timing alone is not evidence
   of contention. Decision/event counts and attempt snapshots are checked after
   commit/rollback; unexpected SQL failures are ordinary failures.
4. A repeatable snapshot can miss a newly inserted decision even after waiting:
   writer locks but does not UPDATE the obligation. Therefore the enabled veto
   rejects REPEATABLE READ and SERIALIZABLE rather than treating either as a
   freshness guarantee. PostgreSQL tests establish a snapshot before the other
   connection commits and prove this rejection. A scalar decision SELECT avoids
   stale SQLAlchemy identity-map values under READ COMMITTED.
5. This proves only the writer/attempt pair. Batch/approval decision-first races
   remain open. The batch creation loaders in both registries use `IN (...) FOR
   UPDATE` without SQL `ORDER BY`; normalized input ordering does not impose row
   acquisition order. Batch lifecycle uses batch -> items -> obligations; FRDO
   submission orders obligation IDs, Mintrud reuses its unordered loader. A shared
   multi-obligation ordering and deadlock/serialization retry contract is needed.
6. Canonical input reading consists of multiple unlocked source reads. A stable
   snapshot is not commit-time validity. `update_admin_course` prelocks/invalidates
   approvals for **title** changes, not changes to requirement modes or program
   classification. Most approval snapshots do not include requirement modes.
   Thus even approval-fingerprint equality cannot substitute for applicability
   freshness. Source edits, first approval (prelocks select only already-approved
   rows), absent context/mapping inserts and rule/config changes need adversarial
   tests under one reviewed lock/version protocol. Do not add source locks in
   arbitrary order: existing invalidation queries can also lock joined rows.
7. Review cached ORM state in the generic writer's obligation read separately:
   its `FOR UPDATE` has no `populate_existing`, so a caller that already loaded
   old approval fields may retain them. Existing tests use fresh writer sessions;
   they do not prove that reuse safe. The scalar decision read fixes that issue
   only for the new veto, not every pre-existing ORM load.
8. Completion creates missing obligations without this advisory protocol; writer
   can also run before an obligation exists. An enrollment-scoped protocol is
   needed before exposing new classification writes through API/completion.

## Historical treatment and next reviewed increment

Keep existing approval/submission/status/snapshot/file evidence. The reconciliation
CLI remains read-only; its protected bucket includes approval/invalidation fields,
timestamps, external reference, all attempts and batch membership even when current
status is `pending_data`. Candidate required/exclusion buckets are review proposals,
not a backfill manifest. Do not reinterpret record existence as a legal obligation.
The generic writer is not the historical reconciliation writer.

For `occupational_safety_training`, FRDO `auto` remains `needs_review`. This work
does not confirm legal rules, clear manual review, infer FRDO exclusion from Mintrud,
or alter either worklist. The unfinished Stage17B reconciliation still matters.

Before expanding enforcement: validate an authorized historical-data copy; agree
classification/rule-version provenance and per-record reconciliation; review common
source/obligation/batch lock order and stale-cache handling; then test approval and
batch creation in BOTH orders, including overlapping batches, source edits and
partial rollback/file cleanup. Define historical download/result semantics and
separate RBAC-protected decision writes. Only after review should the full
canonical fingerprint gate cover every new approval/export entry point.

No production connection, working-local DB migration, merge, deploy, external
submission or activation was performed. The two protected `C:\root` worktrees were
not used. Local PG tests use a new disposable container with tmpfs data and unique
test databases, populated only with synthetic fixtures; no production-history copy
was inspected. A green CI does not remove these rollout prerequisites.

## Validation of this increment

- Local targeted unit/API/contract checks: **46 passed** (one dependency warning).
- Local disposable PostgreSQL module: **48 passed, 2 XFAIL**. The two unchanged
  #180 markers still demonstrate the default legacy bypass. New scenarios cover
  history preservation, registry isolation, actual competing transactions,
  rollback and cached/stable snapshots. Migrations ran only inside the unique
  disposable test databases created by the existing test fixture.
- Ruff on changed Python files, secret scan, encoding/BOM guards and diff whitespace
  check passed. Full backend/frontend CI is required on the published head.
- Baseline #180 CI #2779: dedicated PG **12 passed, 2 XFAIL**; general backend
  **1199 passed, 16 skipped**. These counts are baseline evidence, not the new PR.
