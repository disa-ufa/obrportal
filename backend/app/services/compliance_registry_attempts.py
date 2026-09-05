from __future__ import annotations

import json
import re
from hashlib import sha256
from datetime import datetime, timezone
from typing import Any, Mapping

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_ACCEPTED,
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_CORRECTION_REQUIRED,
    OBLIGATION_STATUS_EXPORTED,
    OBLIGATION_STATUS_REJECTED,
    OBLIGATION_STATUS_SUBMITTED,
)
from app.services.document_storage import (
    delete_private_storage_file,
    resolve_private_storage_path,
    write_private_storage_file,
)


class RegistrySubmissionAttemptError(ValueError):
    pass


def freeze_registry_snapshot(
    snapshot: Mapping[str, Any],
) -> dict:
    if not isinstance(
        snapshot,
        Mapping,
    ):
        raise RegistrySubmissionAttemptError(
            "Registry snapshot must be a mapping"
        )

    try:
        encoded = json.dumps(
            dict(snapshot),
            ensure_ascii=False,
            sort_keys=True,
            separators=(
                ",",
                ":",
            ),
            allow_nan=False,
        )

        frozen = json.loads(
            encoded
        )

    except (
        TypeError,
        ValueError,
    ) as exc:
        raise RegistrySubmissionAttemptError(
            "Registry snapshot must be JSON serializable"
        ) from exc

    if not isinstance(
        frozen,
        dict,
    ):
        raise RegistrySubmissionAttemptError(
            "Registry snapshot must serialize to an object"
        )

    return frozen


def normalize_attempt_transport(
    transport: str,
) -> str:
    normalized = str(
        transport
        or ""
    ).strip()

    if not normalized:
        raise RegistrySubmissionAttemptError(
            "Registry attempt transport is required"
        )

    if len(normalized) > 32:
        raise RegistrySubmissionAttemptError(
            "Registry attempt transport exceeds maximum length 32"
        )

    return normalized


def normalize_attempt_schema_version(
    schema_version: str | None,
) -> str | None:
    if schema_version is None:
        return None

    normalized = str(
        schema_version
    ).strip()

    if not normalized:
        return None

    if len(normalized) > 64:
        raise RegistrySubmissionAttemptError(
            "Registry attempt schema version exceeds maximum length 64"
        )

    return normalized


async def create_registry_submission_attempt(
    session: AsyncSession,
    *,
    obligation_id: str,
    snapshot: Mapping[str, Any],
    generated_by_user_id: str | None,
    transport: str = "file",
    schema_version: str | None = None,
) -> RegistrySubmissionAttempt:
    normalized_obligation_id = str(
        obligation_id
        or ""
    ).strip()

    if not normalized_obligation_id:
        raise RegistrySubmissionAttemptError(
            "Registry obligation id is required"
        )

    frozen_snapshot = (
        freeze_registry_snapshot(
            snapshot
        )
    )

    normalized_transport = (
        normalize_attempt_transport(
            transport
        )
    )

    normalized_schema_version = (
        normalize_attempt_schema_version(
            schema_version
        )
    )

    obligation_result = (
        await session.execute(
            select(
                RegistryObligation
            )
            .where(
                RegistryObligation.id
                == normalized_obligation_id
            )
            .with_for_update()
        )
    )

    obligation = (
        obligation_result
        .scalar_one_or_none()
    )

    if obligation is None:
        raise RegistrySubmissionAttemptError(
            "Registry obligation was not found"
        )

    max_attempt_no = (
        await session.scalar(
            select(
                func.max(
                    RegistrySubmissionAttempt
                    .attempt_no
                )
            ).where(
                RegistrySubmissionAttempt
                .obligation_id
                == obligation.id
            )
        )
    )

    next_attempt_no = int(
        max_attempt_no
        or 0
    ) + 1

    attempt = (
        RegistrySubmissionAttempt(
            obligation_id=str(
                obligation.id
            ),
            attempt_no=(
                next_attempt_no
            ),
            transport=(
                normalized_transport
            ),
            schema_version=(
                normalized_schema_version
            ),
            snapshot_json=(
                frozen_snapshot
            ),
            artifact_path=None,
            artifact_sha256=None,
            generated_by_user_id=(
                str(
                    generated_by_user_id
                )
                if generated_by_user_id
                else None
            ),
            generated_at=datetime.now(
                timezone.utc
            ),
            submitted_by_user_id=None,
            submitted_at=None,
            external_reference=None,
            result_status=None,
            errors_json=[],
        )
    )

    session.add(
        attempt
    )

    await session.flush()

    return attempt

