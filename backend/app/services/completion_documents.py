from pathlib import Path

from sqlalchemy import select

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.user import User
from app.services.document_pdf import render_completion_document_pdf
from app.services.document_storage import write_private_storage_file
from app.services.document_templates import (
    CompletionDocumentTemplateContext,
    build_completion_document_title,
    build_document_verification_url,
)



def get_completion_document_public_base_url() -> str:
    return str(
        getattr(settings, "public_base_url", None)
        or getattr(settings, "frontend_public_url", None)
        or getattr(settings, "frontend_url", None)
        or getattr(settings, "app_public_url", None)
        or "http://localhost:5173"
    )


async def load_completion_document_context(
    enrollment: Enrollment,
    session: AsyncSession,
) -> tuple[Course | None, User | None]:
    course_result = await session.execute(
        select(Course).where(Course.id == enrollment.course_id)
    )
    course = course_result.scalar_one_or_none()

    learner_result = await session.execute(
        select(User).where(User.id == enrollment.user_id)
    )
    learner = learner_result.scalar_one_or_none()

    return course, learner


def write_completion_document_pdf_to_storage(
    *,
    enrollment: Enrollment,
    document: DocumentRecord,
    course: Course | None,
    learner: User | None,
) -> str:
    course_title = (
        course.title
        if course and course.title
        else "\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"
    )
    document_type = (
        document.document_type
        or "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442"
    )
    learner_full_name = (
        learner.full_name
        if learner and learner.full_name
        else "\u0424\u0418\u041e \u043e\u0431\u0443\u0447\u0430\u044e\u0449\u0435\u0433\u043e\u0441\u044f"
    )

    verification_url = build_document_verification_url(
        public_base_url=get_completion_document_public_base_url(),
        verification_code=document.verification_code,
    )

    pdf_bytes = render_completion_document_pdf(
        CompletionDocumentTemplateContext(
            learner_full_name=learner_full_name,
            course_title=course_title,
            document_type=document_type,
            document_number=document.document_number,
            verification_code=document.verification_code,
            completed_at=enrollment.completed_at,
            course_hours=course.hours if course else None,
            verification_url=verification_url,
        )
    )

    relative_path = Path("generated") / "completion" / f"{document.document_number}.pdf"

    return write_private_storage_file(relative_path, pdf_bytes)


async def ensure_completion_document_for_enrollment(
    enrollment: Enrollment,
    session: AsyncSession,
) -> DocumentRecord:
    existing_result = await session.execute(
        select(DocumentRecord)
        .where(DocumentRecord.enrollment_id == enrollment.id)
        .limit(1)
    )
    existing_document = existing_result.scalar_one_or_none()

    if existing_document is not None:
        if not existing_document.storage_path:
            course, learner = await load_completion_document_context(enrollment, session)
            existing_document.storage_path = write_completion_document_pdf_to_storage(
                enrollment=enrollment,
                document=existing_document,
                course=course,
                learner=learner,
            )
            await session.flush()

        return existing_document

    course, learner = await load_completion_document_context(enrollment, session)

    document_type = (
        course.document_type
        if course and course.document_type
        else "\u0421\u0435\u0440\u0442\u0438\u0444\u0438\u043a\u0430\u0442"
    )
    course_title = (
        course.title
        if course and course.title
        else "\u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u0430\u044f \u043f\u0440\u043e\u0433\u0440\u0430\u043c\u043c\u0430"
    )

    document = DocumentRecord(
        user_id=enrollment.user_id,
        course_id=enrollment.course_id,
        enrollment_id=enrollment.id,
        document_number=f"AUTO-{str(enrollment.id).replace('-', '')[:16].upper()}",
        document_type=document_type,
        title=build_completion_document_title(
            document_type=document_type,
            course_title=course_title,
        ),
        status="draft",
    )
    session.add(document)
    await session.flush()

    document.storage_path = write_completion_document_pdf_to_storage(
        enrollment=enrollment,
        document=document,
        course=course,
        learner=learner,
    )
    await session.flush()

    return document
