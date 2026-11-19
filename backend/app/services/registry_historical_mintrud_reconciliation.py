"""Controlled reconciliation of one approved historical Mintrud obligation.

This module is deliberately not wired to an API, startup hook or CLI.
No automatic execution. The general applicability writer remains unchanged.
"""

from __future__ import annotations

import os
from hmac import compare_digest
from uuid import UUID

from sqlalchemy import select
from fastapi import HTTPException
from app.services.registry_release_gate import require_mintrud_batch_exports_enabled
from sqlalchemy.engine import make_url

from app.api.v1.rbac import get_user_permission_codes
from app.core.config import settings
from app.models.audit_event import AuditEvent
from app.models.base import utcnow
from app.models.mintrud_registry_context import MintrudRegistryContext
from app.models.role import Role, UserRole
from app.models.registry_applicability import (
    RegistryApplicabilityEvent,
    RegistryApplicabilityRecord,
)
from app.models.registry_obligation import RegistrySubmissionAttempt
from app.models.registry_submission_batch import RegistrySubmissionBatchItem
from app.models.user import User
from app.services.compliance_registry_approval import (
    fingerprint_registry_approval_snapshot,
)
from app.services.registry_action_scope import discover_registry_action_scope
from app.services.registry_applicability_db_inputs import (
    load_current_registry_applicability_inputs,
)
from app.services.registry_batch_p0_policy import (
    BatchApplicabilityInput,
    require_current_registry_batch_applicability,
)
from app.services.registry_catalog_policy_fence import (
    begin_registry_catalog_policy_fence,
)


class HistoricalMintrudReconciliationError(ValueError):
    pass


def _deny(code):
    raise HistoricalMintrudReconciliationError(code)


def _uuid(value):
    try:
        normalized = str(UUID(value))
    except (TypeError, ValueError, AttributeError):
        _deny("historical.invalid_uuid")
    if value != normalized:
        _deny("historical.noncanonical_uuid")
    return normalized


def _hash(value):
    if (
        not isinstance(value, str)
        or len(value) != 64
        or any(c not in "0123456789abcdef" for c in value)
    ):
        _deny("historical.invalid_fingerprint")
    return value


