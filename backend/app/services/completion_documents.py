from pathlib import Path
from uuid import uuid4

from sqlalchemy import select

from app.core.config import settings
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.base import utcnow
from app.models.course import Course
from app.models.document_generation_event import DocumentGenerationEvent
from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.learner_profile import LearnerProfile
from app.models.organization import Organization
from app.models.user import User
from app.services.document_pdf import render_completion_document_pdf
from app.services.document_storage import write_private_storage_file
from app.services.document_templates import (
    CompletionDocumentTemplateContext,
    build_completion_document_title,
    build_document_verification_url,
)
from app.services.learner_profile_fields import normalize_learner_name


COMPLETION_DOCUMENT_TEMPLATE_VERSION = "completion_pdf_v1"


def mark_completion_document_generation_metadata(
    document: DocumentRecord,
    *,
    actor_user: User | None = None,
    source: str = "auto_completion",
) -> None:
    document.generated_at = utcnow()
    document.generated_by_user_id = actor_user.id if actor_user else None
    document.generation_source = source
    document.generation_template_version = COMPLETION_DOCUMENT_TEMPLATE_VERSION


def build_completion_document_storage_path(document: DocumentRecord) -> Path:
    safe_document_number = "".join(
        ch if ch.isalnum() or ch in ("-", "_") else "_"
        for ch in str(document.document_number or "document")
    ).strip("_") or "document"
    timestamp = utcnow().strftime("%Y%m%dT%H%M%S%fZ")

    return (
        Path("generated")
        / "completion"
        / safe_document_number
        / f"{timestamp}-{uuid4().hex[:8]}.pdf"
    )


def add_completion_document_generation_event(
    *,
    document: DocumentRecord,
    session: AsyncSession,
    actor_user: User | None = None,
    source: str,
) -> DocumentGenerationEvent:
    event = DocumentGenerationEvent(
        document_id=document.id,
        storage_path=document.storage_path or "",
        source=source,
        template_version=document.generation_template_version or COMPLETION_DOCUMENT_TEMPLATE_VERSION,
        generated_at=document.generated_at or utcnow(),
        generated_by_user_id=actor_user.id if actor_user else None,
    )
    session.add(event)

    return event


def pick_organization_document_value(
    primary: str | None,
    fallback: str | None,
) -> str | None:
    normalized_primary = " ".join(str(primary or "").split())
    if normalized_primary:
        return normalized_primary

    normalized_fallback = " ".join(str(fallback or "").split())
    return normalized_fallback or None


def get_completion_document_public_base_url() -> str:
    return str(
        getattr(settings, "public_base_url", None)
        or getattr(settings, "frontend_public_url", None)
        or getattr(settings, "frontend_url", None)
        or getattr(settings, "app_public_url", None)
        or "http://localhost:5173"
    )


def build_completion_learner_full_name(
    *,
    learner_profile: LearnerProfile | None,
    learner: User | None,
) -> str:
    last_name = normalize_learner_name(
        getattr(learner_profile, "last_name", None)
    )
    first_name = normalize_learner_name(
        getattr(learner_profile, "first_name", None)
    )
    middle_name = normalize_learner_name(
        getattr(learner_profile, "middle_name", None)
    )

    profile_parts = [
        value
        for value in (last_name, first_name, middle_name)
        if value
    ]

    # Use profile identity data only when the core name is complete.
    # A partially filled self-service profile must not degrade an existing
    # account full name in an issued completion document.
    if last_name and first_name:
        return " ".join(profile_parts)

    user_full_name = normalize_learner_name(
        getattr(learner, "full_name", None)
    )
    if user_full_name:
        return user_full_name

    if profile_parts:
        return " ".join(profile_parts)

    return "ФИО обучающегося"


