from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import build_current_user_response, get_current_user
from app.db.session import get_db
from app.models.course import Course
from app.models.course_lesson import CourseLesson
from app.models.course_module import CourseModule
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learning_group import LearningGroup
from app.models.lesson_progress import LessonProgress
from app.models.organization import Organization
from app.models.user import User
from app.services.completion_documents import ensure_completion_document_for_enrollment
from app.services.document_storage import (
    build_document_download_filename,
    detect_document_download_metadata,
    resolve_private_storage_path,
)
from app.schemas.account import (
    AccountCourseDetailResponse,
    AccountCourseItemResponse,
    AccountCourseLessonResponse,
    AccountCourseModuleResponse,
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
        select(func.count(DocumentRecord.id)).where(DocumentRecord.user_id == current_user.id)
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
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AccountDocumentsResponse:
    result = await session.execute(
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
            Course.id.label("course_id"),
            Course.slug.label("course_slug"),
            Course.title.label("course_title"),
        )
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .where(DocumentRecord.user_id == current_user.id)
        .order_by(DocumentRecord.created_at.desc(), DocumentRecord.title.asc())
    )

    items = [
        AccountDocumentItemResponse(
            id=row.id,
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
            download_available=row.status == "available" and bool(row.storage_path),
        )
        for row in result.all()
    ]

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
        ).where(
            DocumentRecord.id == document_id,
            DocumentRecord.user_id == current_user.id,
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


def build_account_course_lesson(
    lesson: CourseLesson,
    completed_at_by_lesson_id: dict[str, datetime] | None = None,
) -> AccountCourseLessonResponse:
    completed_at_by_lesson_id = completed_at_by_lesson_id or {}
    completed_at = completed_at_by_lesson_id.get(str(lesson.id))

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
    )


def build_account_course_module(
    module: CourseModule,
    lessons: list[CourseLesson],
    completed_at_by_lesson_id: dict[str, datetime] | None = None,
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
        )
        for module in modules
    ]


def build_account_course_detail_from_row(
    row,
    modules: list[AccountCourseModuleResponse],
) -> AccountCourseDetailResponse:
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

    if enrollment.started_at is None:
        enrollment.started_at = datetime.now(timezone.utc)

    enrollment.status = "completed"
    enrollment.completed_at = datetime.now(timezone.utc)

    await ensure_completion_document_for_enrollment(enrollment, session)

    await session.commit()

    row = await get_account_course_row_or_404(str(enrollment.id), current_user, session)

    return build_account_course_item_from_row(row)