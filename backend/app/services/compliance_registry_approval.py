from __future__ import annotations

from collections.abc import Mapping
from copy import deepcopy
from dataclasses import dataclass
from datetime import date, datetime
from hashlib import sha256
import json
from typing import Any

from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_NEEDS_APPROVAL,
    OBLIGATION_STATUS_READY,
    REGISTRY_FRDO,
    REGISTRY_MINTRUD,
)


APPROVAL_SNAPSHOT_SCHEMA_VERSION = "registry-approval-v1"

APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED = (
    "learner_profile_changed"
)
APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED = (
    "completion_document_changed"
)
APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED = (
    "course_title_changed"
)
APPROVAL_INVALIDATION_MINTRUD_CONTEXT_CHANGED = (
    "mintrud_context_changed"
)

APPROVAL_INVALIDATION_REASONS = frozenset(
    {
        APPROVAL_INVALIDATION_LEARNER_PROFILE_CHANGED,
        APPROVAL_INVALIDATION_COMPLETION_DOCUMENT_CHANGED,
        APPROVAL_INVALIDATION_COURSE_TITLE_CHANGED,
        APPROVAL_INVALIDATION_MINTRUD_CONTEXT_CHANGED,
    }
)

APPROVAL_VALID_CURRENT = "current"
APPROVAL_STALE_STATUS_NOT_APPROVED = "status_not_approved"
APPROVAL_STALE_MISSING_SNAPSHOT = "missing_snapshot"
APPROVAL_STALE_MISSING_FINGERPRINT = "missing_fingerprint"
APPROVAL_STALE_INVALIDATED = "invalidated"
APPROVAL_STALE_STORED_SNAPSHOT_MISMATCH = (
    "stored_snapshot_fingerprint_mismatch"
)
APPROVAL_STALE_CURRENT_DATA_MISMATCH = (
    "current_data_fingerprint_mismatch"
)


@dataclass(frozen=True)
class RegistryApprovalValidation:
    is_current: bool
    reason: str
    approved_fingerprint: str | None
    current_fingerprint: str


@dataclass(frozen=True)
class RegistryApprovalCapture:
    previous_status: str
    was_reapproval: bool
    snapshot: dict[str, Any]
    fingerprint: str


def _get(
    source: object | None,
    field: str,
) -> object | None:
    if source is None:
        return None

    return getattr(
        source,
        field,
        None,
    )


def _json_scalar(
    value: object | None,
) -> object | None:
    candidate = getattr(
        value,
        "value",
        value,
    )

    if isinstance(
        candidate,
        (
            datetime,
            date,
        ),
    ):
        return candidate.isoformat()

    if (
        candidate is None
        or isinstance(
            candidate,
            (
                str,
                int,
                float,
                bool,
            ),
        )
    ):
        return candidate

    return str(candidate)


def _normalize_json(
    value: object,
) -> object:
    if isinstance(
        value,
        Mapping,
    ):
        normalized: dict[
            str,
            object,
        ] = {}

        for key in sorted(
            value,
            key=lambda item: str(item),
        ):
            normalized[
                str(key)
            ] = _normalize_json(
                value[key]
            )

        return normalized

    if isinstance(
        value,
        (
            list,
            tuple,
        ),
    ):
        return [
            _normalize_json(item)
            for item in value
        ]

    return _json_scalar(
        value
    )


def _field_snapshot(
    source: object | None,
    fields: tuple[str, ...],
) -> dict[str, object | None]:
    return {
        field: _json_scalar(
            _get(
                source,
                field,
            )
        )
        for field in fields
    }


def build_registry_approval_snapshot(
    *,
    registry: str,
    enrollment: object | None,
    course: object | None,
    learner_profile: object | None,
    document: object | None = None,
    mintrud_context: object | None = None,
) -> dict[str, Any]:
    snapshot: dict[
        str,
        Any,
    ] = {
        "schema_version": (
            APPROVAL_SNAPSHOT_SCHEMA_VERSION
        ),
        "registry": registry,
        "enrollment": _field_snapshot(
            enrollment,
            (
                "status",
                "completed_at",
            ),
        ),
        "course": _field_snapshot(
            course,
            (
                "title",
            ),
        ),
    }

    if registry == REGISTRY_FRDO:
        snapshot[
            "learner_profile"
        ] = _field_snapshot(
            learner_profile,
            (
                "last_name",
                "first_name",
                "birth_date",
                "sex",
                "citizenship_country_code",
            ),
        )

        snapshot[
            "document"
        ] = _field_snapshot(
            document,
            (
                "enrollment_id",
                "document_number",
                "document_type",
                "revoked_at",
            ),
        )

        return snapshot

    if registry == REGISTRY_MINTRUD:
        snapshot[
            "learner_profile"
        ] = _field_snapshot(
            learner_profile,
            (
                "last_name",
                "first_name",
                "snils",
            ),
        )

        snapshot[
            "mintrud_context"
        ] = _field_snapshot(
            mintrud_context,
            (
                "reporting_scenario",
                "profession_or_position",
                "employer_name",
                "employer_inn",
                "knowledge_check_result",
                "knowledge_check_date",
                "protocol_number",
            ),
        )

        return snapshot

    raise ValueError(
        "Unsupported registry for approval snapshot: "
        + str(registry)
    )


