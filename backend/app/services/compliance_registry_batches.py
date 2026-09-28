from __future__ import annotations

from collections.abc import Mapping, Sequence
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
    validate_registry_approval_current,
)
from app.services.compliance_registry_contract import (
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
REGISTRY_SUBMISSION_BATCH_TRANSPORT_FILE = "file"
MINTRUD_SUBMISSION_BATCH_EXTENSION = ".xml"


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
