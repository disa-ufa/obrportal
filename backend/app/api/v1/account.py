from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import build_current_user_response, get_current_user
from app.db.session import get_db
from app.models.assignment_submission import AssignmentSubmission
from app.models.course import Course
from app.models.course_lesson import CourseLesson
from app.models.course_module import CourseModule
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learning_group import LearningGroup
from app.models.lesson_progress import LessonProgress
from app.models.lesson_block import LessonBlock
from app.models.learner_profile import LearnerProfile
from app.models.organization import Organization
from app.models.quiz_attempt import QuizAttempt
from app.models.user import User
from app.services.completion_documents import ensure_completion_document_for_enrollment
from app.services.quiz_attempts import grade_quiz_attempt, get_quiz_max_attempts
from app.services.document_storage import (
    build_document_download_filename,
    detect_document_download_metadata,
    resolve_private_storage_path,
)
from app.schemas.account import (
    AccountAssignmentSubmissionSubmitRequest,
    AccountAssignmentSubmissionResponse,
    AccountCourseDetailResponse,
    AccountCourseItemResponse,
    AccountCourseLessonResponse,
    AccountCourseModuleResponse,
    AccountLessonBlockResponse,
    AccountLearnerProfileResponse,
    AccountLearnerProfileUpdateRequest,
    AccountQuizAttemptResponse,
    AccountQuizAttemptSubmitRequest,
    AccountCoursesResponse,
    AccountDocumentItemResponse,
    AccountDocumentsResponse,
    AccountSummaryResponse,
)


router = APIRouter(prefix="/account", tags=["account"])


def _resolve_storage_path(storage_path: str) -> Path | None:
    return resolve_private_storage_path(storage_path)


def _build_download_filename(document_number: str, storage_path: str) -> str:
    return build_document_download_filename(document_number, storage_path)


def _build_account_document_download_url(
    document_id: str,
    *,
    download_available: bool,
) -> str | None:
    if not download_available:
        return None

    return f"/api/v1/account/documents/{document_id}/download"


def account_document_completion_visibility_condition():
    return or_(
        DocumentRecord.enrollment_id.is_(None),
        (Enrollment.status == "completed") & Enrollment.completed_at.is_not(None),
    )


ACCOUNT_LEARNER_PROFILE_TEXT_FIELDS = {
    "last_name",
    "first_name",
    "middle_name",
    "snils",
    "phone",
    "email",
    "identity_document_type",
    "identity_document_series",
    "identity_document_number",
    "identity_document_issued_by",
    "identity_document_department_code",
}


def normalize_account_learner_profile_text(value: str | None) -> str | None:
    normalized = " ".join(str(value or "").split())
    return normalized or None


def build_account_learner_profile_response(
    current_user: User,
    profile: LearnerProfile | None,
) -> AccountLearnerProfileResponse:
    return AccountLearnerProfileResponse(
        id=str(profile.id) if profile is not None else None,
        user_id=str(current_user.id),
        last_name=profile.last_name if profile is not None else None,
        first_name=profile.first_name if profile is not None else None,
        middle_name=profile.middle_name if profile is not None else None,
        birth_date=profile.birth_date if profile is not None else None,
        snils=profile.snils if profile is not None else None,
        phone=profile.phone if profile is not None else None,
        email=profile.email if profile is not None else None,
        identity_document_type=(
            profile.identity_document_type
            if profile is not None
            else None
        ),
        identity_document_series=(
            profile.identity_document_series
            if profile is not None
            else None
        ),
        identity_document_number=(
            profile.identity_document_number
            if profile is not None
            else None
        ),
        identity_document_issued_by=(
            profile.identity_document_issued_by
            if profile is not None
            else None
        ),
        identity_document_issued_at=(
            profile.identity_document_issued_at
            if profile is not None
            else None
        ),
        identity_document_department_code=(
            profile.identity_document_department_code
            if profile is not None
            else None
        ),
        identity_document_status=(
            profile.identity_document_status
            if profile is not None
            else "not_provided"
        ),
        education_document_status=(
            profile.education_document_status
            if profile is not None
            else "not_provided"
        ),
        personal_data_basis=(
            profile.personal_data_basis
            if profile is not None
            else None
        ),
        personal_data_consent_at=(
            profile.personal_data_consent_at
            if profile is not None
            else None
        ),
        source=profile.source if profile is not None else None,
        updated_at=profile.updated_at if profile is not None else None,
    )


async def load_account_learner_profile(
    session: AsyncSession,
    *,
    user_id: str,
) -> LearnerProfile | None:
    result = await session.execute(
        select(LearnerProfile).where(
            LearnerProfile.user_id == user_id
        )
    )
    return result.scalar_one_or_none()


