from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.db.session import get_db
from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.user import User
from app.schemas.public import PublicDocumentVerifyResponse


router = APIRouter(prefix="/public", tags=["public"])


@router.get("/documents/verify", response_model=PublicDocumentVerifyResponse)
async def verify_document(
    number: str = Query(min_length=3, max_length=128),
    session: AsyncSession = Depends(get_db),
) -> PublicDocumentVerifyResponse:
    normalized_number = number.strip()

    result = await session.execute(
        select(
            DocumentRecord.document_number.label("document_number"),
            DocumentRecord.document_type.label("document_type"),
            DocumentRecord.title.label("title"),
            DocumentRecord.status.label("registry_status"),
            DocumentRecord.created_at.label("issued_at"),
            User.full_name.label("holder_name"),
            Course.title.label("course_title"),
        )
        .join(User, User.id == DocumentRecord.user_id)
        .outerjoin(Course, Course.id == DocumentRecord.course_id)
        .where(func.lower(DocumentRecord.document_number) == normalized_number.lower())
    )

    row = result.first()

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return PublicDocumentVerifyResponse(
        document_number=row.document_number,
        document_type=row.document_type,
        title=row.title,
        holder_name=row.holder_name,
        course_title=row.course_title,
        issued_at=row.issued_at,
        registry_status=row.registry_status,
        verification_status="Документ подтвержден",
    )