from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.core.config import settings
from app.db.session import get_db
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.user import User
from app.schemas.public import PublicCourseDetailResponse, PublicCourseItemResponse, PublicDocumentVerifyResponse


router = APIRouter(prefix="/public", tags=["public"])




def build_public_course_item(course: Course) -> PublicCourseItemResponse:
    return PublicCourseItemResponse(
        id=str(course.id),
        slug=course.slug,
        title=course.title,
        description=course.description,
        hours=course.hours,
        format=course.format,
        document_type=course.document_type,
    )


def build_public_course_detail(course: Course) -> PublicCourseDetailResponse:
    return PublicCourseDetailResponse(
        id=str(course.id),
        slug=course.slug,
        title=course.title,
        description=course.description,
        hours=course.hours,
        format=course.format,
        document_type=course.document_type,
    )


@router.get("/courses", response_model=list[PublicCourseItemResponse])
async def list_public_courses(
    q: str | None = Query(default=None, max_length=255),
    limit: int = Query(default=100, ge=1, le=300),
    session: AsyncSession = Depends(get_db),
) -> list[PublicCourseItemResponse]:
    query = (
        select(Course)
        .where(Course.is_active.is_(True))
        .order_by(Course.title.asc())
        .limit(limit)
    )

    if q and q.strip():
        q_filter = f"%{q.strip()}%"
        query = query.where(
            or_(
                Course.slug.ilike(q_filter),
                Course.title.ilike(q_filter),
                Course.description.ilike(q_filter),
                Course.format.ilike(q_filter),
                Course.document_type.ilike(q_filter),
            )
        )

    result = await session.execute(query)
    courses = result.scalars().all()

    return [
        build_public_course_item(course)
        for course in courses
    ]


@router.get("/courses/{slug}", response_model=PublicCourseDetailResponse)
async def get_public_course_detail(
    slug: str,
    session: AsyncSession = Depends(get_db),
) -> PublicCourseDetailResponse:
    normalized_slug = slug.strip().lower()

    result = await session.execute(
        select(Course).where(
            Course.slug == normalized_slug,
            Course.is_active.is_(True),
        )
    )
    course = result.scalar_one_or_none()

    if course is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found",
        )

    return build_public_course_detail(course)

@router.get("/documents/verify", response_model=PublicDocumentVerifyResponse)
async def verify_document(
    number: str = Query(min_length=3, max_length=128),
    session: AsyncSession = Depends(get_db),
) -> PublicDocumentVerifyResponse:
    normalized_number = number.strip()

    result = await session.execute(
        select(
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.verification_code.label("verification_code"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("registry_status"),
            DocumentRecord.created_at.label("issued_at"),
            DocumentRecord.storage_path.label("storage_path"),
            User.full_name.label("holder_name"),
            Course.title.label("course_title"),
            Course.hours.label("course_hours"),
            Course.format.label("course_format"),
            Enrollment.completed_at.label("completed_at"),
        )
        .join(User, User.id == DocumentRecord.user_id)
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .outerjoin(Enrollment, Enrollment.id == DocumentRecord.enrollment_id)
        .where(
            or_(
                func.lower(DocumentRecord.document_number) == normalized_number.lower(),
                func.lower(DocumentRecord.verification_code) == normalized_number.lower(),
            )
        )
    )

    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if row.registry_status == "draft":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if row.registry_status == "available" and not row.storage_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    if row.registry_status == "revoked":
        verification_status = "Документ отозван"
    elif row.registry_status == "available":
        verification_status = "Документ подтверждён"
    else:
        verification_status = "Документ не подтверждён"

    return PublicDocumentVerifyResponse(
        document_number=row.document_number,
        verification_code=row.verification_code,
        document_type=row.document_type,
        title=row.title,
        holder_name=row.holder_name,
        course_title=row.course_title,
        issued_at=row.issued_at,
        completed_at=row.completed_at,
        course_hours=row.course_hours,
        course_format=row.course_format,
        issuer_name=settings.document_org_name,
        issuer_short_name=settings.document_org_short_name,
        issuer_address=settings.document_org_address,
        issuer_license=settings.document_org_license,
        issuer_inn=settings.document_org_inn,
        issuer_kpp=settings.document_org_kpp,
        issuer_ogrn=settings.document_org_ogrn,
        registry_status=row.registry_status,
        verification_status=verification_status,
    )
