from __future__ import annotations

from dataclasses import dataclass, field
from uuid import uuid4
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.models.enrollment import Enrollment
from app.models.import_batch import ImportBatch, ImportRow
from app.models.learner_profile import LearnerProfile
from app.models.role import Role, UserRole
from app.models.user import User
from app.services.learner_import_parser import ParsedLearnerImportResult


class ImportBatchSession(Protocol):
    def add(self, instance: object) -> None:
        ...

    async def flush(self) -> None:
        ...


@dataclass(frozen=True)
class LearnerImportInvitationCandidate:
    row_id: str
    row_number: int
    user_id: str
    email: str

@dataclass(frozen=True)
class LearnerImportCourseNotificationCandidate:
    row_id: str
    row_number: int
    user_id: str
    email: str
    course_id: str



@dataclass(frozen=True)
class LearnerImportApplyResult:
    created_users_count: int = 0
    updated_users_count: int = 0
    created_profiles_count: int = 0
    updated_profiles_count: int = 0
    created_enrollments_count: int = 0
    assigned_learner_roles_count: int = 0
    error_rows_count: int = 0
    invitation_candidates: tuple[LearnerImportInvitationCandidate, ...] = field(
        default_factory=tuple
    )
    course_notification_candidates: tuple[
        LearnerImportCourseNotificationCandidate,
        ...,
    ] = field(default_factory=tuple)


@dataclass(frozen=True)
class LearnerImportPreflightRow:
    row_id: str
    row_number: int
    email: str
    classification: str
    account_state: str
    user_id: str | None
    learner_profile_id: str | None
    enrollment_id: str | None
    user_action: str
    profile_action: str
    enrollment_action: str
    notification_action: str
    error_code: str | None = None
    error_message: str | None = None


@dataclass(frozen=True)
class LearnerImportPreflightResult:
    rows: tuple[LearnerImportPreflightRow, ...] = field(
        default_factory=tuple
    )
    new_users_count: int = 0
    existing_inactive_users_count: int = 0
    existing_active_users_count: int = 0
    existing_enrollments_count: int = 0
    identity_conflicts_count: int = 0
    invalid_rows_count: int = 0
    new_profiles_count: int = 0
    updated_profiles_count: int = 0
    new_enrollments_count: int = 0
    password_setup_invitations_count: int = 0
    new_course_notifications_count: int = 0


def import_user_will_update(
    user: User,
    data: dict,
) -> bool:
    full_name = normalize_import_text(
        data.get("full_name")
    )
    phone = normalize_import_text(
        data.get("phone")
    )

    return bool(
        (full_name and not user.full_name)
        or (phone and not user.phone)
    )


def import_profile_will_update(
    profile: LearnerProfile,
    data: dict,
) -> bool:
    field_map = {
        "last_name": "last_name",
        "first_name": "first_name",
        "middle_name": "middle_name",
        "phone": "phone",
        "email": "email",
        "snils": "snils",
    }

    for source_key, target_attr in field_map.items():
        value = normalize_import_text(
            data.get(source_key)
        )

        if value and not getattr(
            profile,
            target_attr,
        ):
            return True

    return False


def import_enrollment_will_update(
    enrollment: Enrollment,
    batch: ImportBatch,
) -> bool:
    return bool(
        (
            batch.organization_id
            and not enrollment.organization_id
        )
        or (
            batch.learning_group_id
            and not enrollment.learning_group_id
        )
    )


def build_learner_import_preflight_result(
    rows: list[LearnerImportPreflightRow],
) -> LearnerImportPreflightResult:
    return LearnerImportPreflightResult(
        rows=tuple(rows),
        new_users_count=sum(
            item.classification == "new_user"
            for item in rows
        ),
        existing_inactive_users_count=sum(
            item.classification
            == "existing_inactive_user"
            for item in rows
        ),
        existing_active_users_count=sum(
            item.classification
            == "existing_active_user"
            for item in rows
        ),
        existing_enrollments_count=sum(
            item.classification
            == "existing_enrollment"
            for item in rows
        ),
        identity_conflicts_count=sum(
            item.classification
            == "identity_conflict"
            for item in rows
        ),
        invalid_rows_count=sum(
            item.classification == "invalid_row"
            for item in rows
        ),
        new_profiles_count=sum(
            item.profile_action == "created"
            for item in rows
        ),
        updated_profiles_count=sum(
            item.profile_action == "updated"
            for item in rows
        ),
        new_enrollments_count=sum(
            item.enrollment_action == "created"
            for item in rows
        ),
        password_setup_invitations_count=sum(
            item.notification_action
            == "password_setup_invitation"
            for item in rows
        ),
        new_course_notifications_count=sum(
            item.notification_action
            == "new_course_notification"
            for item in rows
        ),
    )


