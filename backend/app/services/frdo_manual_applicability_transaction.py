"""Manual FRDO applicability transaction coordinator.

NOT connected to HTTP. NOT production-qualified.

The caller must own a PostgreSQL transaction and supply a verified
source-scope locking function. This service never commits or rolls back.

Lock order:
    source-scope fence -> applicability advisory lock ->
    obligation row -> current decision row.

Only the existing applicability writer may persist the decision/event.
"""

from uuid import UUID

from sqlalchemy import select

from app.models.registry_applicability import RegistryApplicabilityRecord
from app.models.registry_obligation import RegistryObligation
from app.services.registry_action_lockset import RegistrySourceFence
from app.services.registry_source_write_scope import acquire_discovered_registry_source_write_scope
from app.services.frdo_manual_applicability_policy import (
    ManualFrdoDecisionConflict,
    plan_manual_frdo_review_decision,
)
from app.services.registry_applicability import RegistryApplicability
from app.services.registry_applicability_db_inputs import (
    load_current_registry_applicability_inputs,
)
from app.services.registry_applicability_writer import (
    persist_registry_applicability,
)


MANUAL_RULE_CODE = "frdo.manual.review"
MANUAL_RULE_VERSION = "m3.2.7-v1"


def _require_uuid(value, name):
    try:
        return str(UUID(str(value)))
    except (ValueError, TypeError, AttributeError) as exc:
        raise ManualFrdoDecisionConflict(
            "Invalid " + name
        ) from exc


async def persist_manual_frdo_review_decision(
    *,
    session,
    obligation_id,
    decision,
    reason,
    actor_user_id,
    expected_version,
    expected_input_fingerprint,
):
    """Prepare and persist one reviewed decision, without COMMIT.

    The project's source-scope locking function is invoked directly.
    It locks both registries in canonical order and rechecks scope.
    Legacy writers that bypass source fences remain a known risk.
    This coordinator MUST NOT be connected to HTTP until real
    PostgreSQL concurrency and legacy-path tests qualify it.
    """
    if not session.in_transaction():
        raise ManualFrdoDecisionConflict(
            "Caller-owned transaction required"
        )

    obligation_uuid = _require_uuid(obligation_id, "obligation_id")
    _require_uuid(actor_user_id, "actor_user_id")

    connection = await session.connection()
    isolation = (await connection.get_isolation_level()).upper()

    if isolation != "READ COMMITTED":
        raise ManualFrdoDecisionConflict(
            "READ COMMITTED transaction required"
        )

    # Lookup only: do not lock obligation before the source fence.
    enrollment_id = await session.scalar(
        select(RegistryObligation.enrollment_id).where(
            RegistryObligation.id == obligation_uuid,
            RegistryObligation.registry == "frdo",
        )
    )

    if enrollment_id is None:
        raise ManualFrdoDecisionConflict(
            "FRDO obligation not found"
        )

    enrollment_id = _require_uuid(
        enrollment_id, "enrollment_id"
    )

    # First lock-taking operation: the canonical source protocol.
    # It acquires source fences, BOTH registry decision keys, and
    # all discovered obligation rows before returning.
    locked, scope = await acquire_discovered_registry_source_write_scope(
        session=session,
        roots=(RegistrySourceFence("enrollment", enrollment_id),),
    )

    # Fail closed if scope discovery changed or omitted the requested
    # enrollment/obligation. Do not trust the initial unlocked lookup.
    enrollment_found = any(
        str(row[0]) == enrollment_id
        for row in scope.enrollments
    )

    matching = [
        row for row in locked
        if (
            str(row.id) == obligation_uuid
            and str(row.enrollment_id) == enrollment_id
            and row.registry == "frdo"
        )
    ]

    if not enrollment_found or len(matching) != 1:
        raise ManualFrdoDecisionConflict(
            "FRDO obligation not in verified locked source scope"
        )

    # Returned rows were locked with FOR UPDATE and populate_existing.
    obligation = matching[0]

    result = await session.execute(
        select(RegistryApplicabilityRecord)
        .where(
            RegistryApplicabilityRecord.enrollment_id
            == enrollment_id,
            RegistryApplicabilityRecord.registry == "frdo",
        )
        .with_for_update()
        .execution_options(populate_existing=True)
    )

    current = result.scalar_one_or_none()

    # These inputs are read only after the source fence.
    inputs = await load_current_registry_applicability_inputs(
        session=session,
        obligation=obligation,
    )

    plan = plan_manual_frdo_review_decision(
        obligation=obligation,
        current=current,
        decision=decision,
        reason=reason,
        actor_user_id=actor_user_id,
        expected_version=expected_version,
        current_input_fingerprint=inputs.fingerprint,
        expected_input_fingerprint=expected_input_fingerprint,
        current_rule_status=inputs.evaluation.status,
    )

    evaluation = RegistryApplicability(
        registry="frdo",
        status=plan.decision,
        rule_code=MANUAL_RULE_CODE,
        rule_version=MANUAL_RULE_VERSION,
        reason=plan.reason,
    )

    # Existing writer independently checks protected history,
    # acquires its advisory/row locks and writes one audit event.
    # It intentionally does NOT commit.
    record, changed = await persist_registry_applicability(
        session=session,
        enrollment_id=plan.enrollment_id,
        evaluation=evaluation,
        source="manual",
        actor_user_id=plan.actor_user_id,
        manual_reason=plan.reason,
        input_fingerprint=plan.input_fingerprint,
    )

    if not changed:
        raise ManualFrdoDecisionConflict(
            "Review decision was not changed"
        )

    return record