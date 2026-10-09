from __future__ import annotations

import os
from hashlib import sha256
from pathlib import PurePosixPath
from uuid import UUID, uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import (
    RegistrySubmissionBatch,
    RegistrySubmissionBatchItem,
)
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
    validate_registry_approval_current,
)
from app.services.compliance_registry_batches import (
    REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED,
    REGISTRY_SUBMISSION_BATCH_TRANSPORT_FILE,
    RegistrySubmissionBatchError,
    _freeze_batch_snapshot,
    _normalize_generated_by_user_id,
    _validated_stored_fingerprint,
    delete_registry_submission_batch_artifact_safely,
    normalize_batch_obligation_ids,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_APPROVED,
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
    REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD,
    REGISTRY_FRDO,
)
from app.services.document_storage import (
    normalize_relative_storage_path,
    resolve_private_storage_path,
)
from app.services.frdo_po_portal_artifact import (
    FrdoPoPortalArtifactError,
    require_frdo_po_approval_snapshot,
)
from app.services.frdo_po_portal_contract import (
    FRDO_PO_TEMPLATE_CONTRACT_VERSION,
    FrdoPoPortalContractUnavailable,
    read_verified_frdo_po_template_bytes,
)
from app.services.frdo_po_xlsx_formatter import (
    FRDO_PO_BATCH_MAX_RECORDS,
    FrdoPoXlsxFormatterError,
    format_frdo_po_batch_xlsx,
)
from app.services.frdo_po_xlsx_validator import (
    FrdoPoXlsxValidatorError,
    validate_frdo_po_batch_xlsx,
)


def build_frdo_po_batch_artifact_path(batch_id: str) -> str:
    normalized = str(batch_id or "").strip()

    try:
        parsed = UUID(normalized)
    except (ValueError, AttributeError, TypeError) as exc:
        raise RegistrySubmissionBatchError(
            "FRDO batch id must be a UUID"
        ) from exc

    if str(parsed) != normalized.lower():
        raise RegistrySubmissionBatchError(
            "FRDO batch id is not canonical"
        )

    return str(
        PurePosixPath(
            "generated",
            "registry",
            REGISTRY_FRDO,
            "batches",
            normalized + ".xlsx",
        )
    )


def write_frdo_batch_artifact_exclusive(
    storage_path: str,
    content: bytes,
) -> str:
    if not isinstance(content, bytes) or not content:
        raise RegistrySubmissionBatchError(
            "FRDO batch artifact content must be non-empty bytes"
        )

    relative_path = normalize_relative_storage_path(
        storage_path
    )

    absolute_path = resolve_private_storage_path(
        relative_path
    )

    if absolute_path is None:
        raise RegistrySubmissionBatchError(
            "FRDO batch storage path is invalid"
        )

    absolute_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    created = False

    try:
        with absolute_path.open("xb") as handle:
            created = True

            written = handle.write(content)

            if written != len(content):
                raise OSError(
                    "FRDO batch artifact write was incomplete"
                )

            handle.flush()
            os.fsync(handle.fileno())

    except BaseException:
        if created:
            try:
                absolute_path.unlink(missing_ok=True)
            except OSError as cleanup_exc:
                raise RegistrySubmissionBatchError(
                    "FRDO partial artifact cleanup failed"
                ) from cleanup_exc

        raise

    return relative_path

async def _load_frdo_obligations_for_update(
    session: AsyncSession,
    obligation_ids: list[str],
) -> list[RegistryObligation]:
    result = await session.execute(
        select(RegistryObligation)
        .where(RegistryObligation.id.in_(obligation_ids))
        .with_for_update()
    )

    rows = list(result.scalars().all())

    by_id = {
        str(obligation.id): obligation
        for obligation in rows
    }

    missing = [
        obligation_id
        for obligation_id in obligation_ids
        if obligation_id not in by_id
    ]

    if missing:
        raise RegistrySubmissionBatchError(
            "FRDO registry obligations were not found: "
            + ", ".join(missing)
        )

    return [by_id[obligation_id] for obligation_id in obligation_ids]