async def build_learner_import_preflight(
    db: AsyncSession,
    *,
    batch: ImportBatch,
) -> LearnerImportPreflightResult:
    preflight_rows: list[
        LearnerImportPreflightRow
    ] = []

    rows = sorted(
        batch.rows,
        key=lambda item: item.row_number,
    )

    for row in rows:
        data = row.normalized_data_json or {}
        email = normalize_import_text(
            data.get("email")
        ).lower()
        phone = normalize_import_text(
            data.get("phone")
        )
        snils = normalize_import_text(
            data.get("snils")
        )

        if row.status != "valid":
            error_message = (
                row.error_summary
                or "; ".join(
                    row.validation_errors_json or []
                )
                or "Import row is invalid."
            )

            preflight_rows.append(
                LearnerImportPreflightRow(
                    row_id=str(row.id),
                    row_number=row.row_number,
                    email=email,
                    classification="invalid_row",
                    account_state="unknown",
                    user_id=None,
                    learner_profile_id=None,
                    enrollment_id=None,
                    user_action="skipped",
                    profile_action="skipped",
                    enrollment_action="skipped",
                    notification_action="not_required",
                    error_code="validation_error",
                    error_message=error_message,
                )
            )
            continue

        if not email:
            preflight_rows.append(
                LearnerImportPreflightRow(
                    row_id=str(row.id),
                    row_number=row.row_number,
                    email=email,
                    classification="invalid_row",
                    account_state="unknown",
                    user_id=None,
                    learner_profile_id=None,
                    enrollment_id=None,
                    user_action="skipped",
                    profile_action="skipped",
                    enrollment_action="skipped",
                    notification_action="not_required",
                    error_code="email_required",
                    error_message=(
                        "Email is required for portal "
                        "registration."
                    ),
                )
            )
            continue

        user, user_conflict = (
            await find_user_for_import_row(
                db,
                email=email,
                phone=phone,
            )
        )

        if user_conflict:
            preflight_rows.append(
                LearnerImportPreflightRow(
                    row_id=str(row.id),
                    row_number=row.row_number,
                    email=email,
                    classification="identity_conflict",
                    account_state="unknown",
                    user_id=None,
                    learner_profile_id=None,
                    enrollment_id=None,
                    user_action="conflict",
                    profile_action="skipped",
                    enrollment_action="skipped",
                    notification_action="not_required",
                    error_code="identity_conflict",
                    error_message=user_conflict,
                )
            )
            continue

        snils_profile = None

        if snils:
            snils_profile = (
                await find_profile_by_snils(
                    db,
                    snils,
                )
            )

        if (
            snils_profile is not None
            and (
                user is None
                or str(snils_profile.user_id)
                != str(user.id)
            )
        ):
            preflight_rows.append(
                LearnerImportPreflightRow(
                    row_id=str(row.id),
                    row_number=row.row_number,
                    email=email,
                    classification="identity_conflict",
                    account_state=(
                        "inactive"
                        if user is not None
                        and not user.is_active
                        else (
                            "active"
                            if user is not None
                            else "unknown"
                        )
                    ),
                    user_id=(
                        str(user.id)
                        if user is not None
                        else None
                    ),
                    learner_profile_id=None,
                    enrollment_id=None,
                    user_action="conflict",
                    profile_action="skipped",
                    enrollment_action="skipped",
                    notification_action="not_required",
                    error_code="snils_conflict",
                    error_message=(
                        "SNILS belongs to another "
                        "learner profile."
                    ),
                )
            )
            continue

        if user is None:
            preflight_rows.append(
                LearnerImportPreflightRow(
                    row_id=str(row.id),
                    row_number=row.row_number,
                    email=email,
                    classification="new_user",
                    account_state="new",
                    user_id=None,
                    learner_profile_id=None,
                    enrollment_id=None,
                    user_action="created",
                    profile_action="created",
                    enrollment_action=(
                        "created"
                        if batch.course_id
                        else "skipped"
                    ),
                    notification_action=(
                        "password_setup_invitation"
                    ),
                )
            )
            continue

        profile = await find_profile_for_user(
            db,
            str(user.id),
        )

        enrollment = None

        if batch.course_id:
            enrollment = await find_enrollment(
                db,
                user_id=str(user.id),
                course_id=str(batch.course_id),
            )

        account_state = (
            "active"
            if user.is_active
            else "inactive"
        )

        if enrollment is not None:
            classification = "existing_enrollment"
        elif user.is_active:
            classification = "existing_active_user"
        else:
            classification = "existing_inactive_user"

        if profile is None:
            profile_action = "created"
        elif import_profile_will_update(
            profile,
            data,
        ):
            profile_action = "updated"
        else:
            profile_action = "unchanged"

        if not batch.course_id:
            enrollment_action = "skipped"
        elif enrollment is None:
            enrollment_action = "created"
        elif import_enrollment_will_update(
            enrollment,
            batch,
        ):
            enrollment_action = "updated"
        else:
            enrollment_action = "unchanged"

        if enrollment is not None:
            notification_action = "not_required"
        elif not user.is_active:
            notification_action = (
                "password_setup_invitation"
            )
        elif batch.course_id:
            notification_action = (
                "new_course_notification"
            )
        else:
            notification_action = "not_required"

        preflight_rows.append(
            LearnerImportPreflightRow(
                row_id=str(row.id),
                row_number=row.row_number,
                email=email,
                classification=classification,
                account_state=account_state,
                user_id=str(user.id),
                learner_profile_id=(
                    str(profile.id)
                    if profile is not None
                    else None
                ),
                enrollment_id=(
                    str(enrollment.id)
                    if enrollment is not None
                    else None
                ),
                user_action=(
                    "updated"
                    if import_user_will_update(
                        user,
                        data,
                    )
                    else "unchanged"
                ),
                profile_action=profile_action,
                enrollment_action=enrollment_action,
                notification_action=notification_action,
            )
        )

    return build_learner_import_preflight_result(
        preflight_rows
    )


