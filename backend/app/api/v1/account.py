from __future__ import annotations

from mimetypes import guess_type
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.v1.auth import build_current_user_response, get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learning_group import LearningGroup
from app.models.organization import Organization
from app.models.user import User
from app.schemas.account import (
    AccountCourseItemResponse,
    AccountCoursesResponse,
    AccountDocumentItemResponse,
    AccountDocumentsResponse,
    AccountSummaryResponse,
)


router = APIRouter(prefix="/account", tags=["account"])


def _resolve_storage_path(storage_path: str) -> Path | None:
    base_path = Path(settings.document_storage_dir).resolve()
    candidate_path = (base_path / storage_path).resolve()

    try:
        candidate_path.relative_to(base_path)
    except ValueError:
        return None

    return candidate_path


def _build_download_filename(document_number: str, storage_path: str) -> str:
    suffix = Path(storage_path).suffix or ".bin"
    safe_stem = "".join(
        ch if ch.isalnum() or ch in ("-", "_") else "_"
        for ch in document_number
    ).strip("_")

    if not safe_stem:
        safe_stem = "document"

    return f"{safe_stem}{suffix}"


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
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("status"),
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
            document_type=row.document_type,
            title=row.title,
            status=row.status,
            course_id=row.course_id,
            course_slug=row.course_slug,
            course_title=row.course_title,
            enrollment_id=row.enrollment_id,
            file_available=bool(row.storage_path),
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

    media_type = guess_type(resolved_path.name)[0] or "application/octet-stream"
    filename = _build_download_filename(row.document_number, row.storage_path)

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