@router.get(
    "/profile",
    response_model=AccountLearnerProfileResponse,
)
async def get_account_learner_profile(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountLearnerProfileResponse:
    profile = await load_account_learner_profile(
        session,
        user_id=str(current_user.id),
    )
    return build_account_learner_profile_response(
        current_user,
        profile,
    )


@router.patch(
    "/profile",
    response_model=AccountLearnerProfileResponse,
)
async def update_account_learner_profile(
    payload: AccountLearnerProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountLearnerProfileResponse:
    profile = await load_account_learner_profile(
        session,
        user_id=str(current_user.id),
    )
    update_data = payload.model_dump(exclude_unset=True)

    if not update_data:
        return build_account_learner_profile_response(
            current_user,
            profile,
        )

    if profile is None:
        profile = LearnerProfile(
            user_id=str(current_user.id),
            source="self_service",
        )
        session.add(profile)

    for field_name, value in update_data.items():
        if field_name in ACCOUNT_LEARNER_PROFILE_TEXT_FIELDS:
            value = normalize_account_learner_profile_text(value)
        setattr(profile, field_name, value)

    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()

        if "snils" in update_data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Learner profile with this SNILS already exists"
                ),
            ) from exc

        raise

    await session.refresh(profile)

    return build_account_learner_profile_response(
        current_user,
        profile,
    )