def _value(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def require_historical_local_target():
    url = make_url(settings.database_url)
    if (settings.environment != "local" or settings.production_exports_enabled
            or not settings.local_mintrud_xml_export_enabled
            or url.drivername != "postgresql+asyncpg"
            or url.host != "obr-m4p9-20261111-pg" or url.port != 5432
            or url.database != "obrportal_m4p9_workspace_20261111"
            or url.username != "obrportal_m4p9_login" or url.query):
        _deny("historical.local_target_required")


async def reconcile_historical_mintrud(
    *,
    session,
    actor_id: str,
    obligation_id: str,
    expected_approval_event_id: str,
    expected_approval_fingerprint: str,
    expected_applicability_fingerprint: str,
    operator_reason: str,
    apply: bool = False,
    operation_id: str | None = None,
):
    """Check one historical approval and optionally persist one decision.

    Requires a fresh application AsyncSession. The function owns its
    transaction. apply=False always rolls back. No batch is generated.
    """

    actor_id = _uuid(actor_id)
    obligation_id = _uuid(obligation_id)
    expected_approval_event_id = _uuid(expected_approval_event_id)

    expected_approval_fingerprint = _hash(
        expected_approval_fingerprint
    )
    expected_applicability_fingerprint = _hash(
        expected_applicability_fingerprint
    )

    if not isinstance(apply, bool):
        _deny("historical.invalid_mode")

    if (
        not isinstance(operator_reason, str)
        or not 16 <= len(operator_reason.strip()) <= 1000
    ):
        _deny("historical.reason_required")

    operator_reason = operator_reason.strip()

    require_historical_local_target()

    # Apply is disabled by default, including for direct service callers.
    # No production database can pass this boundary.
    if apply:
        target_url = make_url(settings.database_url)
        if (
            settings.environment != "local"
            or target_url.drivername != "postgresql+asyncpg"
            or target_url.host != "obr-m4p9-20261111-pg"
            or target_url.database != "obrportal_m4p9_workspace_20261111"
            or bool(target_url.query)
            or os.environ.get("P34D_LOCAL_HISTORICAL_APPLY")
            != "I_ACKNOWLEDGE_P34D_LOCAL_COMMIT"
        ):
            _deny("historical.apply_disabled")

        if operation_id is None:
            _deny("historical.operation_id_required")

        operation_id = _uuid(operation_id)

        if UUID(operation_id).version != 4:
            _deny("historical.operation_id_must_be_uuid4")

    elif operation_id is not None:
        _deny("historical.operation_id_for_apply_only")

    if session.in_transaction() or session.in_nested_transaction():
        _deny("historical.fresh_session_required")

    if session.new or session.dirty or session.deleted:
        _deny("historical.pending_changes")

    fence = await begin_registry_catalog_policy_fence(
        session=session,
        mode="exclusive",
    )

    try:
        actor = await session.scalar(
            select(User).where(
                User.id == actor_id,
                User.is_active.is_(True),
            )
        )

        if actor is None:
            _deny("historical.actor_not_found")

        permissions = await get_user_permission_codes(actor, session)
        if not {"mintrud.export", "mintrud.approve"}.issubset(
            permissions
        ):
            _deny("historical.permission_denied")

        global_admin_role = await session.scalar(
            select(Role.id)
            .join(UserRole, UserRole.role_id == Role.id)
            .where(
                UserRole.user_id == actor_id,
                UserRole.organization_id.is_(None),
                Role.code == "admin",
            )
            .limit(1)
        )

        if global_admin_role is None:
            _deny("historical.admin_role_required")

        # C is already exclusive and actor permissions were rechecked above.
        # The real marker is read on this exact action transaction, never auth TX.
        try:
            await require_mintrud_batch_exports_enabled(session)
        except HTTPException as exc:
            raise HistoricalMintrudReconciliationError("historical.local_identity_denied") from exc

        selected = (obligation_id,)

        before = await discover_registry_action_scope(
            session=session,
            actor_id=actor_id,
            registry="mintrud",
            obligation_ids=selected,
        )

        locked = await fence.action_lockset(
            source_fences=before.source_fences,
            obligation_targets=before.targets,
        )

        after = await discover_registry_action_scope(
            session=session,
            actor_id=actor_id,
            registry="mintrud",
            obligation_ids=selected,
        )

        if before != after or len(locked) != 1:
            _deny("historical.scope_changed")

        obligation = locked[0]

        if str(obligation.id) != obligation_id:
            _deny("historical.wrong_obligation")

        if obligation.registry != "mintrud":
            _deny("historical.wrong_registry")

        if (
            obligation.status != "approved"
            or obligation.approved_at is None
            or obligation.approval_invalidated_at is not None
        ):
            _deny("historical.approval_not_current")

        if (
            obligation.approval_event_id
            != expected_approval_event_id
        ):
            _deny("historical.approval_event_changed")

        snapshot = obligation.approval_snapshot_json

        if not isinstance(snapshot, dict) or not snapshot:
            _deny("historical.snapshot_missing")

        calculated_approval_hash = (
            fingerprint_registry_approval_snapshot(snapshot)
        )

        if not (
            compare_digest(
                calculated_approval_hash,
                expected_approval_fingerprint,
            )
            and compare_digest(
                calculated_approval_hash,
                obligation.approval_fingerprint or "",
            )
        ):
            _deny("historical.approval_fingerprint_changed")

        frozen_context = snapshot.get("mintrud_context")
        if not isinstance(frozen_context, dict):
            _deny("historical.frozen_context_missing")

        context = await session.scalar(
            select(MintrudRegistryContext).where(
                MintrudRegistryContext.obligation_id
                == obligation.id
            )
        )

        if context is None:
            _deny("historical.current_context_missing")

        fields = (
            "protocol_number",
            "knowledge_check_date",
            "knowledge_check_result",
        )

        for field in fields:
            frozen_value = _value(frozen_context.get(field))
            current_value = _value(getattr(context, field))

            if (
                not frozen_value
                or frozen_value != current_value
            ):
                _deny("historical.protocol_conflict:" + field)

        attempt = await session.scalar(
            select(RegistrySubmissionAttempt.id).where(
                RegistrySubmissionAttempt.obligation_id
                == obligation.id
            ).limit(1)
        )

        batch_item = await session.scalar(
            select(RegistrySubmissionBatchItem.id).where(
                RegistrySubmissionBatchItem.obligation_id
                == obligation.id
            ).limit(1)
        )

        if attempt is not None or batch_item is not None:
            _deny("historical.export_history_present")

        existing_decision = await session.scalar(
            select(RegistryApplicabilityRecord).where(
                RegistryApplicabilityRecord.enrollment_id
                == obligation.enrollment_id,
                RegistryApplicabilityRecord.registry
                == "mintrud",
            ).execution_options(populate_existing=True)
        )

        if existing_decision is not None:
            _deny("historical.decision_already_exists")

        current = await load_current_registry_applicability_inputs(
            session=session,
            obligation=obligation,
        )

        if current.evaluation.status != "required":
            _deny("historical.current_rule_not_required")

        if not (
            current.evaluation.rule_code
            and current.evaluation.rule_version
            and current.evaluation.reason
        ):
            _deny("historical.rule_provenance_missing")

        if not compare_digest(
            current.fingerprint,
            expected_applicability_fingerprint,
        ):
            _deny("historical.applicability_inputs_changed")

        result = {
            "obligation_id": obligation_id,
            "status": "approved",
            "rule": current.evaluation.rule_code,
            "rule_version": current.evaluation.rule_version,
            "decision": "required",
            "approval_hash_verified": True,
            "protocol_values_verified": True,
            "no_export_history": True,
            "no_existing_decision": True,
            "applied": False,
        }

        if not apply:
            await session.rollback()
            return result

        now = utcnow()

        record = RegistryApplicabilityRecord(
            enrollment_id=obligation.enrollment_id,
            registry="mintrud",
            decision="required",
            source="auto",
            rule_code=current.evaluation.rule_code,
            rule_version=current.evaluation.rule_version,
            reason=current.evaluation.reason,
            input_fingerprint=current.fingerprint,
            decided_by_user_id=None,
            decided_at=now,
            evaluated_at=now,
            decision_version=1,
        )

        session.add(record)
        await session.flush()

        session.add(
            RegistryApplicabilityEvent(
                applicability_id=record.id,
                enrollment_id=obligation.enrollment_id,
                registry="mintrud",
                decision="required",
                source="auto",
                rule_code=current.evaluation.rule_code,
                rule_version=current.evaluation.rule_version,
                reason=current.evaluation.reason,
                input_fingerprint=current.fingerprint,
                decided_by_user_id=None,
                decided_at=now,
                decision_version=1,
                created_at=now,
            )
        )

        session.add(
            AuditEvent(
                actor_user_id=actor_id,
                action=(
                    "admin.mintrud_historical_applicability_reconciled"
                ),
                entity_type="registry_obligation",
                entity_id=obligation_id,
                payload={
                    "operator_reason": operator_reason,
                    "operation_id": operation_id,
                    "applicability_id": str(record.id),
                    "approval_event_id": expected_approval_event_id,
                    "approval_fingerprint":
                        expected_approval_fingerprint,
                    "applicability_fingerprint":
                        current.fingerprint,
                    "rule_code": current.evaluation.rule_code,
                    "rule_version": current.evaluation.rule_version,
                    "decision": "required",
                    "decision_source": "auto",
                    "historical_review": True,
                },
            )
        )

        await session.flush()

        grants = require_current_registry_batch_applicability(
            registry="mintrud",
            entries=(
                BatchApplicabilityInput(
                    obligation=obligation,
                    decision=record,
                    current=current,
                ),
            ),
        )

        if len(grants) != 1:
            _deny("historical.postwrite_p0_denied")

        await session.commit()

        result["applied"] = True
        result["operation_id"] = operation_id
        return result

    except BaseException:
        if session.in_transaction():
            await session.rollback()
        raise