def normalize_import_text(value: object) -> str:
    return str(value or "").strip()


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


async def find_or_create_learner_role(db: AsyncSession) -> Role:
    result = await db.execute(select(Role).where(Role.code == "learner"))
    learner_role = result.scalar_one_or_none()

    if learner_role is not None:
        return learner_role

    learner_role = Role(
        code="learner",
        name="\u0421\u043b\u0443\u0448\u0430\u0442\u0435\u043b\u044c",
        description="\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c, \u043f\u0440\u043e\u0445\u043e\u0434\u044f\u0449\u0438\u0439 \u043e\u0431\u0443\u0447\u0435\u043d\u0438\u0435 \u043d\u0430 \u043f\u043e\u0440\u0442\u0430\u043b\u0435",
    )
    db.add(learner_role)
    await db.flush()

    return learner_role


async def find_global_user_role(
    db: AsyncSession,
    *,
    user_id: str,
    role_id: str,
) -> UserRole | None:
    result = await db.execute(
        select(UserRole).where(
            UserRole.user_id == user_id,
            UserRole.role_id == role_id,
            UserRole.organization_id.is_(None),
        )
    )

    return result.scalar_one_or_none()


async def assign_learner_role_if_available(
    db: AsyncSession,
    *,
    user_id: str,
    learner_role: Role | None,
) -> bool:
    if learner_role is None:
        return False

    existing_assignment = await find_global_user_role(
        db,
        user_id=user_id,
        role_id=str(learner_role.id),
    )
    if existing_assignment is not None:
        return False

    db.add(
        UserRole(
            user_id=user_id,
            role_id=str(learner_role.id),
            organization_id=None,
        )
    )
    await db.flush()

    return True


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
        raise ValueError(
            "Learner import batch has already been applied."
        )

    if batch.status != "parsed":
        raise ValueError(
            "Only parsed learner import batches can be applied."
        )

    counts = {
        "created_users_count": 0,
        "updated_users_count": 0,
        "created_profiles_count": 0,
        "updated_profiles_count": 0,
        "created_enrollments_count": 0,
        "assigned_learner_roles_count": 0,
        "error_rows_count": 0,
    }

    invitation_candidates: list[
        LearnerImportInvitationCandidate
    ] = []
    course_notification_candidates: list[
        LearnerImportCourseNotificationCandidate
    ] = []

    learner_role = await find_or_create_learner_role(db)

    valid_rows = sorted(
        [
            row
            for row in batch.rows
            if row.status == "valid"
        ],
        key=lambda row: row.row_number,
    )

    for row in valid_rows:
        data = row.normalized_data_json or {}
        email = normalize_import_text(
            data.get("email")
        ).lower()
        phone = normalize_import_text(
            data.get("phone")
        )
        full_name = normalize_import_text(
            data.get("full_name")
        )
        snils = normalize_import_text(
            data.get("snils")
        )

        if not email:
            mark_import_row_error(
                row,
                (
                    "Email is required for portal "
                    "registration."
                ),
            )
            counts["error_rows_count"] += 1
            continue

        row_counts = {
            key: 0
            for key in counts
            if key != "error_rows_count"
        }

        invitation_candidate = None
        course_notification_candidate = None

        try:
            async with db.begin_nested():
                user, user_conflict = (
                    await find_user_for_import_row(
                        db,
                        email=email,
                        phone=phone,
                    )
                )

                if user_conflict:
                    mark_import_row_error(
                        row,
                        user_conflict,
                    )
                    counts["error_rows_count"] += 1
                    continue

                snils_profile = None

                if snils:
                    snils_profile = (
                        await find_profile_by_snils(
                            db,
                            snils,
                        )
                    )

                if (
                    snils_profile is not None
                    and (
                        user is None
                        or str(snils_profile.user_id)
                        != str(user.id)
                    )
                ):
                    mark_import_row_error(
                        row,
                        (
                            "SNILS belongs to another "
                            "learner profile."
                        ),
                    )
                    counts["error_rows_count"] += 1
                    continue

                if user is None:
                    user = User(
                        email=email,
                        phone=phone or None,
                        full_name=full_name or None,
                        hashed_password=get_password_hash(
                            f"Import-{uuid4().hex}"
                        ),
                        is_active=False,
                        is_email_verified=False,
                        mfa_enabled=False,
                    )
                    db.add(user)
                    await db.flush()
                    row_counts[
                        "created_users_count"
                    ] = 1
                elif import_user_will_update(
                    user,
                    data,
                ):
                    if (
                        full_name
                        and not user.full_name
                    ):
                        user.full_name = full_name

                    if phone and not user.phone:
                        user.phone = phone

                    row_counts[
                        "updated_users_count"
                    ] = 1

                profile = await find_profile_for_user(
                    db,
                    str(user.id),
                )

                if profile is None:
                    profile = LearnerProfile(
                        user_id=str(user.id),
                        last_name=(
                            normalize_import_text(
                                data.get("last_name")
                            )
                            or None
                        ),
                        first_name=(
                            normalize_import_text(
                                data.get("first_name")
                            )
                            or None
                        ),
                        middle_name=(
                            normalize_import_text(
                                data.get("middle_name")
                            )
                            or None
                        ),
                        phone=phone or None,
                        email=email,
                        snils=snils or None,
                        source="learner_import",
                        personal_data_basis="import",
                        notes=(
                            f"Import batch {batch.id}, "
                            f"row {row.row_number}"
                        ),
                    )
                    db.add(profile)
                    await db.flush()
                    row_counts[
                        "created_profiles_count"
                    ] = 1
                elif import_profile_will_update(
                    profile,
                    data,
                ):
                    apply_profile_data(
                        profile,
                        data,
                    )
                    row_counts[
                        "updated_profiles_count"
                    ] = 1

                enrollment: Enrollment | None = None
                had_existing_enrollment = False
                created_enrollment = False

                if batch.course_id:
                    enrollment = await find_enrollment(
                        db,
                        user_id=str(user.id),
                        course_id=str(
                            batch.course_id
                        ),
                    )

                    had_existing_enrollment = (
                        enrollment is not None
                    )

                    if enrollment is None:
                        enrollment = Enrollment(
                            user_id=str(user.id),
                            course_id=str(
                                batch.course_id
                            ),
                            organization_id=(
                                str(
                                    batch.organization_id
                                )
                                if batch.organization_id
                                else None
                            ),
                            learning_group_id=(
                                str(
                                    batch.learning_group_id
                                )
                                if batch.learning_group_id
                                else None
                            ),
                            status="assigned",
                        )
                        db.add(enrollment)
                        await db.flush()

                        created_enrollment = True
                        row_counts[
                            "created_enrollments_count"
                        ] = 1
                    else:
                        if (
                            batch.organization_id
                            and not (
                                enrollment.organization_id
                            )
                        ):
                            enrollment.organization_id = (
                                str(
                                    batch.organization_id
                                )
                            )

                        if (
                            batch.learning_group_id
                            and not (
                                enrollment.learning_group_id
                            )
                        ):
                            enrollment.learning_group_id = (
                                str(
                                    batch.learning_group_id
                                )
                            )

                learner_role_assigned = (
                    await assign_learner_role_if_available(
                        db,
                        user_id=str(user.id),
                        learner_role=learner_role,
                    )
                )

                if learner_role_assigned:
                    row_counts[
                        "assigned_learner_roles_count"
                    ] = 1

                row.status = "applied"
                row.user_id = str(user.id)
                row.learner_profile_id = str(
                    profile.id
                )
                row.enrollment_id = (
                    str(enrollment.id)
                    if enrollment
                    else None
                )
                row.error_summary = None

                if not had_existing_enrollment:
                    if not user.is_active:
                        invitation_candidate = (
                            LearnerImportInvitationCandidate(
                                row_id=str(row.id),
                                row_number=(
                                    row.row_number
                                ),
                                user_id=str(user.id),
                                email=user.email,
                            )
                        )
                    elif (
                        created_enrollment
                        and batch.course_id
                    ):
                        course_notification_candidate = (
                            LearnerImportCourseNotificationCandidate(
                                row_id=str(row.id),
                                row_number=(
                                    row.row_number
                                ),
                                user_id=str(user.id),
                                email=user.email,
                                course_id=str(
                                    batch.course_id
                                ),
                            )
                        )

                await db.flush()

        except IntegrityError:
            mark_import_row_error(
                row,
                (
                    "Database constraint conflict "
                    "while applying learner import row."
                ),
            )
            counts["error_rows_count"] += 1
            continue

        for key, value in row_counts.items():
            counts[key] += value

        if invitation_candidate is not None:
            invitation_candidates.append(
                invitation_candidate
            )

        if (
            course_notification_candidate
            is not None
        ):
            course_notification_candidates.append(
                course_notification_candidate
            )

    batch.created_users_count = counts[
        "created_users_count"
    ]
    batch.updated_users_count = counts[
        "updated_users_count"
    ]
    batch.created_profiles_count = counts[
        "created_profiles_count"
    ]
    batch.updated_profiles_count = counts[
        "updated_profiles_count"
    ]
    batch.created_enrollments_count = counts[
        "created_enrollments_count"
    ]
    batch.invalid_rows = len(
        [
            row
            for row in batch.rows
            if row.status in {"invalid", "error"}
        ]
    )
    batch.valid_rows = len(
        [
            row
            for row in batch.rows
            if row.status in {"valid", "applied"}
        ]
    )
    batch.status = "applied"

    await db.flush()

    return LearnerImportApplyResult(
        **counts,
        invitation_candidates=tuple(
            invitation_candidates
        ),
        course_notification_candidates=tuple(
            course_notification_candidates
        ),
    )