@router.get("/summary", response_model=AccountSummaryResponse)
async def get_account_summary(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountSummaryResponse:
    profile = await build_current_user_response(session, current_user)

    enrollments_count = await session.scalar(
        select(func.count(Enrollment.id)).where(Enrollment.user_id == current_user.id)
    )
    active_courses_count = await session.scalar(
        select(func.count(Enrollment.id)).where(
            Enrollment.user_id == current_user.id,
            Enrollment.status.in_(["assigned", "active"]),
        )
    )
    documents_count = await session.scalar(
        select(func.count(DocumentRecord.id))
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .where(
            DocumentRecord.user_id == current_user.id,
            account_document_completion_visibility_condition(),
        )
    )

    return AccountSummaryResponse(
        profile=profile,
        enrollments_count=int(enrollments_count or 0),
        active_courses_count=int(active_courses_count or 0),
        documents_count=int(documents_count or 0),
    )


@router.get("/courses", response_model=AccountCoursesResponse)
async def get_account_courses(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountCoursesResponse:
    result = await session.execute(
        select(
            Enrollment.id.label("enrollment_id"),
            Enrollment.status.label("status"),
            Enrollment.started_at.label("started_at"),
            Enrollment.completed_at.label("completed_at"),
            Enrollment.organization_id.label("organization_id"),
            Enrollment.learning_group_id.label("learning_group_id"),
            Course.id.label("course_id"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
            Course.description.label("course_description"),
            Course.hours.label("hours"),
            Course.format.label("format"),
            Course.document_type.label("document_type"),
            Organization.name.label("organization_name"),
            LearningGroup.name.label("learning_group_name"),
        )
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .where(Enrollment.user_id == current_user.id)
        .order_by(Course.title, Enrollment.created_at.desc())
    )

    items = [
        AccountCourseItemResponse(
            enrollment_id=row.enrollment_id,
            course_id=row.course_id,
            course_slug=row.course_slug,
            course_title=row.course_title,
            course_description=row.course_description,
            hours=row.hours,
            format=row.format,
            document_type=row.document_type,
            status=row.status,
            organization_id=row.organization_id,
            organization_name=row.organization_name,
            learning_group_id=row.learning_group_id,
            learning_group_name=row.learning_group_name,
        started_at=getattr(row, "started_at", None),
        completed_at=getattr(row, "completed_at", None),
        )
        for row in result.all()
    ]

    return AccountCoursesResponse(
        total=len(items),
        items=items,
    )


@router.get("/documents", response_model=AccountDocumentsResponse)
async def get_account_documents(
    status_filter: str | None = Query(default=None, alias="status", max_length=32),
    course_id: str | None = Query(default=None, max_length=64),
    enrollment_id: str | None = Query(default=None, max_length=64),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountDocumentsResponse:
    query = (
        select(
            DocumentRecord.id.label("id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("status"),
            DocumentRecord.revoked_at.label("revoked_at"),
            DocumentRecord.revocation_reason.label("revocation_reason"),
            DocumentRecord.storage_path.label("storage_path"),
            DocumentRecord.enrollment_id.label("enrollment_id"),
            DocumentRecord.created_at.label("created_at"),
            DocumentRecord.generated_at.label("generated_at"),
            Course.id.label("course_id"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
        )
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .where(
            DocumentRecord.user_id == current_user.id,
            account_document_completion_visibility_condition(),
        )
        .order_by(DocumentRecord.created_at.desc(), DocumentRecord.title.asc())
    )

    if status_filter and status_filter.strip():
        query = query.where(DocumentRecord.status == status_filter.strip())

    if course_id and course_id.strip():
        query = query.where(DocumentRecord.course_id == course_id.strip())

    if enrollment_id and enrollment_id.strip():
        query = query.where(DocumentRecord.enrollment_id == enrollment_id.strip())

    result = await session.execute(query)

    items: list[AccountDocumentItemResponse] = []

    for row in result.all():
        download_available = row.status == "available" and bool(row.storage_path)
        document_id = str(row.id)
        issued_at = row.generated_at or row.created_at

        items.append(
            AccountDocumentItemResponse(
                id=document_id,
                document_number=row.document_number,
                verification_code=row.verification_code,
                document_type=row.document_type,
                title=row.title,
                status=row.status,
                revoked_at=row.revoked_at,
                revocation_reason=row.revocation_reason,
                course_id=row.course_id,
                course_slug=row.course_slug,
                course_title=row.course_title,
                enrollment_id=row.enrollment_id,
                file_available=bool(row.storage_path),
                download_available=download_available,
                download_url=_build_account_document_download_url(
                    document_id,
                    download_available=download_available,
                ),
                created_at=row.created_at,
                issued_at=issued_at,
            )
        )

    return AccountDocumentsResponse(
        total=len(items),
        items=items,
    )


@router.get("/documents/{document_id}/download")
async def get_account_document_download(
    document_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(
            DocumentRecord.id.label("id"),
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("status"),
            DocumentRecord.storage_path.label("storage_path"),
        )
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .where(
            DocumentRecord.id == document_id,
            DocumentRecord.user_id == current_user.id,
            account_document_completion_visibility_condition(),
        )
    )
    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if row.status != "available":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document is not available for download",
        )

    if not row.storage_path:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document file is not available",
        )

    resolved_path = _resolve_storage_path(row.storage_path)

    if not resolved_path or not resolved_path.exists() or not resolved_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Document file is not available",
        )

    media_type, filename = detect_document_download_metadata(
        resolved_path=resolved_path,
        storage_path=row.storage_path,
        document_number=row.document_number,
    )

    return FileResponse(
        path=resolved_path,
        media_type=media_type,
        filename=filename,
    )


def build_account_course_item_from_row(row) -> AccountCourseItemResponse:
    return AccountCourseItemResponse(
        enrollment_id=str(row.enrollment_id),
        course_id=str(row.course_id),
        course_slug=row.course_slug,
        course_title=row.course_title,
        course_description=row.course_description,
        status=row.status,
        hours=row.hours,
        format=row.format,
        document_type=row.document_type,
        organization_name=row.organization_name,
        learning_group_name=row.learning_group_name,
        started_at=getattr(row, "started_at", None),
        completed_at=getattr(row, "completed_at", None),
    )


def build_account_lesson_block(block: LessonBlock) -> AccountLessonBlockResponse:
    return AccountLessonBlockResponse(
        id=str(block.id),
        lesson_id=str(block.lesson_id),
        block_type=block.block_type,
        position=block.position,
        title=block.title,
        content_json=block.content_json or {},
        settings_json=block.settings_json or {},
        is_required=block.is_required,
        is_active=block.is_active,
    )


def build_account_quiz_attempt_response(
    attempt: QuizAttempt,
    *,
    max_attempts: int | None = None,
) -> AccountQuizAttemptResponse:
    result_json = attempt.result_json or {}
    question_results = result_json.get("question_results")

    if not isinstance(question_results, list):
        question_results = []

    remaining_attempts = None

    if max_attempts is not None:
        remaining_attempts = max(0, max_attempts - int(attempt.attempt_number or 0))

    return AccountQuizAttemptResponse(
        id=str(attempt.id),
        enrollment_id=str(attempt.enrollment_id),
        lesson_id=str(attempt.lesson_id),
        block_id=str(attempt.block_id),
        attempt_number=int(attempt.attempt_number or 0),
        status=attempt.status,
        passed=bool(attempt.passed),
        earned_points=float(attempt.earned_points or 0),
        total_points=float(attempt.total_points or 0),
        percent=int(attempt.percent or 0),
        correct_count=int(attempt.correct_count or 0),
        question_count=int(attempt.question_count or 0),
        pass_score_percent=int(attempt.pass_score_percent or 0),
        max_attempts=max_attempts,
        remaining_attempts=remaining_attempts,
        answers_json=attempt.answers_json or {},
        question_results=question_results,
        submitted_at=attempt.submitted_at,
    )


ASSIGNMENT_REVIEW_MODES = {"self_check", "submit_only", "manual_review"}


def normalize_assignment_review_mode(content_json: dict | None) -> str:
    value = ""

    if isinstance(content_json, dict):
        value = str(content_json.get("review_mode") or "").strip()

    return value if value in ASSIGNMENT_REVIEW_MODES else "self_check"


def assignment_submission_satisfies_required_block(
    block: LessonBlock,
    submission: AssignmentSubmission | None,
) -> bool:
    if submission is None:
        return False

    mode = normalize_assignment_review_mode(block.content_json or {})
    submission_status = str(submission.status or "").strip()

    if mode == "manual_review":
        return submission_status == "approved"

    if mode == "submit_only":
        return submission_status in {"submitted", "approved", "completed"}

    return submission_status in {"completed", "submitted", "approved"}


def build_account_assignment_submission_response(
    *,
    enrollment_id: str,
    lesson_id: str,
    block_id: str,
    submission: AssignmentSubmission | None,
) -> AccountAssignmentSubmissionResponse:
    if submission is None:
        return AccountAssignmentSubmissionResponse(
            id=None,
            enrollment_id=enrollment_id,
            lesson_id=lesson_id,
            block_id=block_id,
            status="not_started",
        )

    return AccountAssignmentSubmissionResponse(
        id=str(submission.id),
        enrollment_id=str(submission.enrollment_id),
        user_id=str(submission.user_id),
        lesson_id=str(submission.lesson_id),
        block_id=str(submission.block_id),
        status=submission.status,
        answer_text=submission.answer_text,
        attachments_json=submission.attachments_json or {},
        score=submission.score,
        max_score=submission.max_score,
        review_comment=submission.review_comment,
        reviewed_by_user_id=str(submission.reviewed_by_user_id) if submission.reviewed_by_user_id else None,
        submitted_at=submission.submitted_at,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
    )


def build_account_course_lesson(
    lesson: CourseLesson,
    completed_at_by_lesson_id: dict[str, datetime] | None = None,
    blocks_by_lesson_id: dict[str, list[LessonBlock]] | None = None,
) -> AccountCourseLessonResponse:
    completed_at_by_lesson_id = completed_at_by_lesson_id or {}
    blocks_by_lesson_id = blocks_by_lesson_id or {}
    completed_at = completed_at_by_lesson_id.get(str(lesson.id))
    lesson_blocks = blocks_by_lesson_id.get(str(lesson.id), [])

    return AccountCourseLessonResponse(
        id=str(lesson.id),
        module_id=str(lesson.module_id),
        title=lesson.title,
        description=lesson.description,
        content_type=lesson.content_type,
        content_url=lesson.content_url,
        content_text=lesson.content_text,
        position=lesson.position,
        is_required=lesson.is_required,
        is_completed=completed_at is not None,
        completed_at=completed_at,
        blocks=[build_account_lesson_block(block) for block in lesson_blocks],
    )


def build_account_course_module(
    module: CourseModule,
    lessons: list[CourseLesson],
    completed_at_by_lesson_id: dict[str, datetime] | None = None,
    blocks_by_lesson_id: dict[str, list[LessonBlock]] | None = None,
) -> AccountCourseModuleResponse:
    return AccountCourseModuleResponse(
        id=str(module.id),
        course_id=str(module.course_id),
        title=module.title,
        description=module.description,
        position=module.position,
        lessons=[
            build_account_course_lesson(
                lesson,
                completed_at_by_lesson_id=completed_at_by_lesson_id,
                blocks_by_lesson_id=blocks_by_lesson_id,
            )
            for lesson in lessons
        ],
    )


async def load_account_course_modules(
    session: AsyncSession,
    course_id: str,
    enrollment_id: str | None = None,
) -> list[AccountCourseModuleResponse]:
    modules_result = await session.execute(
        select(CourseModule)
        .where(
            CourseModule.course_id == course_id,
            CourseModule.is_active.is_(True),
        )
        .order_by(CourseModule.position.asc(), CourseModule.title.asc())
    )
    modules = list(modules_result.scalars().all())

    if not modules:
        return []

    module_ids = [module.id for module in modules]

    lessons_result = await session.execute(
        select(CourseLesson)
        .where(
            CourseLesson.module_id.in_(module_ids),
            CourseLesson.is_active.is_(True),
        )
        .order_by(
            CourseLesson.module_id.asc(),
            CourseLesson.position.asc(),
            CourseLesson.title.asc(),
        )
    )
    lessons = list(lessons_result.scalars().all())

    blocks_by_lesson_id: dict[str, list[LessonBlock]] = {}

    if lessons:
        lesson_ids = [lesson.id for lesson in lessons]

        blocks_result = await session.execute(
            select(LessonBlock)
            .where(
                LessonBlock.lesson_id.in_(lesson_ids),
                LessonBlock.is_active.is_(True),
            )
            .order_by(
                LessonBlock.lesson_id.asc(),
                LessonBlock.position.asc(),
                LessonBlock.title.asc(),
            )
        )

        for block in blocks_result.scalars().all():
            blocks_by_lesson_id.setdefault(str(block.lesson_id), []).append(block)

    completed_at_by_lesson_id: dict[str, datetime] = {}

    if enrollment_id is not None and lessons:
        lesson_ids = [lesson.id for lesson in lessons]

        progress_result = await session.execute(
            select(LessonProgress).where(
                LessonProgress.enrollment_id == enrollment_id,
                LessonProgress.lesson_id.in_(lesson_ids),
                LessonProgress.status == "completed",
            )
        )

        completed_at_by_lesson_id = {
            str(progress.lesson_id): progress.completed_at
            for progress in progress_result.scalars().all()
            if progress.completed_at is not None
        }

    lessons_by_module_id: dict[str, list[CourseLesson]] = {
        str(module.id): []
        for module in modules
    }

    for lesson in lessons:
        lessons_by_module_id.setdefault(str(lesson.module_id), []).append(lesson)

    return [
        build_account_course_module(
            module,
            lessons_by_module_id.get(str(module.id), []),
            completed_at_by_lesson_id=completed_at_by_lesson_id,
            blocks_by_lesson_id=blocks_by_lesson_id,
        )
        for module in modules
    ]


def calculate_progress_percent(completed: int, total: int) -> int:
    if total <= 0:
        return 0

    return int(round((completed / total) * 100))


def calculate_account_course_progress(
    modules: list[AccountCourseModuleResponse],
) -> dict[str, int]:
    lessons = [
        lesson
        for module in modules
        for lesson in module.lessons
    ]

    lessons_total = len(lessons)
    lessons_completed = sum(1 for lesson in lessons if lesson.is_completed)

    required_lessons = [
        lesson
        for lesson in lessons
        if lesson.is_required
    ]
    required_lessons_total = len(required_lessons)
    required_lessons_completed = sum(
        1
        for lesson in required_lessons
        if lesson.is_completed
    )

    return {
        "lessons_total": lessons_total,
        "lessons_completed": lessons_completed,
        "required_lessons_total": required_lessons_total,
        "required_lessons_completed": required_lessons_completed,
        "progress_percent": calculate_progress_percent(
            lessons_completed,
            lessons_total,
        ),
        "required_progress_percent": calculate_progress_percent(
            required_lessons_completed,
            required_lessons_total,
        ),
    }


def build_account_course_detail_from_row(
    row,
    modules: list[AccountCourseModuleResponse],
) -> AccountCourseDetailResponse:
    progress = calculate_account_course_progress(modules)

    return AccountCourseDetailResponse(
        enrollment_id=str(row.enrollment_id),
        course_id=str(row.course_id),
        course_slug=row.course_slug,
        course_title=row.course_title,
        course_description=row.course_description,
        status=row.status,
        hours=row.hours,
        format=row.format,
        document_type=row.document_type,
        organization_name=row.organization_name,
        learning_group_name=row.learning_group_name,
        started_at=getattr(row, "started_at", None),
        completed_at=getattr(row, "completed_at", None),
        lessons_total=progress["lessons_total"],
        lessons_completed=progress["lessons_completed"],
        required_lessons_total=progress["required_lessons_total"],
        required_lessons_completed=progress["required_lessons_completed"],
        progress_percent=progress["progress_percent"],
        required_progress_percent=progress["required_progress_percent"],
        modules=modules,
    )


async def get_account_course_row_or_404(
    enrollment_id: str,
    current_user: User,
    session: AsyncSession,
):
    result = await session.execute(
        select(
            Enrollment.id.label("enrollment_id"),
            Enrollment.course_id.label("course_id"),
            Enrollment.status.label("status"),
            Enrollment.started_at.label("started_at"),
            Enrollment.completed_at.label("completed_at"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
            Course.description.label("course_description"),
            Course.hours.label("hours"),
            Course.format.label("format"),
            Course.document_type.label("document_type"),
            Organization.name.label("organization_name"),
            LearningGroup.name.label("learning_group_name"),
        )
        .join(Course, Course.id == Enrollment.course_id)
        .outerjoin(Organization, Organization.id == Enrollment.organization_id)
        .outerjoin(LearningGroup, LearningGroup.id == Enrollment.learning_group_id)
        .where(
            Enrollment.id == enrollment_id,
            Enrollment.user_id == current_user.id,
        )
    )
    row = result.first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    return row


@router.get("/courses/{enrollment_id}", response_model=AccountCourseDetailResponse)
async def get_account_course_detail(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountCourseDetailResponse:
    row = await get_account_course_row_or_404(
        enrollment_id.strip(),
        current_user,
        session,
    )
    modules = await load_account_course_modules(
        session,
        str(row.course_id),
        enrollment_id=str(row.enrollment_id),
    )

    return build_account_course_detail_from_row(row, modules)


async def get_missing_required_quiz_block_ids(
    session: AsyncSession,
    *,
    enrollment_id: str,
    lesson_id: str,
) -> list[str]:
    required_blocks_result = await session.execute(
        select(LessonBlock.id).where(
            LessonBlock.lesson_id == lesson_id,
            LessonBlock.block_type == "quiz",
            LessonBlock.is_active.is_(True),
            LessonBlock.is_required.is_(True),
        )
    )
    required_block_ids = list(required_blocks_result.scalars().all())

    if not required_block_ids:
        return []

    passed_attempts_result = await session.execute(
        select(QuizAttempt.block_id).where(
            QuizAttempt.enrollment_id == enrollment_id,
            QuizAttempt.lesson_id == lesson_id,
            QuizAttempt.block_id.in_(required_block_ids),
            QuizAttempt.passed.is_(True),
        )
    )
    passed_block_ids = {
        str(block_id)
        for block_id in passed_attempts_result.scalars().all()
    }

    return [
        str(block_id)
        for block_id in required_block_ids
        if str(block_id) not in passed_block_ids
    ]


async def get_missing_required_assignment_block_ids(
    session: AsyncSession,
    *,
    enrollment_id: str,
    lesson_id: str,
) -> list[str]:
    required_blocks_result = await session.execute(
        select(LessonBlock).where(
            LessonBlock.lesson_id == lesson_id,
            LessonBlock.block_type == "assignment",
            LessonBlock.is_active.is_(True),
            LessonBlock.is_required.is_(True),
        )
    )
    required_blocks = list(required_blocks_result.scalars().all())

    if not required_blocks:
        return []

    block_ids = [block.id for block in required_blocks]
    submissions_result = await session.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.enrollment_id == enrollment_id,
            AssignmentSubmission.lesson_id == lesson_id,
            AssignmentSubmission.block_id.in_(block_ids),
        )
    )
    submissions_by_block_id = {
        str(submission.block_id): submission
        for submission in submissions_result.scalars().all()
    }

    return [
        str(block.id)
        for block in required_blocks
        if not assignment_submission_satisfies_required_block(
            block,
            submissions_by_block_id.get(str(block.id)),
        )
    ]


async def get_account_assignment_block_context_or_404(
    *,
    enrollment: Enrollment,
    lesson_id: str,
    block_id: str,
    session: AsyncSession,
) -> tuple[CourseLesson, LessonBlock]:
    lesson_result = await session.execute(
        select(CourseLesson)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .where(
            CourseLesson.id == lesson_id.strip(),
            CourseLesson.is_active.is_(True),
            CourseModule.is_active.is_(True),
            CourseModule.course_id == enrollment.course_id,
        )
    )
    lesson = lesson_result.scalar_one_or_none()

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found in this course",
        )

    block_result = await session.execute(
        select(LessonBlock).where(
            LessonBlock.id == block_id.strip(),
            LessonBlock.lesson_id == lesson.id,
            LessonBlock.block_type == "assignment",
            LessonBlock.is_active.is_(True),
        )
    )
    block = block_result.scalar_one_or_none()

    if block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment block not found in this lesson",
        )

    return lesson, block


@router.get(
    "/courses/{enrollment_id}/lessons/{lesson_id}/quiz-attempts/{block_id}",
    response_model=list[AccountQuizAttemptResponse],
)
async def list_account_course_lesson_quiz_attempts(
    enrollment_id: str,
    lesson_id: str,
    block_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[AccountQuizAttemptResponse]:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    lesson_result = await session.execute(
        select(CourseLesson)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .where(
            CourseLesson.id == lesson_id.strip(),
            CourseLesson.is_active.is_(True),
            CourseModule.is_active.is_(True),
            CourseModule.course_id == enrollment.course_id,
        )
    )
    lesson = lesson_result.scalar_one_or_none()

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found in this course",
        )

    block_result = await session.execute(
        select(LessonBlock).where(
            LessonBlock.id == block_id.strip(),
            LessonBlock.lesson_id == lesson.id,
            LessonBlock.block_type == "quiz",
            LessonBlock.is_active.is_(True),
        )
    )
    block = block_result.scalar_one_or_none()

    if block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz block not found in this lesson",
        )

    max_attempts = get_quiz_max_attempts(block.content_json or {})
    attempts_result = await session.execute(
        select(QuizAttempt)
        .where(
            QuizAttempt.enrollment_id == enrollment.id,
            QuizAttempt.lesson_id == lesson.id,
            QuizAttempt.block_id == block.id,
        )
        .order_by(QuizAttempt.attempt_number.asc())
    )
    attempts = attempts_result.scalars().all()

    return [
        build_account_quiz_attempt_response(
            attempt,
            max_attempts=max_attempts,
        )
        for attempt in attempts
    ]