async def create_frdo_registry_submission_batch(
    session: AsyncSession,
    *,
    obligation_ids: list[str],
    generated_by_user_id: str,
) -> RegistrySubmissionBatch:
    normalized_ids = normalize_batch_obligation_ids(
        obligation_ids
    )

    if len(normalized_ids) > FRDO_PO_BATCH_MAX_RECORDS:
        raise RegistrySubmissionBatchError(
            "FRDO batch cannot contain more than "
            + str(FRDO_PO_BATCH_MAX_RECORDS)
            + " obligations"
        )

    actor_id = _normalize_generated_by_user_id(
        generated_by_user_id
    )

    obligations = await _load_frdo_obligations_for_update(
        session,
        normalized_ids,
    )

    frozen_snapshots: list[dict] = []
    fingerprints: list[str] = []

    for obligation in obligations:
        obligation_id = str(obligation.id)

        if obligation.registry != REGISTRY_FRDO:
            raise RegistrySubmissionBatchError(
                "Non-FRDO obligation in FRDO batch: "
                + obligation_id
            )

        if obligation.status != OBLIGATION_STATUS_APPROVED:
            raise RegistrySubmissionBatchError(
                "FRDO obligation is not approved: "
                + obligation_id
            )

        try:
            await validate_registry_approval_current(
                session,
                obligation=obligation,
            )
        except RegistrySubmissionAttemptError as exc:
            raise RegistrySubmissionBatchError(
                "FRDO approval is stale or invalid for "
                + obligation_id
                + ": "
                + str(exc)
            ) from exc

        snapshot = _freeze_batch_snapshot(
            obligation.approval_snapshot_json
        )

        fingerprint = _validated_stored_fingerprint(
            obligation,
            snapshot,
        )

        try:
            require_frdo_po_approval_snapshot(snapshot)
        except FrdoPoPortalArtifactError as exc:
            raise RegistrySubmissionBatchError(
                "Unsupported FRDO approval snapshot for "
                + obligation_id
                + ": "
                + str(exc)
            ) from exc

        frozen_snapshots.append(snapshot)
        fingerprints.append(fingerprint)

    try:
        template_bytes = read_verified_frdo_po_template_bytes(
            program_type=PROGRAM_TYPE_VOCATIONAL_TRAINING
        )
    except FrdoPoPortalContractUnavailable as exc:
        raise RegistrySubmissionBatchError(
            str(exc)
        ) from exc

    try:
        content = format_frdo_po_batch_xlsx(
            approval_snapshots=frozen_snapshots,
            template_bytes=template_bytes,
        )

        validate_frdo_po_batch_xlsx(
            content=content,
            approval_snapshots=frozen_snapshots,
            template_bytes=template_bytes,
        )
    except (
        FrdoPoXlsxFormatterError,
        FrdoPoXlsxValidatorError,
    ) as exc:
        raise RegistrySubmissionBatchError(
            str(exc)
        ) from exc

    batch_id = str(uuid4())

    artifact_path = build_frdo_po_batch_artifact_path(
        batch_id
    )

    artifact_sha256 = sha256(content).hexdigest()
    saved_path: str | None = None

    try:
        saved_path = write_frdo_batch_artifact_exclusive(
            artifact_path,
            content,
        )

        batch = RegistrySubmissionBatch(
            id=batch_id,
            registry=REGISTRY_FRDO,
            status=REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED,
            artifact_kind=REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD,
            transport=REGISTRY_SUBMISSION_BATCH_TRANSPORT_FILE,
            schema_version=FRDO_PO_TEMPLATE_CONTRACT_VERSION,
            obligation_count=len(obligations),
            record_count=len(obligations),
            artifact_path=saved_path,
            artifact_sha256=artifact_sha256,
            generated_by_user_id=actor_id,
        )

        items = [
            RegistrySubmissionBatchItem(
                batch_id=batch_id,
                obligation_id=str(obligation.id),
                position=position,
                approval_snapshot_json=frozen_snapshots[position],
                approval_fingerprint=fingerprints[position],
                record_count=1,
            )
            for position, obligation in enumerate(obligations)
        ]

        session.add(batch)
        session.add_all(items)

        await session.flush()

    except FileExistsError as exc:
        raise RegistrySubmissionBatchError(
            "FRDO batch storage path already exists"
        ) from exc

    except Exception as exc:
        if saved_path:
            removed = delete_registry_submission_batch_artifact_safely(
                saved_path
            )

            if not removed:
                raise RegistrySubmissionBatchError(
                    "FRDO batch artifact cleanup could not be confirmed"
                ) from exc

        raise

    return batch


