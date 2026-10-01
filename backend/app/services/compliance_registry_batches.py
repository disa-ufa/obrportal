from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import datetime, timezone
from hashlib import sha256
from pathlib import PurePosixPath
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import (
    RegistrySubmissionBatch,
    RegistrySubmissionBatchItem,
)
from app.services.compliance_registry_approval import (
    fingerprint_registry_approval_snapshot,
)
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
    freeze_registry_snapshot,
    normalize_registry_external_id,
    normalize_registry_external_reference,
    normalize_registry_result_errors,
    validate_registry_approval_current,
)
from app.services.compliance_registry_contract import (
    OBLIGATION_STATUS_ACCEPTED,
    OBLIGATION_STATUS_APPROVED,
    OBLIGATION_STATUS_CORRECTION_REQUIRED,
    OBLIGATION_STATUS_EXPORTED,
    OBLIGATION_STATUS_REJECTED,
    OBLIGATION_STATUS_SUBMITTED,
    REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD,
    REGISTRY_MINTRUD,
)
from app.services.document_storage import (
    delete_private_storage_file,
    resolve_private_storage_path,
    write_private_storage_file_exclusive,
)
from app.services.mintrud_eisot_xml import (
    MINTRUD_EISOT_XML_CONTRACT_VERSION,
    MINTRUD_EISOT_XML_MAX_RECORDS,
    MintrudEisotXmlError,
    serialize_mintrud_eisot_batch_xml_v109,
)
from app.services.mintrud_eisot_xsd import (
    MintrudEisotXsdValidationError,
    validate_mintrud_eisot_xml_v109,
)


REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED = "exported"
REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED = "imported"
REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED = "submitted"
REGISTRY_SUBMISSION_BATCH_TRANSPORT_FILE = "file"
MINTRUD_SUBMISSION_BATCH_EXTENSION = ".xml"

REGISTRY_SUBMISSION_BATCH_RESULT_STATUSES = frozenset(
    {
        OBLIGATION_STATUS_ACCEPTED,
        OBLIGATION_STATUS_REJECTED,
        OBLIGATION_STATUS_CORRECTION_REQUIRED,
    }
)


class RegistrySubmissionBatchError(ValueError):
    """Raised when a Mintrud submission batch cannot be prepared."""