def normalize_registry_artifact_extension(
    extension: str,
) -> str:
    normalized = str(
        extension
        or ""
    ).strip().lower()

    if not normalized:
        raise RegistrySubmissionAttemptError(
            "Registry artifact extension is required"
        )

    if not normalized.startswith(
        "."
    ):
        normalized = (
            "."
            + normalized
        )

    if not re.fullmatch(
        r"\.[a-z0-9]{1,15}",
        normalized,
    ):
        raise RegistrySubmissionAttemptError(
            "Registry artifact extension is invalid"
        )

    return normalized


def build_registry_artifact_storage_path(
    attempt: RegistrySubmissionAttempt,
    *,
    extension: str,
) -> str:
    normalized_extension = (
        normalize_registry_artifact_extension(
            extension
        )
    )

    return (
        "generated/registry/"
        + str(
            attempt.obligation_id
        )
        + "/"
        + str(
            int(
                attempt.attempt_no
            )
        ).zfill(
            6
        )
        + "-"
        + str(
            attempt.id
        )
        + normalized_extension
    )


def delete_registry_artifact_safely(
    storage_path: str | None,
) -> bool:
    if not storage_path:
        return False

    try:
        return (
            delete_private_storage_file(
                storage_path
            )
        )

    except OSError:
        return False


async def attach_registry_submission_artifact(
    session: AsyncSession,
    *,
    attempt_id: str,
    content: bytes,
    extension: str,
) -> RegistrySubmissionAttempt:
    normalized_attempt_id = str(
        attempt_id
        or ""
    ).strip()

    if not normalized_attempt_id:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt id is required"
        )

    if not isinstance(
        content,
        bytes,
    ):
        raise RegistrySubmissionAttemptError(
            "Registry artifact content must be bytes"
        )

    if not content:
        raise RegistrySubmissionAttemptError(
            "Registry artifact content must not be empty"
        )

    normalized_extension = (
        normalize_registry_artifact_extension(
            extension
        )
    )

    attempt_result = (
        await session.execute(
            select(
                RegistrySubmissionAttempt
            )
            .where(
                RegistrySubmissionAttempt.id
                == normalized_attempt_id
            )
            .with_for_update()
        )
    )

    attempt = (
        attempt_result
        .scalar_one_or_none()
    )

    if attempt is None:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt was not found"
        )

    if (
        attempt.artifact_path
        is not None
        or attempt.artifact_sha256
        is not None
    ):
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt already has an artifact"
        )

    artifact_path = (
        build_registry_artifact_storage_path(
            attempt,
            extension=(
                normalized_extension
            ),
        )
    )

    artifact_sha256 = sha256(
        content
    ).hexdigest()

    try:
        saved_path = (
            write_private_storage_file(
                artifact_path,
                content,
            )
        )

        attempt.artifact_path = (
            saved_path
        )

        attempt.artifact_sha256 = (
            artifact_sha256
        )

        await session.flush()

    except Exception:
        delete_registry_artifact_safely(
            artifact_path
        )

        raise

    return attempt

REGISTRY_RECONCILIATION_RESULT_STATUSES = frozenset(
    {
        OBLIGATION_STATUS_ACCEPTED,
        OBLIGATION_STATUS_REJECTED,
        OBLIGATION_STATUS_CORRECTION_REQUIRED,
    }
)


