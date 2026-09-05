from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Mapping

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
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