def normalize_batch_obligation_ids(
    value: object,
) -> list[str]:
    if (
        not isinstance(
            value,
            Sequence,
        )
        or isinstance(
            value,
            (
                str,
                bytes,
                bytearray,
            ),
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry batch obligation_ids must be a sequence"
        )

    normalized: list[str] = []
    seen: set[str] = set()

    for index, raw_value in enumerate(
        value
    ):
        obligation_id = str(
            raw_value
            or ""
        ).strip()

        if not obligation_id:
            raise RegistrySubmissionBatchError(
                "Registry batch obligation id at position "
                + str(index)
                + " is required"
            )

        if obligation_id in seen:
            raise RegistrySubmissionBatchError(
                "Duplicate registry batch obligation id: "
                + obligation_id
            )

        seen.add(
            obligation_id
        )

        normalized.append(
            obligation_id
        )

    if not normalized:
        raise RegistrySubmissionBatchError(
            "At least one registry obligation is required"
        )

    return normalized


def _normalize_generated_by_user_id(
    value: object,
) -> str:
    normalized = str(
        value
        or ""
    ).strip()

    if not normalized:
        raise RegistrySubmissionBatchError(
            "Registry batch generator user id is required"
        )

    return normalized


def _freeze_batch_snapshot(
    value: object,
) -> dict:
    if (
        not isinstance(
            value,
            Mapping,
        )
        or not value
    ):
        raise RegistrySubmissionBatchError(
            "Registry approval snapshot is missing"
        )

    try:
        return freeze_registry_snapshot(
            value
        )

    except RegistrySubmissionAttemptError as exc:
        raise RegistrySubmissionBatchError(
            str(exc)
        ) from exc


def _snapshot_record_count(
    snapshot: Mapping,
) -> int:
    programs = snapshot.get(
        "mintrud_learn_programs"
    )

    if (
        not isinstance(
            programs,
            Sequence,
        )
        or isinstance(
            programs,
            (
                str,
                bytes,
                bytearray,
            ),
        )
    ):
        raise RegistrySubmissionBatchError(
            "Approved Mintrud snapshot learn programs "
            "must be a sequence"
        )

    count = len(
        programs
    )

    if count < 1:
        raise RegistrySubmissionBatchError(
            "Approved Mintrud snapshot must contain "
            "at least one learn program"
        )

    return count


def _validated_stored_fingerprint(
    obligation: RegistryObligation,
    snapshot: Mapping,
) -> str:
    stored_raw = getattr(
        obligation,
        "approval_fingerprint",
        None,
    )

    stored = str(
        stored_raw
        or ""
    ).strip().lower()

    if not stored:
        raise RegistrySubmissionBatchError(
            "Registry approval fingerprint is missing"
        )

    computed = (
        fingerprint_registry_approval_snapshot(
            snapshot
        )
    )

    if stored != computed:
        raise RegistrySubmissionBatchError(
            "Registry approval snapshot fingerprint mismatch"
        )

    return stored


def build_registry_submission_batch_artifact_path(
    batch_id: str,
) -> str:
    normalized_batch_id = str(
        batch_id
        or ""
    ).strip()

    if not normalized_batch_id:
        raise RegistrySubmissionBatchError(
            "Registry submission batch id is required"
        )

    return str(
        PurePosixPath(
            "generated",
            "registry",
            REGISTRY_MINTRUD,
            "batches",
            normalized_batch_id
            + MINTRUD_SUBMISSION_BATCH_EXTENSION,
        )
    )


def delete_registry_submission_batch_artifact_safely(
    storage_path: str | None,
) -> bool:
    if not storage_path:
        return False

    try:
        return delete_private_storage_file(
            storage_path
        )

    except OSError:
        return False


def read_registry_submission_batch_artifact(
    batch: RegistrySubmissionBatch,
) -> bytes:
    storage_path = str(
        getattr(
            batch,
            "artifact_path",
            None,
        )
        or ""
    ).strip()

    expected_sha256 = str(
        getattr(
            batch,
            "artifact_sha256",
            None,
        )
        or ""
    ).strip().lower()

    if (
        not storage_path
        or not expected_sha256
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch has no attached artifact"
        )

    absolute_path = (
        resolve_private_storage_path(
            storage_path
        )
    )

    if (
        absolute_path is None
        or not absolute_path.exists()
        or not absolute_path.is_file()
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch artifact file is missing"
        )

    content = absolute_path.read_bytes()

    actual_sha256 = sha256(
        content
    ).hexdigest()

    if actual_sha256 != expected_sha256:
        raise RegistrySubmissionBatchError(
            "Registry submission batch artifact checksum mismatch"
        )

    return content


async def _load_mintrud_obligations_for_update(
    session: AsyncSession,
    obligation_ids: list[str],
) -> list[RegistryObligation]:
    result = await session.execute(
        select(
            RegistryObligation
        )
        .where(
            RegistryObligation.id.in_(
                obligation_ids
            )
        )
        .with_for_update()
    )

    rows = list(
        result.scalars().all()
    )

    by_id = {
        str(
            obligation.id
        ): obligation
        for obligation in rows
    }

    missing = [
        obligation_id
        for obligation_id
        in obligation_ids
        if obligation_id
        not in by_id
    ]

    if missing:
        raise RegistrySubmissionBatchError(
            "Registry obligations were not found: "
            + ", ".join(
                missing
            )
        )

    return [
        by_id[
            obligation_id
        ]
        for obligation_id
        in obligation_ids
    ]


async def create_mintrud_registry_submission_batch(
    session: AsyncSession,
    *,
    obligation_ids: Sequence[str],
    generated_by_user_id: str,
) -> RegistrySubmissionBatch:
    normalized_ids = (
        normalize_batch_obligation_ids(
            obligation_ids
        )
    )

    actor_id = (
        _normalize_generated_by_user_id(
            generated_by_user_id
        )
    )

    obligations = (
        await _load_mintrud_obligations_for_update(
            session,
            normalized_ids,
        )
    )

    frozen_snapshots: list[dict] = []
    fingerprints: list[str] = []
    item_record_counts: list[int] = []
    total_record_count = 0

    for obligation in obligations:
        if (
            obligation.registry
            != REGISTRY_MINTRUD
        ):
            raise RegistrySubmissionBatchError(
                "Registry submission batch supports "
                "Mintrud obligations only"
            )

        try:
            await validate_registry_approval_current(
                session,
                obligation=obligation,
            )

        except RegistrySubmissionAttemptError as exc:
            raise RegistrySubmissionBatchError(
                "Registry approval validation failed for obligation "
                + str(
                    obligation.id
                )
                + ": "
                + str(exc)
            ) from exc

        snapshot = (
            _freeze_batch_snapshot(
                obligation.approval_snapshot_json
            )
        )

        fingerprint = (
            _validated_stored_fingerprint(
                obligation,
                snapshot,
            )
        )

        item_record_count = (
            _snapshot_record_count(
                snapshot
            )
        )

        total_record_count += (
            item_record_count
        )

        if (
            total_record_count
            > MINTRUD_EISOT_XML_MAX_RECORDS
        ):
            raise RegistrySubmissionBatchError(
                "Mintrud registry submission batch "
                "cannot contain more than "
                + str(
                    MINTRUD_EISOT_XML_MAX_RECORDS
                )
                + " RegistryRecord elements"
            )

        frozen_snapshots.append(
            snapshot
        )

        fingerprints.append(
            fingerprint
        )

        item_record_counts.append(
            item_record_count
        )

    try:
        export_content = (
            serialize_mintrud_eisot_batch_xml_v109(
                frozen_snapshots
            )
        )

        validate_mintrud_eisot_xml_v109(
            export_content
        )

    except (
        MintrudEisotXmlError,
        MintrudEisotXsdValidationError,
    ) as exc:
        raise RegistrySubmissionBatchError(
            str(exc)
        ) from exc

    if (
        total_record_count < 1
        or total_record_count
        > MINTRUD_EISOT_XML_MAX_RECORDS
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch record count "
            "is outside the supported range"
        )

    batch_id = str(
        uuid4()
    )

    artifact_path = (
        build_registry_submission_batch_artifact_path(
            batch_id
        )
    )

    artifact_sha256 = sha256(
        export_content
    ).hexdigest()

    saved_path: str | None = None

    try:
        saved_path = (
            write_private_storage_file_exclusive(
                artifact_path,
                export_content,
            )
        )

        batch = RegistrySubmissionBatch(
            id=batch_id,
            registry=REGISTRY_MINTRUD,
            status=(
                REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
            ),
            artifact_kind=(
                REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD
            ),
            transport=(
                REGISTRY_SUBMISSION_BATCH_TRANSPORT_FILE
            ),
            schema_version=(
                MINTRUD_EISOT_XML_CONTRACT_VERSION
            ),
            obligation_count=len(
                obligations
            ),
            record_count=(
                total_record_count
            ),
            artifact_path=(
                saved_path
            ),
            artifact_sha256=(
                artifact_sha256
            ),
            generated_by_user_id=(
                actor_id
            ),
        )

        items = [
            RegistrySubmissionBatchItem(
                batch_id=batch_id,
                obligation_id=str(
                    obligation.id
                ),
                position=position,
                approval_snapshot_json=(
                    frozen_snapshots[
                        position
                    ]
                ),
                approval_fingerprint=(
                    fingerprints[
                        position
                    ]
                ),
                record_count=(
                    item_record_counts[
                        position
                    ]
                ),
            )
            for position, obligation
            in enumerate(
                obligations
            )
        ]

        session.add(
            batch
        )

        session.add_all(
            items
        )

        await session.flush()

    except FileExistsError as exc:
        raise RegistrySubmissionBatchError(
            "Registry submission batch artifact "
            "storage path already exists"
        ) from exc

    except Exception:
        if saved_path:
            delete_registry_submission_batch_artifact_safely(
                saved_path
            )

        raise

    return batch


def _normalize_batch_lifecycle_actor_user_id(
    value: object,
) -> str:
    normalized = str(
        value
        or ""
    ).strip()

    if not normalized:
        raise RegistrySubmissionBatchError(
            "Registry batch lifecycle actor is required"
        )

    return normalized


def _normalize_batch_external_reference(
    value: str | None,
) -> str | None:
    try:
        return normalize_registry_external_reference(
            value
        )

    except RegistrySubmissionAttemptError as exc:
        raise RegistrySubmissionBatchError(
            str(exc)
        ) from exc


def _normalize_batch_id(
    value: object,
) -> str:
    normalized = str(
        value
        or ""
    ).strip()

    if not normalized:
        raise RegistrySubmissionBatchError(
            "Registry submission batch id is required"
        )

    return normalized


async def _load_mintrud_batch_for_update(
    session: AsyncSession,
    *,
    batch_id: str,
) -> RegistrySubmissionBatch:
    normalized_batch_id = (
        _normalize_batch_id(
            batch_id
        )
    )

    batch = await session.scalar(
        select(
            RegistrySubmissionBatch
        )
        .where(
            RegistrySubmissionBatch.id
            == normalized_batch_id,
            RegistrySubmissionBatch.registry
            == REGISTRY_MINTRUD,
        )
        .with_for_update()
    )

    if batch is None:
        raise RegistrySubmissionBatchError(
            "Mintrud submission batch was not found"
        )

    return batch


async def _load_batch_items_for_update(
    session: AsyncSession,
    *,
    batch_id: str,
) -> list[RegistrySubmissionBatchItem]:
    result = await session.execute(
        select(
            RegistrySubmissionBatchItem
        )
        .where(
            RegistrySubmissionBatchItem.batch_id
            == batch_id
        )
        .order_by(
            RegistrySubmissionBatchItem.position.asc()
        )
        .with_for_update()
    )

    return list(
        result.scalars().all()
    )


async def _load_batch_items_and_obligations_for_update(
    session: AsyncSession,
    *,
    batch: RegistrySubmissionBatch,
) -> tuple[
    list[RegistrySubmissionBatchItem],
    list[RegistryObligation],
]:
    items = (
        await _load_batch_items_for_update(
            session,
            batch_id=str(
                batch.id
            ),
        )
    )

    if (
        len(items)
        != int(
            batch.obligation_count
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch item count mismatch"
        )

    if not items:
        raise RegistrySubmissionBatchError(
            "Registry submission batch has no items"
        )

    item_record_count = sum(
        int(
            item.record_count
        )
        for item in items
    )

    if (
        item_record_count
        != int(
            batch.record_count
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch record count mismatch"
        )

    obligation_ids = [
        str(
            item.obligation_id
        )
        for item in items
    ]

    obligations = (
        await _load_mintrud_obligations_for_update(
            session,
            obligation_ids,
        )
    )

    return (
        items,
        obligations,
    )


def _validate_batch_item_matches_obligation(
    *,
    item: RegistrySubmissionBatchItem,
    obligation: RegistryObligation,
) -> None:
    if (
        str(
            item.obligation_id
        )
        != str(
            obligation.id
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch item obligation mismatch"
        )

    if (
        obligation.registry
        != REGISTRY_MINTRUD
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch supports "
            "Mintrud obligations only"
        )

    item_snapshot = (
        _freeze_batch_snapshot(
            item.approval_snapshot_json
        )
    )

    item_fingerprint = str(
        item.approval_fingerprint
        or ""
    ).strip().lower()

    if not item_fingerprint:
        raise RegistrySubmissionBatchError(
            "Registry submission batch item "
            "approval fingerprint is missing"
        )

    computed_item_fingerprint = (
        fingerprint_registry_approval_snapshot(
            item_snapshot
        )
    )

    if (
        item_fingerprint
        != computed_item_fingerprint
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch item "
            "approval fingerprint mismatch"
        )

    obligation_snapshot = (
        _freeze_batch_snapshot(
            obligation.approval_snapshot_json
        )
    )

    obligation_fingerprint = (
        _validated_stored_fingerprint(
            obligation,
            obligation_snapshot,
        )
    )

    if (
        obligation_fingerprint
        != item_fingerprint
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch approval "
            "fingerprint no longer matches obligation"
        )

    if (
        obligation_snapshot
        != item_snapshot
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch approval "
            "snapshot no longer matches obligation"
        )

    expected_record_count = (
        _snapshot_record_count(
            item_snapshot
        )
    )

    if (
        int(
            item.record_count
        )
        != expected_record_count
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch item "
            "record count mismatch"
        )


async def mark_mintrud_registry_submission_batch_imported(
    session: AsyncSession,
    *,
    batch_id: str,
    imported_by_user_id: str,
) -> RegistrySubmissionBatch:
    actor_id = (
        _normalize_batch_lifecycle_actor_user_id(
            imported_by_user_id
        )
    )

    batch = (
        await _load_mintrud_batch_for_update(
            session,
            batch_id=batch_id,
        )
    )

    if (
        batch.status
        != REGISTRY_SUBMISSION_BATCH_STATUS_EXPORTED
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch must be "
            "exported before confirming import"
        )

    if (
        batch.imported_at is not None
        or batch.imported_by_user_id is not None
        or batch.submitted_at is not None
        or batch.submitted_by_user_id is not None
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch lifecycle "
            "does not allow import confirmation"
        )

    read_registry_submission_batch_artifact(
        batch
    )

    (
        items,
        obligations,
    ) = (
        await _load_batch_items_and_obligations_for_update(
            session,
            batch=batch,
        )
    )

    for item, obligation in zip(
        items,
        obligations,
        strict=True,
    ):
        if (
            obligation.status
            != OBLIGATION_STATUS_APPROVED
        ):
            raise RegistrySubmissionBatchError(
                "Registry obligation must be approved "
                "before confirming batch import: "
                + str(
                    obligation.id
                )
            )

        try:
            await validate_registry_approval_current(
                session,
                obligation=obligation,
            )

        except RegistrySubmissionAttemptError as exc:
            raise RegistrySubmissionBatchError(
                "Registry approval validation failed for obligation "
                + str(
                    obligation.id
                )
                + ": "
                + str(exc)
            ) from exc

        _validate_batch_item_matches_obligation(
            item=item,
            obligation=obligation,
        )

    imported_at = datetime.now(
        timezone.utc
    )

    for obligation in obligations:
        obligation.status = (
            OBLIGATION_STATUS_EXPORTED
        )

    batch.status = (
        REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
    )

    batch.imported_by_user_id = (
        actor_id
    )

    batch.imported_at = (
        imported_at
    )

    await session.flush()

    return batch


async def mark_mintrud_registry_submission_batch_submitted(
    session: AsyncSession,
    *,
    batch_id: str,
    submitted_by_user_id: str,
    external_reference: str | None = None,
) -> RegistrySubmissionBatch:
    actor_id = (
        _normalize_batch_lifecycle_actor_user_id(
            submitted_by_user_id
        )
    )

    normalized_reference = (
        _normalize_batch_external_reference(
            external_reference
        )
    )

    batch = (
        await _load_mintrud_batch_for_update(
            session,
            batch_id=batch_id,
        )
    )

    if (
        batch.status
        != REGISTRY_SUBMISSION_BATCH_STATUS_IMPORTED
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch must be "
            "imported before confirming submission"
        )

    if (
        batch.imported_at is None
        or batch.imported_by_user_id is None
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch import "
            "metadata is incomplete"
        )

    if (
        batch.submitted_at is not None
        or batch.submitted_by_user_id is not None
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch is already submitted"
        )

    read_registry_submission_batch_artifact(
        batch
    )

    (
        items,
        obligations,
    ) = (
        await _load_batch_items_and_obligations_for_update(
            session,
            batch=batch,
        )
    )

    for item, obligation in zip(
        items,
        obligations,
        strict=True,
    ):
        if (
            obligation.status
            != OBLIGATION_STATUS_EXPORTED
        ):
            raise RegistrySubmissionBatchError(
                "Registry obligation must be exported "
                "before confirming batch submission: "
                + str(
                    obligation.id
                )
            )

        _validate_batch_item_matches_obligation(
            item=item,
            obligation=obligation,
        )

    submitted_at = datetime.now(
        timezone.utc
    )

    for obligation in obligations:
        obligation.status = (
            OBLIGATION_STATUS_SUBMITTED
        )

        obligation.submitted_at = (
            submitted_at
        )

        obligation.accepted_at = None
        obligation.external_id = None
        obligation.last_error = None

    batch.status = (
        REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
    )

    batch.submitted_by_user_id = (
        actor_id
    )

    batch.submitted_at = (
        submitted_at
    )

    batch.external_reference = (
        normalized_reference
    )

    await session.flush()

    return batch




def normalize_batch_result_items(
    value: object,
) -> list[dict[str, object]]:
    if (
        not isinstance(
            value,
            Sequence,
        )
        or isinstance(
            value,
            (
                str,
                bytes,
                bytearray,
            ),
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry batch result items must be a sequence"
        )

    normalized: list[dict[str, object]] = []
    seen: set[str] = set()

    for index, raw_item in enumerate(
        value
    ):
        if not isinstance(
            raw_item,
            Mapping,
        ):
            raise RegistrySubmissionBatchError(
                "Registry batch result item at position "
                + str(index)
                + " must be a mapping"
            )

        obligation_id = str(
            raw_item.get(
                "obligation_id"
            )
            or ""
        ).strip()

        if not obligation_id:
            raise RegistrySubmissionBatchError(
                "Registry batch result obligation id at position "
                + str(index)
                + " is required"
            )

        if obligation_id in seen:
            raise RegistrySubmissionBatchError(
                "Duplicate registry batch result obligation id: "
                + obligation_id
            )

        result_status = str(
            raw_item.get(
                "result_status"
            )
            or ""
        ).strip()

        if (
            result_status
            not in REGISTRY_SUBMISSION_BATCH_RESULT_STATUSES
        ):
            raise RegistrySubmissionBatchError(
                "Unsupported registry batch result status"
            )

        try:
            external_id = (
                normalize_registry_external_id(
                    raw_item.get(
                        "external_id"
                    )
                )
            )

            errors = (
                normalize_registry_result_errors(
                    raw_item.get(
                        "errors"
                    )
                )
            )

        except RegistrySubmissionAttemptError as exc:
            raise RegistrySubmissionBatchError(
                str(exc)
            ) from exc

        if (
            result_status
            == OBLIGATION_STATUS_ACCEPTED
            and errors
        ):
            raise RegistrySubmissionBatchError(
                "Accepted registry batch result "
                "must not contain errors"
            )

        if (
            result_status
            != OBLIGATION_STATUS_ACCEPTED
            and external_id is not None
        ):
            raise RegistrySubmissionBatchError(
                "Registry batch external id is allowed "
                "only for accepted result"
            )

        seen.add(
            obligation_id
        )

        normalized.append(
            {
                "obligation_id": obligation_id,
                "result_status": result_status,
                "external_id": external_id,
                "errors": errors,
            }
        )

    if not normalized:
        raise RegistrySubmissionBatchError(
            "Registry batch result must contain at least one item"
        )

    return normalized


async def get_mintrud_registry_submission_batch_detail(
    session: AsyncSession,
    *,
    batch_id: str,
) -> tuple[
    RegistrySubmissionBatch,
    list[RegistrySubmissionBatchItem],
] | None:
    normalized_batch_id = (
        _normalize_batch_id(
            batch_id
        )
    )

    batch = await session.scalar(
        select(
            RegistrySubmissionBatch
        )
        .where(
            RegistrySubmissionBatch.id
            == normalized_batch_id,
            RegistrySubmissionBatch.registry
            == REGISTRY_MINTRUD,
        )
    )

    if batch is None:
        return None

    result = await session.execute(
        select(
            RegistrySubmissionBatchItem
        )
        .where(
            RegistrySubmissionBatchItem.batch_id
            == normalized_batch_id
        )
        .order_by(
            RegistrySubmissionBatchItem.position.asc()
        )
    )

    items = list(
        result.scalars().all()
    )

    if (
        len(items)
        != int(
            batch.obligation_count
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch item count mismatch"
        )

    return (
        batch,
        items,
    )


async def record_mintrud_registry_submission_batch_result(
    session: AsyncSession,
    *,
    batch_id: str,
    recorded_by_user_id: str,
    results: Sequence[Mapping[str, object]],
) -> tuple[
    RegistrySubmissionBatch,
    list[RegistrySubmissionBatchItem],
]:
    actor_id = (
        _normalize_batch_lifecycle_actor_user_id(
            recorded_by_user_id
        )
    )

    normalized_results = (
        normalize_batch_result_items(
            results
        )
    )

    batch = (
        await _load_mintrud_batch_for_update(
            session,
            batch_id=batch_id,
        )
    )

    if (
        batch.status
        != REGISTRY_SUBMISSION_BATCH_STATUS_SUBMITTED
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch must be "
            "submitted before recording results"
        )

    if (
        batch.submitted_at is None
        or batch.submitted_by_user_id is None
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch submission "
            "metadata is incomplete"
        )

    if (
        batch.reconciled_at is not None
        or batch.reconciled_by_user_id is not None
    ):
        raise RegistrySubmissionBatchError(
            "Registry submission batch results "
            "are already recorded"
        )

    (
        items,
        obligations,
    ) = (
        await _load_batch_items_and_obligations_for_update(
            session,
            batch=batch,
        )
    )

    normalized_by_obligation = {
        str(
            item[
                "obligation_id"
            ]
        ): item
        for item in normalized_results
    }

    expected_ids = [
        str(
            item.obligation_id
        )
        for item in items
    ]

    if (
        len(normalized_results)
        != len(items)
        or set(
            normalized_by_obligation
        )
        != set(
            expected_ids
        )
    ):
        raise RegistrySubmissionBatchError(
            "Registry batch result payload must cover "
            "every batch item exactly once"
        )

    for item, obligation in zip(
        items,
        obligations,
        strict=True,
    ):
        obligation_id = str(
            obligation.id
        )

        if (
            str(
                item.obligation_id
            )
            != obligation_id
        ):
            raise RegistrySubmissionBatchError(
                "Registry submission batch item "
                "obligation mismatch"
            )

        if (
            obligation.status
            != OBLIGATION_STATUS_SUBMITTED
        ):
            raise RegistrySubmissionBatchError(
                "Registry obligation must be submitted "
                "before recording batch result: "
                + obligation_id
            )

        if (
            item.result_status is not None
            or item.external_id is not None
            or item.result_recorded_by_user_id is not None
            or item.result_recorded_at is not None
            or list(
                item.errors_json
                or []
            )
        ):
            raise RegistrySubmissionBatchError(
                "Registry submission batch item "
                "already has result data: "
                + obligation_id
            )

        if (
            obligation_id
            not in normalized_by_obligation
        ):
            raise RegistrySubmissionBatchError(
                "Registry batch result item is missing: "
                + obligation_id
            )

    reconciled_at = datetime.now(
        timezone.utc
    )

    for item, obligation in zip(
        items,
        obligations,
        strict=True,
    ):
        result = (
            normalized_by_obligation[
                str(
                    obligation.id
                )
            ]
        )

        result_status = str(
            result[
                "result_status"
            ]
        )

        external_id = result[
            "external_id"
        ]

        errors = list(
            result[
                "errors"
            ]
        )

        item.result_status = (
            result_status
        )

        item.errors_json = (
            errors
        )

        item.external_id = (
            external_id
        )

        item.result_recorded_by_user_id = (
            actor_id
        )

        item.result_recorded_at = (
            reconciled_at
        )

        obligation.status = (
            result_status
        )

        if (
            result_status
            == OBLIGATION_STATUS_ACCEPTED
        ):
            obligation.accepted_at = (
                reconciled_at
            )

            obligation.external_id = (
                external_id
            )

            obligation.last_error = None

        else:
            obligation.accepted_at = None
            obligation.external_id = None

            obligation.last_error = (
                "\n".join(
                    errors
                )
                if errors
                else None
            )

    batch.reconciled_by_user_id = (
        actor_id
    )

    batch.reconciled_at = (
        reconciled_at
    )

    await session.flush()

    return (
        batch,
        items,
    )

async def list_mintrud_registry_submission_batches(
    session: AsyncSession,
) -> list[RegistrySubmissionBatch]:
    result = await session.execute(
        select(
            RegistrySubmissionBatch
        )
        .where(
            RegistrySubmissionBatch.registry
            == REGISTRY_MINTRUD
        )
        .order_by(
            RegistrySubmissionBatch.created_at.desc(),
            RegistrySubmissionBatch.id.desc(),
        )
    )

    return list(
        result.scalars().all()
    )