@router.post(
    "/courses/{enrollment_id}/lessons/{lesson_id}/quiz-attempts/{block_id}",
    response_model=AccountQuizAttemptResponse,
)
async def submit_account_course_lesson_quiz_attempt(
    enrollment_id: str,
    lesson_id: str,
    block_id: str,
    payload: AccountQuizAttemptSubmitRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountQuizAttemptResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    if enrollment.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed course cannot be changed",
        )

    lesson_result = await session.execute(
        select(CourseLesson)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .where(
            CourseLesson.id == lesson_id.strip(),
            CourseLesson.is_active.is_(True),
            CourseModule.is_active.is_(True),
            CourseModule.course_id == enrollment.course_id,
        )
    )
    lesson = lesson_result.scalar_one_or_none()

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found in this course",
        )

    block_result = await session.execute(
        select(LessonBlock).where(
            LessonBlock.id == block_id.strip(),
            LessonBlock.lesson_id == lesson.id,
            LessonBlock.block_type == "quiz",
            LessonBlock.is_active.is_(True),
        )
    )
    block = block_result.scalar_one_or_none()

    if block is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz block not found in this lesson",
        )

    max_attempts = get_quiz_max_attempts(block.content_json or {})
    last_attempt_number = await session.scalar(
        select(func.max(QuizAttempt.attempt_number)).where(
            QuizAttempt.enrollment_id == enrollment.id,
            QuizAttempt.block_id == block.id,
        )
    )
    last_attempt_number = int(last_attempt_number or 0)

    if max_attempts is not None and last_attempt_number >= max_attempts:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quiz attempt limit reached",
        )

    now = datetime.now(timezone.utc)
    answers = payload.answers if isinstance(payload.answers, dict) else {}
    result = grade_quiz_attempt(block.content_json or {}, answers)
    attempt_number = last_attempt_number + 1

    if enrollment.status == "assigned":
        enrollment.status = "active"

    if enrollment.started_at is None:
        enrollment.started_at = now

    attempt = QuizAttempt(
        enrollment_id=enrollment.id,
        lesson_id=lesson.id,
        block_id=block.id,
        attempt_number=attempt_number,
        status="submitted",
        passed=bool(result["passed"]),
        earned_points=float(result["earned_points"] or 0),
        total_points=float(result["total_points"] or 0),
        percent=int(result["percent"] or 0),
        correct_count=int(result["correct_count"] or 0),
        question_count=int(result["question_count"] or 0),
        pass_score_percent=int(result["pass_score_percent"] or 0),
        answers_json=answers,
        result_json=result,
        submitted_at=now,
    )
    session.add(attempt)

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Quiz attempt already exists",
        ) from None

    await session.refresh(attempt)

    return build_account_quiz_attempt_response(
        attempt,
        max_attempts=max_attempts,
    )