async def mark_frdo_registry_submission_batch_submitted(
    session: AsyncSession,
    *,
    batch_id: str,
    submitted_by_user_id: str,
    external_reference: str | None = None,
) -> RegistrySubmissionBatch:
    from datetime import datetime, timezone
    from sqlalchemy import select as sa_select

    from app.models.registry_obligation import RegistryObligation
    from app.services.compliance_registry_approval import (
        fingerprint_registry_approval_snapshot,
    )
    from app.services.compliance_registry_attempts import (
        RegistrySubmissionAttemptError,
        validate_registry_approval_current,
    )
    from app.services.compliance_registry_batches import (
        read_registry_submission_batch_artifact,
    )

    normalized_batch_id = str(batch_id or "").strip()
    actor_id = str(submitted_by_user_id or "").strip()

    if not normalized_batch_id:
        raise RegistrySubmissionBatchError(
            "FRDO batch id is required"
        )

    if not actor_id:
        raise RegistrySubmissionBatchError(
            "FRDO submission actor is required"
        )

    if external_reference is not None and not isinstance(
        external_reference, str
    ):
        raise RegistrySubmissionBatchError(
            "FRDO external reference must be text"
        )

    normalized_reference = (
        external_reference.strip()
        if external_reference is not None
        else None
    )

    if not normalized_reference:
        normalized_reference = None

    if normalized_reference is not None:
        if len(normalized_reference) > 255:
            raise RegistrySubmissionBatchError(
                "FRDO external reference is too long"
            )

        if any(ord(char) < 32 or ord(char) == 127
               for char in normalized_reference):
            raise RegistrySubmissionBatchError(
                "FRDO external reference contains control characters"
            )

    batch = await session.scalar(
        sa_select(RegistrySubmissionBatch)
        .where(
            RegistrySubmissionBatch.id == normalized_batch_id,
            RegistrySubmissionBatch.registry == REGISTRY_FRDO,
        )
        .with_for_update()
    )

    if batch is None or batch.registry != REGISTRY_FRDO:
        raise RegistrySubmissionBatchError(
            "FRDO submission batch not found"
        )

    if batch.status != REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED:
        raise RegistrySubmissionBatchError(
            "FRDO batch must be exported before submission"
        )

    if (
        batch.submitted_at is not None
        or batch.submitted_by_user_id is not None
    ):
        raise RegistrySubmissionBatchError(
            "FRDO submission already recorded"
        )

    if (
        batch.imported_at is not None
        or batch.imported_by_user_id is not None
    ):
        raise RegistrySubmissionBatchError(
            "FRDO batch has invalid import metadata"
        )

    # Recheck stored content and SHA256 before recording submission.
    read_registry_submission_batch_artifact(batch)

    item_result = await session.scalars(
        sa_select(RegistrySubmissionBatchItem)
        .where(
            RegistrySubmissionBatchItem.batch_id == batch.id
        )
        .order_by(RegistrySubmissionBatchItem.position)
        .with_for_update()
    )

    items = list(item_result.all())

    if (
        not items
        or len(items) > 1001
        or len(items) != int(batch.obligation_count)
        or len(items) != int(batch.record_count)
    ):
        raise RegistrySubmissionBatchError(
            "FRDO batch item count is inconsistent"
        )

    ids = [str(item.obligation_id) for item in items]

    if len(ids) != len(set(ids)):
        raise RegistrySubmissionBatchError(
            "FRDO batch contains duplicate obligations"
        )

    for index, item in enumerate(items):
        if (
            item.position != index
            or item.record_count != 1
            or item.result_status is not None
        ):
            raise RegistrySubmissionBatchError(
                "FRDO batch item metadata is inconsistent"
            )

    obligation_result = await session.scalars(
        sa_select(RegistryObligation)
        .where(RegistryObligation.id.in_(ids))
        .order_by(RegistryObligation.id)
        .with_for_update()
    )

    obligations = {
        str(obligation.id): obligation
        for obligation in obligation_result.all()
    }

    if len(obligations) != len(items):
        raise RegistrySubmissionBatchError(
            "FRDO batch obligation set is incomplete"
        )

    # Validate everything BEFORE changing any lifecycle state.
    for item in items:
        obligation = obligations[str(item.obligation_id)]

        if (
            obligation.registry != REGISTRY_FRDO
            or obligation.status != "approved"
        ):
            raise RegistrySubmissionBatchError(
                "FRDO obligation is not approved: "
                + str(obligation.id)
            )

        snapshot = item.approval_snapshot_json

        if not isinstance(snapshot, dict) or not snapshot:
            raise RegistrySubmissionBatchError(
                "FRDO batch frozen snapshot is missing"
            )

        snapshot_fingerprint = (
            fingerprint_registry_approval_snapshot(snapshot)
        )

        if (
            snapshot_fingerprint != item.approval_fingerprint
            or snapshot_fingerprint != obligation.approval_fingerprint
        ):
            raise RegistrySubmissionBatchError(
                "FRDO batch frozen approval does not match "
                "current obligation: " + str(obligation.id)
            )

        try:
            await validate_registry_approval_current(
                session,
                obligation=obligation,
            )
        except RegistrySubmissionAttemptError as exc:
            raise RegistrySubmissionBatchError(
                "FRDO approval is no longer current: "
                + str(obligation.id)
            ) from exc

    submitted_at = datetime.now(timezone.utc)

    for obligation in obligations.values():
        obligation.status = "submitted"
        obligation.submitted_at = submitted_at
        obligation.accepted_at = None
        obligation.external_id = None
        obligation.last_error = None

    batch.status = "submitted"
    batch.submitted_by_user_id = actor_id
    batch.submitted_at = submitted_at
    batch.external_reference = normalized_reference

    await session.flush()

    return batch

