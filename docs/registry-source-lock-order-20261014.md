# M2: dormant source-writer dependency closure and lock order

Stacked on Draft #188, exact parent `7e23288803e38615e743f1b78d8738ddceb9cb38`.
Verified main: `aa4a36780eed12b898f8f8d30f50dcb3aff24466`; open Drafts #166–188.
#188 CI #2787 / run 38548673989 passed: 104 PG passed, 2 XFAIL;
backend 1249 passed, 108 skipped. #166 is independent; #167–188 are cumulative.
Target main ONLY for CI. Review this increment against #188, not the cumulative
main diff. No merge or out-of-order integration is authorized.

## Concrete dependencies and existing conflicts

Paths below are relative to `backend/app`. This is an audit, not a production
activation plan. Existing routes and flags are unchanged.

| Source writer | Current behavior / permission | Required cooperating scope |
| --- | --- | --- |
| `api/v1/admin.py:update_admin_course` | `catalog.write`; prelocks approved obligations only for title changes, then flushes course and invalidates approvals | Course root, every enrollment and BOTH registries regardless of status; title/hours/document type/program/modes affect readiness, snapshots or applicability |
| `update_admin_document`, creation, deletion, regeneration | `admin.users.write`; linked document approval prelocks cover approved FRDO only; file and document changes have their own lifecycle | Trusted enrollment root before any row lock/file write; absent document covered by parent; standalone documents, cross-enrollment links and reassignment require a separate resolver and old/new scope union |
| `api/v1/account.py:update_account_learner_profile` | Authenticated current user; approved-obligation prelock, profile flush, invalidation, readiness refresh | Learner root covers all enrollments, including pending first approvals and absent profile; admin/import writers and `User` identity edits must join too |
| `update_admin_mintrud_obligation_context` | `mintrud.write`; obligation `FOR UPDATE` first, then context `FOR UPDATE`, editable pending/ready/needs_approval states | Resolve obligation to enrollment, acquire full source protocol first, then freshly load context; parent fence protects first context insert |
| FRDO context, enrollment completion/reassignment, course Mintrud mapping | Separate writers and existing invalidation/readiness paths | Enrollment/course/learner/organization fences; all old AND new parent keys for membership changes, including insertions/deletions |

`services/compliance_registry_approval_invalidation.py` prelock functions filter
`approved`; they cannot fence a pending first approval or an absent obligation.
`refresh_registry_readiness_for_user` joins enrollment and obligation with
`FOR UPDATE` without `OF`, so it can lock both tables. Mintrud and FRDO batch
creation select obligations using `IN (...) FOR UPDATE`; lifecycle code takes
batch -> items -> obligations. These paths cannot safely receive an extra
source fence after their existing locks.

RBAC today: `auth.get_current_user` checks existence/`is_active`;
`rbac.get_user_permission_codes` joins Permission -> RolePermission -> UserRole;
`require_permission` checks the requested registry-specific code at request
entry. That query does not serialize concurrent role/permission revocation, and
does not filter `UserRole.organization_id`. No new scope restriction is inferred
here. A future boundary needs a coordinated actor AND role/permission mutation
protocol, current user refresh, and explicit organization policy. An actor key
alone does not fence a shared role edit. Do not acquire actor keys after source
keys in this helper; the future boundary must plan their union up front.

Readiness today is separate from applicability. `evaluate_registry_readiness`
reads completion, course, learner/profile, document, organization, registry
context and Mintrud mappings/reporting configuration. The propagation service
refreshes only pending/ready/needs_approval; it does not turn historical records
into new eligible records. Approval snapshots and export validation remain
separate checks. #188's canonical fingerprint is not a readiness or RBAC proof.
Catalog item values, rules/XSD/classifier versions and process-local reporting
settings also need pinned generations; a course membership fence alone does not
protect a catalog edit or a deployment/configuration change.

## Implemented autonomous portion

