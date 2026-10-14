# Registry applicability integration audit — 2026-10-13

Scope: OBRPORTAL main `aa4a36780eed12b898f8f8d30f50dcb3aff24466`, independent UI fix PR #166, and stacked registry applicability work PRs #167–177 (tip `ec47fa2c99bb706a74b3ff31285736b0e57c363e`). **This is not deployment authorization or a production readiness certificate.**

## Verified in GitHub

- All 12 PRs #166–177 currently target `main` and are in Draft state. PR #167–177 form a cumulative ancestry chain, not 11 independent changes.
- PR #177 is 39 commits and 29 changed files ahead of unchanged `main`; the UI fix PR #166 is separate.
- GitHub Actions CI #2775 passed for the exact PR #177 tip (including migrations, backend pytest, dedicated disposable PostgreSQL integration tests, frontend build and smoke checks). In this run the main backend test suite reported 1199 passed, 7 skipped, 4 warnings.
- No evidence in this audit of a migration being executed against a copy of production history, a live API gate activation, or actual external registry interoperability.

## Blocking findings (fix before any applicability cutover)

1. **P0: generic decision writer protects status but not all historical evidence.** `backend/app/services/registry_applicability_writer.py` checks `RegistryObligation.status` against a protected-status set. It does **not** check `approved_at`, `approved_by_user_id`, `approval_snapshot_json`, `approval_fingerprint`, `approval_invalidated_at`, submission timestamps, external reference, `registry_submission_attempts`, or `registry_submission_batch_items`. A legacy record with status `pending_data` but nonempty historical artifacts could therefore be reclassified by that writer. By contrast, `backend/app/registry_applicability_reconciliation_cli.py` **does** recognize this evidence. Align the writer with the stricter evidence predicate, lock appropriately, and add PostgreSQL integration tests.
2. **P0: legacy approval/export routes are not gated.** The current `backend/app/api/v1/admin.py` does not invoke `require_registry_applicability_for_submission` from `backend/app/services/registry_applicability_export_guard.py`. Existing FRDO/Mintrud approval, individual artifact preparation, batch creation and downloads retain their previous semantics. `applicability-preview` endpoints added in PR #172 are read-only; they do not repair the legacy worklists or block an API caller from exporting.
3. **P0: no executed migration/backfill plan for historical records.** `registry_applicability` is additive and initially empty on a migrated legacy database. The fail-closed gate would block every unclassified legacy row if turned on wholesale. Perform a copied-production schema and data dry run and review historical approvals, batches, and Stage17B missing obligations. Reconciliation requires an operator-approved, reversible and audited execution plan, not automatic status changes.
4. **P1: snapshot isolation != commit-time freshness.** `registry_applicability_snapshot.py` establishes stable multi-query visibility but a concurrent source write can commit after the snapshot. Production mutating paths require a reviewed transaction/locking strategy, source-version/fingerprint revalidation, serialization retry strategy, and permission/readiness checks in the **same** transaction.
5. **P1: reporting scopes are not yet historical lifecycle scopes.** `registry_applicability_preview.py` maps `work -> required`, `review -> needs_review`, `history -> not_required`. These are *decision categories*, not final submission worklists or full histories. `required` alone does not mean ready/approved; accepted/submitted records might be required but belong in history. Define server-side lifecycle joins, missing-classification review, stable pagination and authorization before replacing UI.
6. **P1: immutable audit-event FK/user lifecycle.** `registry_applicability_events.decided_by_user_id` uses `ON DELETE SET NULL`, while an UPDATE/DELETE prevention trigger makes events immutable. Removing an actor user might attempt to update history and be rejected. Review retention and user anonymization policy; add DB tests rather than loosening history protection.
7. **P1: legal/policy scope.** For `occupational_safety_training`, FRDO `auto` currently yields `needs_review`, not `not_required`. Never auto-exclude FRDO without a documented decision specifying program/document/effective date, even when Mintrud is required. Course-level explicit overrides also require authorized, audited provenance.

## Safe integration sequence

1. Freeze the cumulative PR chain and examine changes between **consecutive** branches, not just each PR against `main`. Review the independent #166 UI fix separately.
2. Fix P0 writer historical-evidence protection and add adversarial PG tests for `pending_data` plus past approvals/attempts/batch membership, as well as event integrity and concurrent edits. Preserve Stage17B worktree and recovery scope.
3. Restore a recent, **authorized** backup into a wholly isolated test environment; validate migration forward on this historical data and record baseline/after counts, snapshots, file references and decisions. No automatic `alembic downgrade` on populated event history: its current downgrade deletes the new evidence tables.
4. Obtain an explicit signed-off classification policy, build a dry-run reconciliation report with aggregate categories and a separate per-record approval manifest held securely. Keep unknowns in `needs_review`; never infer required/not_required from the legacy row's existence.
5. Implement an audited, retryable reconciliation writer distinct from the generic writer, preserving existing submitted/exported/accepted evidence and supporting a safe stop/rollback plan. Do not rewrite past external filings.
6. Implement *server-side* `work / review / history` lifecycle scopes under existing registry RBAC. Cover manual overrides, current applicability and missing classification. Verify counts match the operator reports.
7. Gate **every mutating entry point**: approval; individual FRDO/Mintrud exports; batch preparation; preparation/re-download semantics; and submission record updates as appropriate. Pair current canonical fingerprint with readiness, approval snapshots, source locks and RBAC in the same transaction. Use fail-closed conflict responses only after the audited backfill.
8. Re-run CI and real browser tests on an isolated copy; get explicit authorization for production backups/migration/deployment. Deploy with monitoring, safe rollback and operator smoke checks. Do not perform external submissions during internal tests.

## Merge strategy

All PRs currently target `main` and #167–177 are cumulative, so GitHub's green CI for #177 does **not** mean it is safe to merge all eleven PRs separately without review. Prefer reviewing/merging #166 separately, then retargeting stacked PRs consecutively (or a carefully reviewed consolidated PR), checking the **effective diff** and CI after each rebase/merge. Preserve original reviews and stop if the base changes unexpectedly. No merge or deployment is performed by this audit.

## Deployment and data safety

- This audit is limited to repository code and GitHub CI. Current production database state and backup restore validity have **not** been verified in this work.
- Do not touch local uncommitted Stage17B worktree `C:\root\obrportal-current-main`, visual test worktree `C:\root\obrportal-visual-main`, their volumes, or production without separate approval.
- The end-user defect (records displayed in both FRDO and Mintrud worklists regardless of applicability) is **not yet fixed** in the currently deployed / legacy API workflow.