async def record_frdo_registry_submission_batch_results(
    session: AsyncSession,
    *,
    batch_id: str,
    recorded_by_user_id: str,
    results: list[dict[str, object]],
) -> tuple[
    RegistrySubmissionBatch,
    list[RegistrySubmissionBatchItem],
]:
    from datetime import datetime, timezone

    from sqlalchemy import select as sa_select

    from app.models.registry_obligation import RegistryObligation
    from app.services.compliance_registry_approval import (
        fingerprint_registry_approval_snapshot,
    )
    from app.services.compliance_registry_batches import (
        normalize_batch_result_items,
        read_registry_submission_batch_artifact,
    )

    actor_id = str(recorded_by_user_id or "").strip()
    normalized_batch_id = str(batch_id or "").strip()

    if not actor_id or not normalized_batch_id:
        raise RegistrySubmissionBatchError(
            "FRDO batch id and result actor are required"
        )

    normalized = normalize_batch_result_items(results)

    if len(normalized) > 1001:
        raise RegistrySubmissionBatchError(
            "FRDO batch result exceeds 1001 entries"
        )

    incoming = {
        str(entry["obligation_id"]): entry
        for entry in normalized
    }

    batch = await session.scalar(
        sa_select(RegistrySubmissionBatch)
        .where(
            RegistrySubmissionBatch.id == normalized_batch_id,
            RegistrySubmissionBatch.registry == REGISTRY_FRDO,
        )
        .with_for_update()
    )

    if batch is None or batch.registry != REGISTRY_FRDO:
        raise RegistrySubmissionBatchError(
            "FRDO submission batch not found"
        )

    if batch.status != "submitted":
        raise RegistrySubmissionBatchError(
            "FRDO batch must be submitted before recording results"
        )

    if (
        batch.submitted_at is None
        or batch.submitted_by_user_id is None
    ):
        raise RegistrySubmissionBatchError(
            "FRDO batch submission metadata is incomplete"
        )

    if (
        batch.reconciled_at is not None
        or batch.reconciled_by_user_id is not None
    ):
        raise RegistrySubmissionBatchError(
            "FRDO batch results are already fully recorded"
        )

    read_registry_submission_batch_artifact(batch)

    result = await session.scalars(
        sa_select(RegistrySubmissionBatchItem)
        .where(RegistrySubmissionBatchItem.batch_id == batch.id)
        .order_by(RegistrySubmissionBatchItem.position)
        .with_for_update()
    )

    items = list(result.all())

    if (
        not items
        or len(items) > 1001
        or len(items) != int(batch.obligation_count)
        or len(items) != int(batch.record_count)
    ):
        raise RegistrySubmissionBatchError(
            "FRDO batch item count is inconsistent"
        )

    expected_ids = [
        str(item.obligation_id)
        for item in items
    ]

    if len(set(expected_ids)) != len(expected_ids):
        raise RegistrySubmissionBatchError(
            "FRDO batch has duplicate obligations"
        )

    if not set(incoming).issubset(set(expected_ids)):
        raise RegistrySubmissionBatchError(
            "FRDO results contain an obligation outside this batch"
        )

    obligation_result = await session.scalars(
        sa_select(RegistryObligation)
        .where(RegistryObligation.id.in_(expected_ids))
        .order_by(RegistryObligation.id)
        .with_for_update()
    )

    obligations = {
        str(obligation.id): obligation
        for obligation in obligation_result.all()
    }

    if len(obligations) != len(items):
        raise RegistrySubmissionBatchError(
            "FRDO batch obligation set is incomplete"
        )

    pending_count = 0

    # All checks happen before any data mutation.
    for position, item in enumerate(items):
        obligation_id = str(item.obligation_id)
        obligation = obligations[obligation_id]

        if (
            item.position != position
            or item.record_count != 1
            or obligation.registry != REGISTRY_FRDO
        ):
            raise RegistrySubmissionBatchError(
                "FRDO batch item metadata is inconsistent"
            )

        snapshot = item.approval_snapshot_json

        if not isinstance(snapshot, dict) or not snapshot:
            raise RegistrySubmissionBatchError(
                "FRDO batch frozen snapshot is missing"
            )

        if fingerprint_registry_approval_snapshot(
            snapshot
        ) != item.approval_fingerprint:
            raise RegistrySubmissionBatchError(
                "FRDO batch frozen snapshot fingerprint mismatch"
            )

        already_recorded = item.result_status is not None

        if already_recorded:
            if (
                item.result_recorded_at is None
                or item.result_recorded_by_user_id is None
                or obligation.status != item.result_status
            ):
                raise RegistrySubmissionBatchError(
                    "FRDO previously recorded result is inconsistent"
                )

            if obligation_id in incoming:
                raise RegistrySubmissionBatchError(
                    "FRDO result already recorded: " + obligation_id
                )

        else:
            pending_count += 1

            if (
                item.result_recorded_at is not None
                or item.result_recorded_by_user_id is not None
                or item.external_id is not None
                or bool(item.errors_json)
            ):
                raise RegistrySubmissionBatchError(
                    "FRDO pending result has inconsistent metadata"
                )

            if obligation.status != "submitted":
                raise RegistrySubmissionBatchError(
                    "FRDO pending obligation must be submitted: "
                    + obligation_id
                )

    if pending_count == 0:
        raise RegistrySubmissionBatchError(
            "FRDO batch has no pending results"
        )

    recorded_at = datetime.now(timezone.utc)

    for item in items:
        obligation_id = str(item.obligation_id)

        if obligation_id not in incoming:
            continue

        entry = incoming[obligation_id]
        obligation = obligations[obligation_id]

        result_status = str(entry["result_status"])
        external_id = entry["external_id"]
        errors = list(entry["errors"])

        item.result_status = result_status
        item.external_id = external_id
        item.errors_json = errors
        item.result_recorded_by_user_id = actor_id
        item.result_recorded_at = recorded_at

        obligation.status = result_status

        if result_status == "accepted":
            obligation.external_id = external_id
            obligation.accepted_at = recorded_at
            obligation.last_error = None

        else:
            obligation.external_id = None
            obligation.accepted_at = None
            obligation.last_error = (
                "; ".join(errors)[:1000]
                if errors
                else None
            )

    remaining = sum(
        item.result_status is None
        for item in items
    )

    if remaining == 0:
        batch.reconciled_by_user_id = actor_id
        batch.reconciled_at = recorded_at

    await session.flush()

    return batch, items