async def load_completion_document_context(
    enrollment: Enrollment,
    session: AsyncSession,
) -> tuple[
    Course | None,
    User | None,
    LearnerProfile | None,
    Organization | None,
]:
    course_result = await session.execute(
        select(Course).where(Course.id == enrollment.course_id)
    )
    course = course_result.scalar_one_or_none()

    learner_result = await session.execute(
        select(User).where(User.id == enrollment.user_id)
    )
    learner = learner_result.scalar_one_or_none()

    learner_profile_result = await session.execute(
        select(LearnerProfile).where(
            LearnerProfile.user_id == enrollment.user_id
        )
    )
    learner_profile = learner_profile_result.scalar_one_or_none()

    organization = None

    if enrollment.organization_id:
        organization_result = await session.execute(
            select(Organization).where(Organization.id == enrollment.organization_id)
        )
        organization = organization_result.scalar_one_or_none()

    return course, learner, learner_profile, organization


def write_completion_document_pdf_to_storage(
    *,
    enrollment: Enrollment,
    document: DocumentRecord,
    course: Course | None,
    learner: User | None,
    learner_profile: LearnerProfile | None = None,
    organization: Organization | None = None,
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
    learner_full_name = build_completion_learner_full_name(
        learner_profile=learner_profile,
        learner=learner,
    )

    verification_url = build_document_verification_url(
        public_base_url=get_completion_document_public_base_url(),
        verification_code=document.verification_code,
    )

    document_issuer_name = pick_organization_document_value(
        getattr(organization, "document_issuer_name", None),
        getattr(organization, "name", None) if organization else settings.document_org_name,
    )
    document_signer_position = pick_organization_document_value(
        getattr(organization, "document_signer_position", None),
        settings.document_signer_position,
    )
    document_signer_name = pick_organization_document_value(
        getattr(organization, "document_signer_name", None),
        settings.document_signer_full_name,
    )
    document_basis = pick_organization_document_value(
        getattr(organization, "document_basis", None),
        settings.document_org_license,
    )
    document_place = pick_organization_document_value(
        getattr(organization, "document_place", None),
        None,
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
            organization_name=document_issuer_name,
            organization_short_name=pick_organization_document_value(
                getattr(organization, "name", None),
                settings.document_org_short_name,
            ),
            organization_address=pick_organization_document_value(
                getattr(organization, "legal_address", None),
                settings.document_org_address,
            ),
            organization_inn=pick_organization_document_value(
                getattr(organization, "inn", None),
                settings.document_org_inn,
            ),
            organization_kpp=pick_organization_document_value(
                getattr(organization, "kpp", None),
                settings.document_org_kpp,
            ),
            organization_ogrn=pick_organization_document_value(
                getattr(organization, "ogrn", None),
                settings.document_org_ogrn,
            ),
            organization_license=settings.document_org_license,
            document_basis=document_basis,
            document_place=document_place,
            signer_position=document_signer_position,
            signer_full_name=document_signer_name,
        )
    )

    relative_path = build_completion_document_storage_path(document)

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
        document_changed = False

        if not existing_document.storage_path:
            (
                course,
                learner,
                learner_profile,
                organization,
            ) = await load_completion_document_context(
                enrollment,
                session,
            )
            existing_document.storage_path = write_completion_document_pdf_to_storage(
                enrollment=enrollment,
                document=existing_document,
                course=course,
                learner=learner,
                learner_profile=learner_profile,
                organization=organization,
            )
            mark_completion_document_generation_metadata(
                existing_document,
                source="auto_completion",
            )
            add_completion_document_generation_event(
                document=existing_document,
                session=session,
                source="auto_completion",
            )
            document_changed = True

        if document_changed:
            await session.flush()

        return existing_document

    (
        course,
        learner,
        learner_profile,
        organization,
    ) = await load_completion_document_context(
        enrollment,
        session,
    )

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
        learner_profile=learner_profile,
        organization=organization,
    )
    mark_completion_document_generation_metadata(
        document,
        source="auto_completion",
    )
    add_completion_document_generation_event(
        document=document,
        session=session,
        source="auto_completion",
    )
    await session.flush()

    return document
