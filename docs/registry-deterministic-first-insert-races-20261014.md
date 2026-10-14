# M2: deterministic first-child PostgreSQL races (2026-10-14)

Stacked on Draft #186 at `ff6b82dd1ad551f840c33a2581b46bea1152495b`; cumulative PR targets main solely to trigger CI. Review incremental changes against #186. Do not merge out of order.

The previous first-context race accepted two schedules, including a no-conflict path when the writer committed before the reader's initial query. It was not a proof that a pre-lock absent child would be detected. The replacement in `test_registry_applicability_writer_pg.py` explicitly synchronizes both orders using asyncio events around the **real first discovery** and uses `pg_blocking_pids` to verify the actual PostgreSQL lock wait:

- **Reader first:** reader captures an absent document/context, cooperating writer takes its parent enrollment source fence and inserts the missing child, reader starts waiting, observer proves it is blocked by that writer, writer commits, reader refreshes scope and MUST fail `registry.scope_changed_during_lock`. A success in this order is a test failure.
- **Action first:** reader completes the lockset and holds the transaction; cooperating writer must wait for the parent fence; after reader commits, writer inserts the child. Both complete, without deadlock.
- Both orders run for **FRDO and Mintrud** and for **document and registry context** first inserts. Afterward, tests assert source child preservation, unchanged pending obligation and no new applicability decision.

No live API route, new-action gate or source writer is wired by this test-only increment. The real existing writers still do NOT share the advisory fences, and the detached test writer is an explicitly cooperating synthetic writer. Current classification/fingerprint and RBAC checks, legacy batch lock ordering, source writer adoption and historical transfer remain blockers. The prior 2 XFAIL are intentionally retained. No production/database deploy, main merge or existing worktree change.

CI results must be verified on the exact new head rather than inferred from predecessor PR #186.