def canonical_registry_approval_json(
    snapshot: Mapping[str, Any],
) -> str:
    normalized = _normalize_json(
        snapshot
    )

    if not isinstance(
        normalized,
        dict,
    ):
        raise ValueError(
            "Approval snapshot must be a mapping"
        )

    return json.dumps(
        normalized,
        ensure_ascii=False,
        sort_keys=True,
        separators=(",", ":"),
    )


def fingerprint_registry_approval_snapshot(
    snapshot: Mapping[str, Any],
) -> str:
    canonical = (
        canonical_registry_approval_json(
            snapshot
        )
    )

    return sha256(
        canonical.encode(
            "utf-8"
        )
    ).hexdigest()


def evaluate_registry_approval(
    obligation: object,
    *,
    current_snapshot: Mapping[str, Any],
) -> RegistryApprovalValidation:
    current_fingerprint = (
        fingerprint_registry_approval_snapshot(
            current_snapshot
        )
    )

    approved_fingerprint_raw = getattr(
        obligation,
        "approval_fingerprint",
        None,
    )

    approved_fingerprint = (
        str(
            approved_fingerprint_raw
        ).strip()
        if approved_fingerprint_raw
        else None
    )

    if getattr(
        obligation,
        "status",
        None,
    ) != OBLIGATION_STATUS_APPROVED:
        return RegistryApprovalValidation(
            is_current=False,
            reason=(
                APPROVAL_STALE_STATUS_NOT_APPROVED
            ),
            approved_fingerprint=(
                approved_fingerprint
            ),
            current_fingerprint=(
                current_fingerprint
            ),
        )

    approved_snapshot = getattr(
        obligation,
        "approval_snapshot_json",
        None,
    )

    if (
        not isinstance(
            approved_snapshot,
            Mapping,
        )
        or not approved_snapshot
    ):
        return RegistryApprovalValidation(
            is_current=False,
            reason=(
                APPROVAL_STALE_MISSING_SNAPSHOT
            ),
            approved_fingerprint=(
                approved_fingerprint
            ),
            current_fingerprint=(
                current_fingerprint
            ),
        )

    if approved_fingerprint is None:
        return RegistryApprovalValidation(
            is_current=False,
            reason=(
                APPROVAL_STALE_MISSING_FINGERPRINT
            ),
            approved_fingerprint=None,
            current_fingerprint=(
                current_fingerprint
            ),
        )

    if getattr(
        obligation,
        "approval_invalidated_at",
        None,
    ) is not None:
        return RegistryApprovalValidation(
            is_current=False,
            reason=APPROVAL_STALE_INVALIDATED,
            approved_fingerprint=(
                approved_fingerprint
            ),
            current_fingerprint=(
                current_fingerprint
            ),
        )

    stored_snapshot_fingerprint = (
        fingerprint_registry_approval_snapshot(
            approved_snapshot
        )
    )

    if (
        stored_snapshot_fingerprint
        != approved_fingerprint
    ):
        return RegistryApprovalValidation(
            is_current=False,
            reason=(
                APPROVAL_STALE_STORED_SNAPSHOT_MISMATCH
            ),
            approved_fingerprint=(
                approved_fingerprint
            ),
            current_fingerprint=(
                current_fingerprint
            ),
        )

    if (
        current_fingerprint
        != approved_fingerprint
    ):
        return RegistryApprovalValidation(
            is_current=False,
            reason=(
                APPROVAL_STALE_CURRENT_DATA_MISMATCH
            ),
            approved_fingerprint=(
                approved_fingerprint
            ),
            current_fingerprint=(
                current_fingerprint
            ),
        )

    return RegistryApprovalValidation(
        is_current=True,
        reason=APPROVAL_VALID_CURRENT,
        approved_fingerprint=(
            approved_fingerprint
        ),
        current_fingerprint=(
            current_fingerprint
        ),
    )