@router.get(
    "/courses/{enrollment_id}/lessons/{lesson_id}/assignment-submissions/{block_id}",
    response_model=AccountAssignmentSubmissionResponse,
)
async def get_account_course_lesson_assignment_submission(
    enrollment_id: str,
    lesson_id: str,
    block_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountAssignmentSubmissionResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )
    lesson, block = await get_account_assignment_block_context_or_404(
        enrollment=enrollment,
        lesson_id=lesson_id,
        block_id=block_id,
        session=session,
    )

    submission_result = await session.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.enrollment_id == enrollment.id,
            AssignmentSubmission.lesson_id == lesson.id,
            AssignmentSubmission.block_id == block.id,
        )
    )
    submission = submission_result.scalar_one_or_none()

    return build_account_assignment_submission_response(
        enrollment_id=str(enrollment.id),
        lesson_id=str(lesson.id),
        block_id=str(block.id),
        submission=submission,
    )


@router.post(
    "/courses/{enrollment_id}/lessons/{lesson_id}/assignment-submissions/{block_id}/submit",
    response_model=AccountAssignmentSubmissionResponse,
)
async def submit_account_course_lesson_assignment_answer(
    enrollment_id: str,
    lesson_id: str,
    block_id: str,
    payload: AccountAssignmentSubmissionSubmitRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountAssignmentSubmissionResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    if enrollment.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed course cannot be changed",
        )

    answer_text = (payload.answer_text or "").strip()

    if not answer_text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "assignment_answer_required",
                "message": "Assignment answer is required",
                "block_id": block_id,
            },
        )

    lesson, block = await get_account_assignment_block_context_or_404(
        enrollment=enrollment,
        lesson_id=lesson_id,
        block_id=block_id,
        session=session,
    )

    review_mode = normalize_assignment_review_mode(block.content_json or {})
    target_status = "completed" if review_mode == "self_check" else "submitted"

    now = datetime.now(timezone.utc)

    if enrollment.status == "assigned":
        enrollment.status = "active"

    if enrollment.started_at is None:
        enrollment.started_at = now

    submission_result = await session.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.enrollment_id == enrollment.id,
            AssignmentSubmission.lesson_id == lesson.id,
            AssignmentSubmission.block_id == block.id,
        )
    )
    submission = submission_result.scalar_one_or_none()

    if submission is None:
        submission = AssignmentSubmission(
            enrollment_id=enrollment.id,
            user_id=current_user.id,
            lesson_id=lesson.id,
            block_id=block.id,
            status=target_status,
            answer_text=answer_text,
            attachments_json={},
            submitted_at=now,
        )
        session.add(submission)
    else:
        submission.user_id = current_user.id
        submission.status = target_status
        submission.answer_text = answer_text
        submission.attachments_json = submission.attachments_json or {}
        submission.submitted_at = now

        if submission.review_comment or submission.reviewed_at or submission.reviewed_by_user_id:
            submission.review_comment = None
            submission.reviewed_at = None
            submission.reviewed_by_user_id = None

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment submission already exists",
        ) from None

    await session.refresh(submission)

    return build_account_assignment_submission_response(
        enrollment_id=str(enrollment.id),
        lesson_id=str(lesson.id),
        block_id=str(block.id),
        submission=submission,
    )


