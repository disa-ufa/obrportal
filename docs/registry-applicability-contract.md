# Registry applicability contract — foundation (PR-2)

This change introduces a **pure, read-only applicability adapter** without changing existing obligations, approval, export, API responses or database schema.

## States

- `required`: submission could be applicable, but readiness and approval checks remain independent and mandatory.
- `not_required`: record must not be sent.
- `needs_review`: no defensible automated conclusion; record must not be sent until an authorized actor resolves the applicability decision.

The adapter maps legacy `undetermined` to `needs_review` while preserving existing rule code, version and reason.

The existing `occupational_safety_training` FRDO auto-rule remains `needs_review`, **not** an automatic exclusion. A future PR may only change its default after legal/policy criteria, affected document types and effective dates are approved. Course-level overrides likewise need auditable authorization before they can serve as the sole submission permission.

## Scope boundaries and follow-up sequence

1. Add an additive persisted applicability decision and append-only decision events with unique `(enrollment_id, registry)` current state.
2. Develop a dry-run historical reconciliation plan, preserve all exported/submitted/accepted and legacy snapshots; coordinate with Stage17B recovery.
3. Change creation so only confirmed `required` goes to work; unresolved goes to review; excluded remains in history.
4. Apply server-side `scope=work/review/history` with RBAC and pagination.
5. Guard **all** approval, single-artifact and batch-export paths at the backend using a current applicability snapshot; reject unresolved/excluded as HTTP 409.
6. Track course rule changes, invalidate stale approvals and avoid rewriting historical submissions.
7. Implement operator UI and comprehensive end-to-end tests.

No database migrations or production changes are included in this PR.