def is_registry_approval_current(
    obligation: object,
    *,
    current_snapshot: Mapping[str, Any],
) -> bool:
    return evaluate_registry_approval(
        obligation,
        current_snapshot=current_snapshot,
    ).is_current


def _require_aware_datetime(
    value: datetime,
    *,
    field: str,
) -> None:
    if (
        not isinstance(
            value,
            datetime,
        )
        or value.tzinfo is None
        or value.utcoffset() is None
    ):
        raise ValueError(
            field
            + " must be timezone-aware"
        )


def apply_registry_approval(
    obligation: object,
    *,
    current_snapshot: Mapping[str, Any],
    approved_by_user_id: str,
    approved_at: datetime,
) -> RegistryApprovalCapture:
    actor_id = str(
        approved_by_user_id
        or ""
    ).strip()

    if not actor_id:
        raise ValueError(
            "Approval actor user id is required"
        )

    _require_aware_datetime(
        approved_at,
        field="approved_at",
    )

    previous_status = str(
        getattr(
            obligation,
            "status",
            "",
        )
    )

    allowed_statuses = {
        OBLIGATION_STATUS_READY,
        OBLIGATION_STATUS_NEEDS_APPROVAL,
        OBLIGATION_STATUS_APPROVED,
    }

    if previous_status not in allowed_statuses:
        raise ValueError(
            "Registry obligation lifecycle "
            "does not allow approval"
        )

    if (
        previous_status
        == OBLIGATION_STATUS_APPROVED
    ):
        validation = evaluate_registry_approval(
            obligation,
            current_snapshot=current_snapshot,
        )

        if validation.is_current:
            raise ValueError(
                "Current registry approval "
                "cannot be reapproved"
            )

    normalized = _normalize_json(
        current_snapshot
    )

    if not isinstance(
        normalized,
        dict,
    ):
        raise ValueError(
            "Approval snapshot must be a mapping"
        )

    snapshot = deepcopy(
        normalized
    )

    fingerprint = (
        fingerprint_registry_approval_snapshot(
            snapshot
        )
    )

    was_reapproval = (
        getattr(
            obligation,
            "approved_at",
            None,
        )
        is not None
    )

    obligation.status = (
        OBLIGATION_STATUS_APPROVED
    )

    obligation.approval_snapshot_json = (
        deepcopy(
            snapshot
        )
    )

    obligation.approval_fingerprint = (
        fingerprint
    )

    obligation.approved_by_user_id = (
        actor_id
    )

    obligation.approved_at = approved_at

    obligation.approval_invalidated_at = (
        None
    )

    obligation.approval_invalidation_reason = (
        None
    )

    return RegistryApprovalCapture(
        previous_status=previous_status,
        was_reapproval=was_reapproval,
        snapshot=deepcopy(
            snapshot
        ),
        fingerprint=fingerprint,
    )


def invalidate_registry_approval(
    obligation: object,
    *,
    reason: str,
    invalidated_at: datetime,
) -> bool:
    normalized_reason = str(
        reason
        or ""
    ).strip()

    if (
        normalized_reason
        not in APPROVAL_INVALIDATION_REASONS
    ):
        raise ValueError(
            "Unsupported approval invalidation reason: "
            + normalized_reason
        )

    _require_aware_datetime(
        invalidated_at,
        field="invalidated_at",
    )

    if getattr(
        obligation,
        "status",
        None,
    ) != OBLIGATION_STATUS_APPROVED:
        return False

    obligation.status = (
        OBLIGATION_STATUS_NEEDS_APPROVAL
    )

    obligation.approval_invalidated_at = (
        invalidated_at
    )

    obligation.approval_invalidation_reason = (
        normalized_reason
    )

    return True

FRDO_APPROVAL_LEARNER_PROFILE_FIELDS = frozenset(
    {
        "last_name",
        "first_name",
        "birth_date",
        "sex",
        "citizenship_country_code",
    }
)

MINTRUD_APPROVAL_LEARNER_PROFILE_FIELDS = frozenset(
    {
        "last_name",
        "first_name",
        "snils",
    }
)


def approval_registries_for_learner_profile_fields(
    changed_fields: object,
) -> tuple[str, ...]:
    fields = {
        str(field)
        for field in (
            changed_fields
            or ()
        )
    }

    registries: list[str] = []

    if fields.intersection(
        FRDO_APPROVAL_LEARNER_PROFILE_FIELDS
    ):
        registries.append(
            REGISTRY_FRDO
        )

    if fields.intersection(
        MINTRUD_APPROVAL_LEARNER_PROFILE_FIELDS
    ):
        registries.append(
            REGISTRY_MINTRUD
        )

    return tuple(
        registries
    )