def normalize_registry_external_reference(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = str(
        value
    ).strip()

    if not normalized:
        return None

    if len(normalized) > 255:
        raise RegistrySubmissionAttemptError(
            "Registry external reference exceeds maximum length 255"
        )

    return normalized


def normalize_registry_external_id(
    value: str | None,
) -> str | None:
    if value is None:
        return None

    normalized = str(
        value
    ).strip()

    if not normalized:
        return None

    if len(normalized) > 255:
        raise RegistrySubmissionAttemptError(
            "Registry external id exceeds maximum length 255"
        )

    return normalized


def normalize_registry_result_errors(
    errors: list[str] | tuple[str, ...] | None,
) -> list[str]:
    if errors is None:
        return []

    if not isinstance(
        errors,
        (
            list,
            tuple,
        ),
    ):
        raise RegistrySubmissionAttemptError(
            "Registry result errors must be a list"
        )

    normalized = []

    for value in errors:
        text = str(
            value
            or ""
        ).strip()

        if not text:
            continue

        if len(text) > 4000:
            raise RegistrySubmissionAttemptError(
                "Registry result error exceeds maximum length 4000"
            )

        normalized.append(
            text
        )

    return normalized


async def _load_registry_attempt_and_obligation_for_update(
    session: AsyncSession,
    *,
    attempt_id: str,
) -> tuple[
    RegistrySubmissionAttempt,
    RegistryObligation,
]:
    normalized_attempt_id = str(
        attempt_id
        or ""
    ).strip()

    if not normalized_attempt_id:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt id is required"
        )

    obligation_id = (
        await session.scalar(
            select(
                RegistrySubmissionAttempt.obligation_id
            ).where(
                RegistrySubmissionAttempt.id
                == normalized_attempt_id
            )
        )
    )

    if obligation_id is None:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt was not found"
        )

    obligation_result = (
        await session.execute(
            select(
                RegistryObligation
            )
            .where(
                RegistryObligation.id
                == obligation_id
            )
            .with_for_update()
        )
    )

    obligation = (
        obligation_result
        .scalar_one_or_none()
    )

    if obligation is None:
        raise RegistrySubmissionAttemptError(
            "Registry obligation was not found"
        )

    attempt_result = (
        await session.execute(
            select(
                RegistrySubmissionAttempt
            )
            .where(
                RegistrySubmissionAttempt.id
                == normalized_attempt_id,
                RegistrySubmissionAttempt.obligation_id
                == obligation.id,
            )
            .with_for_update()
        )
    )

    attempt = (
        attempt_result
        .scalar_one_or_none()
    )

    if attempt is None:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt was not found"
        )

    return (
        attempt,
        obligation,
    )


def validate_registry_attempt_artifact_integrity(
    attempt: RegistrySubmissionAttempt,
) -> None:
    if (
        not attempt.artifact_path
        or not attempt.artifact_sha256
    ):
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt has no attached artifact"
        )

    absolute_path = (
        resolve_private_storage_path(
            attempt.artifact_path
        )
    )

    if (
        absolute_path is None
        or not absolute_path.exists()
        or not absolute_path.is_file()
    ):
        raise RegistrySubmissionAttemptError(
            "Registry submission artifact file is missing"
        )

    actual_sha256 = sha256(
        absolute_path.read_bytes()
    ).hexdigest()

    if (
        actual_sha256
        != attempt.artifact_sha256
    ):
        raise RegistrySubmissionAttemptError(
            "Registry submission artifact checksum mismatch"
        )


async def mark_registry_submission(
    session: AsyncSession,
    *,
    attempt_id: str,
    submitted_by_user_id: str,
    external_reference: str | None = None,
) -> RegistrySubmissionAttempt:
    normalized_user_id = str(
        submitted_by_user_id
        or ""
    ).strip()

    if not normalized_user_id:
        raise RegistrySubmissionAttemptError(
            "Registry submission actor is required"
        )

    normalized_reference = (
        normalize_registry_external_reference(
            external_reference
        )
    )

    (
        attempt,
        obligation,
    ) = await _load_registry_attempt_and_obligation_for_update(
        session,
        attempt_id=attempt_id,
    )

    if (
        attempt.submitted_at is not None
        or attempt.submitted_by_user_id is not None
    ):
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt is already submitted"
        )

    if (
        obligation.status
        != OBLIGATION_STATUS_EXPORTED
    ):
        raise RegistrySubmissionAttemptError(
            "Registry obligation must be exported before submission"
        )

    validate_registry_attempt_artifact_integrity(
        attempt
    )

    submitted_at = datetime.now(
        timezone.utc
    )

    attempt.submitted_by_user_id = (
        normalized_user_id
    )

    attempt.submitted_at = (
        submitted_at
    )

    attempt.external_reference = (
        normalized_reference
    )

    attempt.result_status = None
    attempt.errors_json = []

    obligation.status = (
        OBLIGATION_STATUS_SUBMITTED
    )

    obligation.submitted_at = (
        submitted_at
    )

    obligation.accepted_at = None
    obligation.last_error = None

    await session.flush()

    return attempt