@router.post(
    "/courses/{enrollment_id}/lessons/{lesson_id}/assignment-submissions/{block_id}/complete",
    response_model=AccountAssignmentSubmissionResponse,
)
async def complete_account_course_lesson_assignment_submission(
    enrollment_id: str,
    lesson_id: str,
    block_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountAssignmentSubmissionResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    if enrollment.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed course cannot be changed",
        )

    lesson, block = await get_account_assignment_block_context_or_404(
        enrollment=enrollment,
        lesson_id=lesson_id,
        block_id=block_id,
        session=session,
    )

    review_mode = normalize_assignment_review_mode(block.content_json or {})

    if review_mode == "manual_review":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "manual_review_assignment_requires_submission",
                "message": "Manual review assignment requires submitted answer",
                "block_id": str(block.id),
            },
        )

    now = datetime.now(timezone.utc)
    target_status = "submitted" if review_mode == "submit_only" else "completed"

    if enrollment.status == "assigned":
        enrollment.status = "active"

    if enrollment.started_at is None:
        enrollment.started_at = now

    submission_result = await session.execute(
        select(AssignmentSubmission).where(
            AssignmentSubmission.enrollment_id == enrollment.id,
            AssignmentSubmission.lesson_id == lesson.id,
            AssignmentSubmission.block_id == block.id,
        )
    )
    submission = submission_result.scalar_one_or_none()

    if submission is None:
        submission = AssignmentSubmission(
            enrollment_id=enrollment.id,
            user_id=current_user.id,
            lesson_id=lesson.id,
            block_id=block.id,
            status=target_status,
            attachments_json={},
            submitted_at=now,
        )
        session.add(submission)
    else:
        submission.status = target_status
        submission.user_id = current_user.id
        if submission.submitted_at is None:
            submission.submitted_at = now

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Assignment submission already exists",
        ) from None

    await session.refresh(submission)

    return build_account_assignment_submission_response(
        enrollment_id=str(enrollment.id),
        lesson_id=str(lesson.id),
        block_id=str(block.id),
        submission=submission,
    )


