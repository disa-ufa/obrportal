from __future__ import annotations

from typing import Protocol

from app.models.import_batch import ImportBatch, ImportRow
from app.services.learner_import_parser import ParsedLearnerImportResult


class ImportBatchSession(Protocol):
    def add(self, instance: object) -> None:
        ...

    async def flush(self) -> None:
        ...


async def create_import_batch_from_parse_result(
    db: ImportBatchSession,
    *,
    parse_result: ParsedLearnerImportResult,
    source_content_type: str | None = None,
    organization_id: str | None = None,
    learning_group_id: str | None = None,
    course_id: str | None = None,
    uploaded_by_user_id: str | None = None,
    notes: str | None = None,
) -> ImportBatch:
    """Persist parsed learner import result as ImportBatch and ImportRow records.

    This function intentionally does not create users, learner profiles, or
    enrollments. It only stores the parsed rows and validation result so an
    operator can review the import before applying it.
    """

    batch = ImportBatch(
        import_type="learner_roster",
        source_filename=parse_result.filename,
        source_content_type=source_content_type,
        status="parsed",
        organization_id=organization_id,
        learning_group_id=learning_group_id,
        course_id=course_id,
        total_rows=parse_result.total_rows,
        valid_rows=parse_result.valid_rows,
        invalid_rows=parse_result.invalid_rows,
        created_users_count=0,
        updated_users_count=0,
        created_profiles_count=0,
        updated_profiles_count=0,
        created_enrollments_count=0,
        uploaded_by_user_id=uploaded_by_user_id,
        notes=notes,
    )

    for parsed_row in parse_result.rows:
        batch.rows.append(
            ImportRow(
                row_number=parsed_row.row_number,
                status=parsed_row.status,
                raw_data_json=parsed_row.raw_data,
                normalized_data_json=parsed_row.normalized_data,
                validation_errors_json=parsed_row.validation_errors,
                error_summary="; ".join(parsed_row.validation_errors) or None,
            )
        )

    db.add(batch)
    await db.flush()

    return batch