async def record_registry_submission_result(
    session: AsyncSession,
    *,
    attempt_id: str,
    result_status: str,
    external_id: str | None = None,
    errors: list[str] | tuple[str, ...] | None = None,
) -> RegistrySubmissionAttempt:
    normalized_result_status = str(
        result_status
        or ""
    ).strip()

    if (
        normalized_result_status
        not in REGISTRY_RECONCILIATION_RESULT_STATUSES
    ):
        raise RegistrySubmissionAttemptError(
            "Unsupported registry submission result status"
        )

    normalized_external_id = (
        normalize_registry_external_id(
            external_id
        )
    )

    normalized_errors = (
        normalize_registry_result_errors(
            errors
        )
    )

    if (
        normalized_result_status
        == OBLIGATION_STATUS_ACCEPTED
        and normalized_errors
    ):
        raise RegistrySubmissionAttemptError(
            "Accepted registry result must not contain errors"
        )

    if (
        normalized_result_status
        != OBLIGATION_STATUS_ACCEPTED
        and normalized_external_id is not None
    ):
        raise RegistrySubmissionAttemptError(
            "Registry external id is allowed only for accepted result"
        )

    (
        attempt,
        obligation,
    ) = await _load_registry_attempt_and_obligation_for_update(
        session,
        attempt_id=attempt_id,
    )

    if attempt.submitted_at is None:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt has not been submitted"
        )

    if attempt.result_status is not None:
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt already has a result"
        )

    if (
        obligation.status
        != OBLIGATION_STATUS_SUBMITTED
    ):
        raise RegistrySubmissionAttemptError(
            "Registry obligation must be submitted before recording result"
        )

    attempt.result_status = (
        normalized_result_status
    )

    attempt.errors_json = (
        normalized_errors
    )

    obligation.status = (
        normalized_result_status
    )

    if (
        normalized_result_status
        == OBLIGATION_STATUS_ACCEPTED
    ):
        obligation.accepted_at = (
            datetime.now(
                timezone.utc
            )
        )

        obligation.external_id = (
            normalized_external_id
        )

        obligation.last_error = None

    else:
        obligation.accepted_at = None
        obligation.external_id = None

        obligation.last_error = (
            "\n".join(
                normalized_errors
            )
            if normalized_errors
            else None
        )

    await session.flush()

    return attempt

async def mark_registry_exported(
    session: AsyncSession,
    *,
    attempt_id: str,
) -> RegistrySubmissionAttempt:
    (
        attempt,
        obligation,
    ) = await _load_registry_attempt_and_obligation_for_update(
        session,
        attempt_id=attempt_id,
    )

    if (
        obligation.status
        != OBLIGATION_STATUS_APPROVED
    ):
        raise RegistrySubmissionAttemptError(
            "Registry obligation must be approved before export"
        )

    if (
        attempt.submitted_at is not None
        or attempt.submitted_by_user_id is not None
        or attempt.result_status is not None
    ):
        raise RegistrySubmissionAttemptError(
            "Registry submission attempt lifecycle does not allow export finalization"
        )

    latest_attempt_no = (
        await session.scalar(
            select(
                func.max(
                    RegistrySubmissionAttempt.attempt_no
                )
            ).where(
                RegistrySubmissionAttempt.obligation_id
                == obligation.id
            )
        )
    )

    if (
        latest_attempt_no is None
        or int(
            attempt.attempt_no
        )
        != int(
            latest_attempt_no
        )
    ):
        raise RegistrySubmissionAttemptError(
            "Only the latest registry submission attempt can be exported"
        )

    validate_registry_attempt_artifact_integrity(
        attempt
    )

    obligation.status = (
        OBLIGATION_STATUS_EXPORTED
    )

    await session.flush()

    return attempt
