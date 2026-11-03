import inspect
import unittest
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch
from uuid import uuid4

from app.services.registry_action_lockset import (
    RegistrySourceFence,
)
from app.services.frdo_manual_applicability_policy import (
    ManualFrdoDecisionConflict,
)
from app.services.frdo_manual_applicability_transaction import (
    persist_manual_frdo_review_decision,
)


MODULE = (
    "app.services.frdo_manual_applicability_transaction."
)


class Result:
    def __init__(self, value):
        self.value = value

    def scalar_one_or_none(self):
        return self.value


class Connection:
    def __init__(self, isolation="READ COMMITTED"):
        self.isolation = isolation

    async def get_isolation_level(self):
        return self.isolation


class Session:
    def __init__(self, *, current=None, isolation="READ COMMITTED"):
        self.enrollment_id = str(uuid4())
        self.obligation_id = str(uuid4())
        self.current = current
        self.connection_obj = Connection(isolation)
        self.trace = []
        self.transaction = True

        self.obligation = SimpleNamespace(
            id=self.obligation_id,
            enrollment_id=self.enrollment_id,
            registry="frdo",
            status="ready",
            approved_at=None,
            approved_by_user_id=None,
            approval_snapshot_json=None,
            approval_fingerprint=None,
            approval_invalidated_at=None,
            submitted_at=None,
            accepted_at=None,
            external_id=None,
        )

    def in_transaction(self):
        return self.transaction

    async def connection(self):
        return self.connection_obj

    async def scalar(self, statement):
        self.trace.append("read_enrollment")
        return self.enrollment_id

    async def execute(self, statement, params=None):
        sql = str(statement)

        if "FROM registry_applicability" in sql:
            self.trace.append("read_decision")
            return Result(self.current)

        raise AssertionError("UNEXPECTED_SQL:" + sql[:200])


def request(session, **changes):
    result = {
        "session": session,
        "obligation_id": session.obligation_id,
        "decision": "required",
        "reason": "Reviewed legal applicability basis",
        "actor_user_id": str(uuid4()),
        "expected_version": 0,
        "expected_input_fingerprint": "a" * 64,
    }

    result.update(changes)
    return result


def inputs(status="needs_review"):
    return SimpleNamespace(
        fingerprint="a" * 64,
        evaluation=SimpleNamespace(status=status),
    )


