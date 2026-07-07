from __future__ import annotations

from dataclasses import dataclass
from uuid import uuid4
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.enrollment import Enrollment
from app.models.import_batch import ImportBatch, ImportRow
from app.models.learner_profile import LearnerProfile
from app.models.user import User
from app.services.learner_import_parser import ParsedLearnerImportResult


class ImportBatchSession(Protocol):
    def add(self, instance: object) -> None:
        ...

    async def flush(self) -> None:
        ...


@dataclass(frozen=True)
class LearnerImportApplyResult:
    created_users_count: int = 0
    updated_users_count: int = 0
    created_profiles_count: int = 0
    updated_profiles_count: int = 0
    created_enrollments_count: int = 0
    error_rows_count: int = 0


def normalize_import_text(value: object) -> str:
    return str(value or "").strip()


def build_import_row_fallback_email(batch_id: str, row_number: int) -> str:
    normalized_batch_id = "".join(ch for ch in str(batch_id).lower() if ch.isalnum())[:16]
    normalized_batch_id = normalized_batch_id or uuid4().hex[:16]

    return f"import-{normalized_batch_id}-row-{row_number}@obrportal.local"


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


async def find_user_for_import_row(
    db: AsyncSession,
    *,
    email: str,
    phone: str,
) -> tuple[User | None, str | None]:
    email_user: User | None = None
    phone_user: User | None = None

    if email:
        result = await db.execute(select(User).where(User.email == email))
        email_user = result.scalar_one_or_none()

    if phone:
        result = await db.execute(select(User).where(User.phone == phone))
        phone_user = result.scalar_one_or_none()

    if email_user and phone_user and email_user.id != phone_user.id:
        return None, "email and phone belong to different users."

    return email_user or phone_user, None


async def find_profile_for_user(db: AsyncSession, user_id: str) -> LearnerProfile | None:
    result = await db.execute(select(LearnerProfile).where(LearnerProfile.user_id == user_id))

    return result.scalar_one_or_none()


async def find_profile_by_snils(db: AsyncSession, snils: str) -> LearnerProfile | None:
    result = await db.execute(select(LearnerProfile).where(LearnerProfile.snils == snils))

    return result.scalar_one_or_none()


async def find_enrollment(
    db: AsyncSession,
    *,
    user_id: str,
    course_id: str,
) -> Enrollment | None:
    result = await db.execute(
        select(Enrollment).where(
            Enrollment.user_id == user_id,
            Enrollment.course_id == course_id,
        )
    )

    return result.scalar_one_or_none()


def apply_profile_data(profile: LearnerProfile, data: dict) -> None:
    field_map = {
        "last_name": "last_name",
        "first_name": "first_name",
        "middle_name": "middle_name",
        "phone": "phone",
        "email": "email",
        "snils": "snils",
    }

    for source_key, target_attr in field_map.items():
        value = normalize_import_text(data.get(source_key))
        if value and not getattr(profile, target_attr):
            setattr(profile, target_attr, value)


def mark_import_row_error(row: ImportRow, message: str) -> None:
    errors = list(row.validation_errors_json or [])
    if message not in errors:
        errors.append(message)

    row.status = "error"
    row.validation_errors_json = errors
    row.error_summary = "; ".join(errors)


async def apply_learner_import_batch(
    db: AsyncSession,
    *,
    batch: ImportBatch,
) -> LearnerImportApplyResult:
    if batch.status == "applied":
        raise ValueError("Learner import batch has already been applied.")

    if batch.status != "parsed":
        raise ValueError("Only parsed learner import batches can be applied.")

    counts = {
        "created_users_count": 0,
        "updated_users_count": 0,
        "created_profiles_count": 0,
        "updated_profiles_count": 0,
        "created_enrollments_count": 0,
        "error_rows_count": 0,
    }

    valid_rows = sorted(
        [row for row in batch.rows if row.status == "valid"],
        key=lambda row: row.row_number,
    )

    for row in valid_rows:
        data = row.normalized_data_json or {}
        email = normalize_import_text(data.get("email")).lower()
        phone = normalize_import_text(data.get("phone"))
        full_name = normalize_import_text(data.get("full_name"))
        snils = normalize_import_text(data.get("snils"))

        user, user_conflict = await find_user_for_import_row(db, email=email, phone=phone)
        if user_conflict:
            mark_import_row_error(row, user_conflict)
            counts["error_rows_count"] += 1
            continue

        if user is None:
            user = User(
                email=email or build_import_row_fallback_email(str(batch.id), row.row_number),
                phone=phone or None,
                full_name=full_name or None,
                hashed_password=get_password_hash(f"Import-{uuid4().hex}"),
                is_active=True,
                is_email_verified=False,
                mfa_enabled=False,
            )
            db.add(user)
            await db.flush()
            counts["created_users_count"] += 1
        else:
            if full_name and not user.full_name:
                user.full_name = full_name
            if phone and not user.phone:
                user.phone = phone
            counts["updated_users_count"] += 1

        if snils:
            snils_profile = await find_profile_by_snils(db, snils)
            if snils_profile and snils_profile.user_id != user.id:
                mark_import_row_error(row, "snils belongs to another learner profile.")
                counts["error_rows_count"] += 1
                continue

        profile = await find_profile_for_user(db, str(user.id))
        if profile is None:
            profile = LearnerProfile(
                user_id=str(user.id),
                last_name=normalize_import_text(data.get("last_name")) or None,
                first_name=normalize_import_text(data.get("first_name")) or None,
                middle_name=normalize_import_text(data.get("middle_name")) or None,
                phone=phone or None,
                email=email or None,
                snils=snils or None,
                source="learner_import",
                personal_data_basis="import",
                notes=f"Import batch {batch.id}, row {row.row_number}",
            )
            db.add(profile)
            await db.flush()
            counts["created_profiles_count"] += 1
        else:
            apply_profile_data(profile, data)
            counts["updated_profiles_count"] += 1

        enrollment: Enrollment | None = None
        if batch.course_id:
            enrollment = await find_enrollment(db, user_id=str(user.id), course_id=str(batch.course_id))
            if enrollment is None:
                enrollment = Enrollment(
                    user_id=str(user.id),
                    course_id=str(batch.course_id),
                    organization_id=str(batch.organization_id) if batch.organization_id else None,
                    learning_group_id=str(batch.learning_group_id) if batch.learning_group_id else None,
                    status="assigned",
                )
                db.add(enrollment)
                await db.flush()
                counts["created_enrollments_count"] += 1
            else:
                if batch.organization_id and not enrollment.organization_id:
                    enrollment.organization_id = str(batch.organization_id)
                if batch.learning_group_id and not enrollment.learning_group_id:
                    enrollment.learning_group_id = str(batch.learning_group_id)

        row.status = "applied"
        row.user_id = str(user.id)
        row.learner_profile_id = str(profile.id)
        row.enrollment_id = str(enrollment.id) if enrollment else None
        row.error_summary = None

    batch.created_users_count = counts["created_users_count"]
    batch.updated_users_count = counts["updated_users_count"]
    batch.created_profiles_count = counts["created_profiles_count"]
    batch.updated_profiles_count = counts["updated_profiles_count"]
    batch.created_enrollments_count = counts["created_enrollments_count"]
    batch.invalid_rows = len([row for row in batch.rows if row.status in {"invalid", "error"}])
    batch.valid_rows = len([row for row in batch.rows if row.status in {"valid", "applied"}])
    batch.status = "applied"

    await db.flush()

    return LearnerImportApplyResult(**counts)