@router.post(
    "/courses/{enrollment_id}/lessons/{lesson_id}/complete",
    response_model=AccountCourseDetailResponse,
)
async def complete_account_course_lesson(
    enrollment_id: str,
    lesson_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountCourseDetailResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    if enrollment.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed course cannot be changed",
        )

    lesson_result = await session.execute(
        select(CourseLesson)
        .join(CourseModule, CourseModule.id == CourseLesson.module_id)
        .where(
            CourseLesson.id == lesson_id.strip(),
            CourseLesson.is_active.is_(True),
            CourseModule.is_active.is_(True),
            CourseModule.course_id == enrollment.course_id,
        )
    )
    lesson = lesson_result.scalar_one_or_none()

    if lesson is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lesson not found in this course",
        )

    missing_required_quiz_block_ids = await get_missing_required_quiz_block_ids(
        session,
        enrollment_id=str(enrollment.id),
        lesson_id=str(lesson.id),
    )

    if missing_required_quiz_block_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "required_quiz_not_passed",
                "message": "Required quiz is not passed",
                "block_ids": missing_required_quiz_block_ids,
            },
        )

    missing_required_assignment_block_ids = await get_missing_required_assignment_block_ids(
        session,
        enrollment_id=str(enrollment.id),
        lesson_id=str(lesson.id),
    )

    if missing_required_assignment_block_ids:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "required_assignment_not_completed",
                "message": "Required assignment is not completed",
                "block_ids": missing_required_assignment_block_ids,
            },
        )

    now = datetime.now(timezone.utc)

    if enrollment.status == "assigned":
        enrollment.status = "active"

    if enrollment.started_at is None:
        enrollment.started_at = now

    progress_result = await session.execute(
        select(LessonProgress).where(
            LessonProgress.enrollment_id == enrollment.id,
            LessonProgress.lesson_id == lesson.id,
        )
    )
    progress = progress_result.scalar_one_or_none()

    if progress is None:
        progress = LessonProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson.id,
            status="completed",
            completed_at=now,
        )
        session.add(progress)
    else:
        progress.status = "completed"

        if progress.completed_at is None:
            progress.completed_at = now

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()

    row = await get_account_course_row_or_404(str(enrollment.id), current_user, session)
    modules = await load_account_course_modules(
        session,
        str(row.course_id),
        enrollment_id=str(row.enrollment_id),
    )

    return build_account_course_detail_from_row(row, modules)