`services/registry_source_write_scope.py` accepts only existing course, learner
or enrollment roots. It uses scalar DB projections to discover enrollment
course/user/organization dependencies and all obligations in both registries.
No status filter, caller-supplied obligation list or cached ORM relationship can
silently narrow that set. A course/learner without enrollments is valid; an
enrollment without obligations still gets both decision keys.

The exact implemented order, shared with the dormant new-action primitive:

1. All `registry-source:v1:{kind}:{uuid}` keys in lexical order (individual
   transaction advisory locks); deduplicated course/enrollment/learner/organization
   keys, including roots that currently have no children.
2. Re-discover scope. On any membership/assignment change, raise
   `registry.writer_scope_changed_during_lock`; caller MUST roll back and start
   a new transaction, never append an earlier-order key.
3. Both `registry-applicability:{enrollment}:frdo|mintrud` keys per enrollment
   in lexical order, compatible with the existing decision writer, even when
   no obligation exists yet.
4. Obligation rows individually by ascending ID, refreshed through the SAME
   row-lock helper used by the dormant action lockset. Verify registry/enrollment.
5. Re-discover again to catch membership changes committed while waiting on a
   legacy decision/row lock. Caller may only read fresh source values and start
   its later source-row phase after successful return.

No source values, decisions, approvals, readiness, attempts or history are
written. No transaction is committed. Dirty/new/deleted ORM objects, nested
transactions, missing/invalid roots and non-READ-COMMITTED isolation are rejected.
The caller must still supply a fresh transaction with no prior locks or flushed
writes; inspecting session state cannot prove that arbitrary SQL was not run.

The return value is a diagnostic dependency snapshot, not authorization. A
linked document/context writer must first resolve and verify its trusted parent;
this helper does not accept arbitrary document/context IDs or implement their
mutation. It does not implement enrollment reassignment, catalog/auth changes,
batch ordering, API/file cleanup or bounded retry orchestration. All errors
require rollback; callers retain locks until transaction end.

## Evidence and remaining activation blockers

New tests in the existing dedicated PG suite run automatically in current CI:

- Real course/profile/document/Mintrud-context updates versus the dormant action
  scope, both registries, both transaction orders, source commit and rollback.
- Actual blocker/waiter PIDs via `pg_blocking_pids`; bounded waits and task cleanup.
  Events schedule operations but never substitute for observed database waits.
- Enrollment insert, first obligation insert and enrollment reassignment after
  stale discovery; fail closed, then succeed only from a new transaction.
- First decision without an obligation, plus reverse-order late obligation
  insertion while waiting on a legacy decision key, in both registries.
- Captured real SQL verifies sorted source keys, decision keys and individual
  obligation row locks with reversed/duplicate roots. Pending/approved/exported/
  submitted synthetic records and their approval fields remain unchanged.
- Invalid transaction/root preconditions and parents with no enrollments.

These are service-level PG tests, not claims of live API RBAC/readiness safety.
The original two decision-first legacy XFAIL are unchanged. Production source
writers still bypass the protocol. Historical cohort/continuation approval,
commit-bound authorization, fresh readiness/approval checks, catalog/config
generations and coordinated batch/file boundaries remain mandatory blockers.
The partial attempt veto remains false; no global gate is enabled.

Local verification uses a newly created internal Docker network and disposable
PostgreSQL container with tmpfs data, no host port or existing volume. Test code
is mounted read-only; fixtures create/drop only unique synthetic databases.
No existing local DB, protected worktree, historical data, production route,
deployment or external submission is changed. Exact-head CI results are recorded
in the Draft PR description after completion.

Next increment: stage a trusted document/context-to-enrollment resolver with
old/new dependency validation, then design the complete actor/role and
catalog/config generation scope before composing current RBAC/readiness in a
single disabled transaction boundary. Integrate all producer/writer families
together only after real API + PG race tests and historical transfer review.