class TestManualFrdoTransaction(unittest.IsolatedAsyncioTestCase):
    async def run_case(
        self,
        session,
        *,
        evaluation=None,
        locked_rows=None,
        scope_enrollments=None,
        writer_changed=True,
        **changes,
    ):
        record = SimpleNamespace(
            decision=changes.get("decision", "required")
        )

        async def real_fence_simulation(*, session, roots):
            if roots != (
                RegistrySourceFence(
                    "enrollment", session.enrollment_id
                ),
            ):
                raise AssertionError("UNEXPECTED_SOURCE_ROOT")

            session.trace.append("source_fence")

            rows = (
                (session.obligation,)
                if locked_rows is None
                else locked_rows
            )

            enrollments = (
                ((session.enrollment_id, "course", "user", None),)
                if scope_enrollments is None
                else scope_enrollments
            )

            return (
                rows,
                SimpleNamespace(enrollments=enrollments),
            )

        with (
            patch(
                MODULE
                + "acquire_discovered_registry_source_write_scope",
                new_callable=AsyncMock,
            ) as fence,
            patch(
                MODULE
                + "load_current_registry_applicability_inputs",
                new_callable=AsyncMock,
            ) as loader,
            patch(
                MODULE + "persist_registry_applicability",
                new_callable=AsyncMock,
            ) as writer,
        ):
            fence.side_effect = real_fence_simulation
            loader.return_value = evaluation or inputs()
            writer.return_value = (record, writer_changed)

            result = await persist_manual_frdo_review_decision(
                **request(session, **changes)
            )

            return result, fence, loader, writer

    async def test_required_uses_existing_writer(self):
        session = Session()
        result, fence, loader, writer = await self.run_case(
            session
        )

        self.assertEqual(result.decision, "required")
        self.assertEqual(fence.await_count, 1)
        self.assertEqual(loader.await_count, 1)
        self.assertEqual(writer.await_count, 1)
        self.assertEqual(
            writer.await_args.kwargs["source"],
            "manual",
        )
        self.assertEqual(
            writer.await_args.kwargs["evaluation"].status,
            "required",
        )
        self.assertEqual(
            writer.await_args.kwargs["input_fingerprint"],
            "a" * 64,
        )

    async def test_not_required_uses_existing_writer(self):
        session = Session()
        result, _, _, writer = await self.run_case(
            session,
            decision="not_required",
        )

        self.assertEqual(result.decision, "not_required")
        self.assertEqual(writer.await_count, 1)

    async def test_lock_order_source_before_decision(self):
        session = Session()
        await self.run_case(session)

        self.assertEqual(
            session.trace,
            [
                "read_enrollment",
                "source_fence",
                "read_decision",
            ],
        )

    async def test_external_lock_callback_not_accepted(self):
        signature = inspect.signature(
            persist_manual_frdo_review_decision
        )

        self.assertNotIn(
            "acquire_source_scope",
            signature.parameters,
        )

    async def test_no_transaction_fails_before_sql(self):
        session = Session()
        session.transaction = False

        with self.assertRaises(ManualFrdoDecisionConflict):
            await persist_manual_frdo_review_decision(
                **request(session)
            )

        self.assertEqual(session.trace, [])

    async def test_non_read_committed_fails(self):
        session = Session(isolation="REPEATABLE READ")

        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict,
            "READ COMMITTED",
        ):
            await persist_manual_frdo_review_decision(
                **request(session)
            )

        self.assertEqual(session.trace, [])

    async def test_locked_target_must_exist(self):
        session = Session()

        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict,
            "verified locked source scope",
        ):
            await self.run_case(
                session,
                locked_rows=(),
            )

        self.assertEqual(
            session.trace,
            ["read_enrollment", "source_fence"],
        )

    async def test_source_enrollment_must_exist(self):
        session = Session()

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                scope_enrollments=(
                    (str(uuid4()), "course", "user", None),
                ),
            )

    async def test_locked_target_enrollment_must_match(self):
        session = Session()
        wrong = SimpleNamespace(
            id=session.obligation_id,
            enrollment_id=str(uuid4()),
            registry="frdo",
        )

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                locked_rows=(wrong,),
            )

    async def test_locked_target_registry_must_match(self):
        session = Session()
        wrong = SimpleNamespace(
            id=session.obligation_id,
            enrollment_id=session.enrollment_id,
            registry="mintrud",
        )

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                locked_rows=(wrong,),
            )

    async def test_stale_expected_version_denied(self):
        session = Session()

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                expected_version=1,
            )

    async def test_history_record_cannot_be_rewritten(self):
        session = Session()
        session.current = SimpleNamespace(
            registry="frdo",
            enrollment_id=session.enrollment_id,
            decision="not_required",
            source="legacy",
            decision_version=1,
            input_fingerprint="a" * 64,
        )

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                expected_version=1,
            )

    async def test_protected_status_cannot_be_rewritten(self):
        session = Session()
        session.obligation.status = "approved"

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(session)

    async def test_rule_must_still_need_review(self):
        session = Session()

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                evaluation=inputs("required"),
            )

    async def test_changed_source_fingerprint_denied(self):
        session = Session()

        with self.assertRaises(ManualFrdoDecisionConflict):
            await self.run_case(
                session,
                expected_input_fingerprint="b" * 64,
            )

    async def test_no_op_writer_is_rejected(self):
        session = Session()

        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict,
            "not changed",
        ):
            await self.run_case(
                session,
                writer_changed=False,
            )


if __name__ == "__main__":
    unittest.main()