@router.post("/courses/{course_id}/enroll", response_model=AccountCourseItemResponse, status_code=status.HTTP_201_CREATED)
async def create_account_course_enrollment(
    course_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountCourseItemResponse:
    normalized_course_id = course_id.strip()

    result = await session.execute(
        select(Course).where(
            Course.id == normalized_course_id,
            Course.is_active.is_(True),
        )
    )
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Active course not found",
        )

    enrollment = Enrollment(
        user_id=current_user.id,
        course_id=course.id,
        status="assigned",
    )
    session.add(enrollment)

    try:
        await session.flush()
        enrollment_id = str(enrollment.id)
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled in this course",
        )

    row = await get_account_course_row_or_404(enrollment_id, current_user, session)

    return build_account_course_item_from_row(row)


async def get_account_enrollment_entity_or_404(
    enrollment_id: str,
    current_user: User,
    session: AsyncSession,
) -> Enrollment:
    result = await session.execute(
        select(Enrollment).where(
            Enrollment.id == enrollment_id.strip(),
            Enrollment.user_id == current_user.id,
        )
    )
    enrollment = result.scalar_one_or_none()

    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Enrollment not found",
        )

    return enrollment


@router.post("/courses/{enrollment_id}/start", response_model=AccountCourseItemResponse)
async def start_account_course_learning(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountCourseItemResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    if enrollment.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed course cannot be started",
        )

    enrollment.status = "active"

    if enrollment.started_at is None:
        enrollment.started_at = datetime.now(timezone.utc)

    await session.commit()

    row = await get_account_course_row_or_404(str(enrollment.id), current_user, session)

    return build_account_course_item_from_row(row)




@router.post("/courses/{enrollment_id}/complete", response_model=AccountCourseItemResponse)
async def complete_account_course_learning(
    enrollment_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountCourseItemResponse:
    enrollment = await get_account_enrollment_entity_or_404(
        enrollment_id=enrollment_id,
        current_user=current_user,
        session=session,
    )

    if enrollment.status not in {"assigned", "active", "completed"}:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enrollment cannot be completed from current status",
        )

    modules = await load_account_course_modules(
        session,
        str(enrollment.course_id),
        enrollment_id=str(enrollment.id),
    )
    progress = calculate_account_course_progress(modules)

    if (
        progress["required_lessons_total"] > 0
        and progress["required_lessons_completed"] < progress["required_lessons_total"]
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete required lessons before completing course",
        )

    if enrollment.started_at is None:
        enrollment.started_at = datetime.now(timezone.utc)

    enrollment.status = "completed"
    enrollment.completed_at = datetime.now(timezone.utc)

    await ensure_completion_document_for_enrollment(enrollment, session)

    await session.commit()

    row = await get_account_course_row_or_404(str(enrollment.id), current_user, session)

    return build_account_course_item_from_row(row)