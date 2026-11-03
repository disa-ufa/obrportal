import unittest
from types import SimpleNamespace
from uuid import uuid4

from app.services.frdo_manual_applicability_policy import (
    ManualFrdoDecisionConflict,
    plan_manual_frdo_review_decision,
)


def fixture():
    obligation = SimpleNamespace(
        registry="frdo",
        enrollment_id=str(uuid4()),
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

    values = {
        "obligation": obligation,
        "current": None,
        "decision": "required",
        "reason": "Checked regulatory classification",
        "actor_user_id": str(uuid4()),
        "expected_version": 0,
        "current_input_fingerprint": "a" * 64,
        "expected_input_fingerprint": "a" * 64,
        "current_rule_status": "needs_review",
    }

    return values


class TestManualFrdoDecisionPolicy(unittest.TestCase):
    def test_initial_review_to_required(self):
        plan = plan_manual_frdo_review_decision(**fixture())
        self.assertEqual(plan.decision, "required")
        self.assertEqual(plan.expected_version, 0)

    def test_initial_review_to_not_required(self):
        values = fixture()
        values["decision"] = "not_required"
        plan = plan_manual_frdo_review_decision(**values)
        self.assertEqual(plan.decision, "not_required")

    def test_persisted_needs_review_can_be_resolved(self):
        values = fixture()
        values["current"] = SimpleNamespace(
            registry="frdo",
            enrollment_id=values["obligation"].enrollment_id,
            decision="needs_review",
            source="auto",
            decision_version=2,
            input_fingerprint="a" * 64,
        )
        values["expected_version"] = 2
        self.assertEqual(
            plan_manual_frdo_review_decision(**values).expected_version,
            2,
        )

    def test_existing_not_required_is_immutable_here(self):
        values = fixture()
        values["current"] = SimpleNamespace(
            registry="frdo",
            enrollment_id=values["obligation"].enrollment_id,
            decision="not_required",
            source="legacy",
            decision_version=1,
            input_fingerprint="a" * 64,
        )
        values["expected_version"] = 1
        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict, "separate reconciliation"
        ):
            plan_manual_frdo_review_decision(**values)

    def test_existing_required_is_immutable_here(self):
        values = fixture()
        values["current"] = SimpleNamespace(
            registry="frdo",
            enrollment_id=values["obligation"].enrollment_id,
            decision="required",
            source="manual",
            decision_version=1,
            input_fingerprint="a" * 64,
        )
        values["expected_version"] = 1
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_changed_version_is_rejected(self):
        values = fixture()
        values["expected_version"] = 1
        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict, "version changed"
        ):
            plan_manual_frdo_review_decision(**values)

    def test_changed_source_fingerprint_is_rejected(self):
        values = fixture()
        values["expected_input_fingerprint"] = "b" * 64
        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict, "snapshot changed"
        ):
            plan_manual_frdo_review_decision(**values)

    def test_stale_stored_fingerprint_is_rejected(self):
        values = fixture()
        values["current"] = SimpleNamespace(
            registry="frdo",
            enrollment_id=values["obligation"].enrollment_id,
            decision="needs_review",
            source="auto",
            decision_version=1,
            input_fingerprint="b" * 64,
        )
        values["expected_version"] = 1
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_protected_obligation_is_rejected(self):
        values = fixture()
        values["obligation"].status = "approved"
        with self.assertRaisesRegex(
            ManualFrdoDecisionConflict, "Protected"
        ):
            plan_manual_frdo_review_decision(**values)

    def test_protected_approval_evidence_is_rejected(self):
        values = fixture()
        values["obligation"].approval_fingerprint = "historical"
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_wrong_registry_is_rejected(self):
        values = fixture()
        values["obligation"].registry = "mintrud"
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_non_review_rule_is_rejected(self):
        values = fixture()
        values["current_rule_status"] = "not_required"
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_missing_reason_is_rejected(self):
        values = fixture()
        values["reason"] = " "
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_invalid_actor_is_rejected(self):
        values = fixture()
        values["actor_user_id"] = "not-a-uuid"
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)

    def test_missing_expected_fingerprint_is_rejected(self):
        values = fixture()
        values["expected_input_fingerprint"] = None
        with self.assertRaises(ManualFrdoDecisionConflict):
            plan_manual_frdo_review_decision(**values)


if __name__ == "__main__":
    unittest.main()