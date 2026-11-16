"""GET-only additions; the legacy draft list and all writes retain their contracts."""
from typing import Literal
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.api.v1.rbac import require_permission
from app.db.session import get_db
from app.models.course import Course
from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol as Protocol, MintrudKnowledgeProtocolMember as Member
from app.models.registry_submission_batch import RegistrySubmissionBatch as Batch, RegistrySubmissionBatchItem as Item
from app.models.user import User
from app.services.mintrud_protocol_export_preview import composition, read_stable_protocol_inputs, preview_protocol_export

router = APIRouter()


@router.get("/catalog")
async def protocol_catalog(
    q: str = Query(default="", max_length=128),
    course_id: UUID | None = None,
    status: Literal["draft", "recorded"] | None = None,
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    _: User = Depends(require_permission("mintrud.read")),
    session: AsyncSession = Depends(get_db),
) -> dict:
    conditions = []
    if q.strip():
        conditions.append(or_(Protocol.protocol_number.icontains(q.strip(), autoescape=True), Course.title.icontains(q.strip(), autoescape=True)))
    if course_id:
        conditions.append(Protocol.course_id == str(course_id))
    if status:
        conditions.append(Protocol.status == status)
    base = select(Protocol).outerjoin(Course, Course.id == Protocol.course_id).where(*conditions)
    count = select(func.count()).select_from(base.subquery())
    participants = select(func.count(Member.id)).where(Member.protocol_id == Protocol.id).correlate(Protocol).scalar_subquery()
    history = select(Item.id).join(Batch, Batch.id == Item.batch_id).join(Member, Member.obligation_id == Item.obligation_id).where(Member.protocol_id == Protocol.id, Batch.registry == "mintrud").correlate(Protocol).exists()
    query = select(Protocol, Course.title, participants, history).outerjoin(Course, Course.id == Protocol.course_id).where(*conditions).order_by(Protocol.created_at.desc(), Protocol.id).offset(offset).limit(limit).execution_options(populate_existing=True)
    with session.no_autoflush:
        total = await session.scalar(count)
        rows = (await session.execute(query)).all()
        if total != await session.scalar(count):
            raise HTTPException(409, "Список изменился во время чтения. Обновите страницу.")
    items = [{"id": p.id, "course_id": p.course_id, "course_title": title, "protocol_number": p.protocol_number, "protocol_date": p.protocol_date, "status": p.status, "participant_count": size, "has_export_history": bool(exported), "data_check": "not_checked"} for p, title, size, exported in rows]
    return {"items": items, "total": total, "offset": offset, "limit": limit, "has_more": offset + len(items) < total, "read_only": True}


@router.get("/{protocol_id}/participants")
async def protocol_participants(protocol_id: UUID, _: User = Depends(require_permission("mintrud.read")), session: AsyncSession = Depends(get_db)) -> dict:
    snapshot, revision = await read_stable_protocol_inputs(session, str(protocol_id))
    return composition(snapshot, revision)


@router.get("/{protocol_id}/export-preview")
async def protocol_export_preview(protocol_id: UUID, _: User = Depends(require_permission("mintrud.read")), session: AsyncSession = Depends(get_db)) -> dict:
    return await preview_protocol_export(session, str(protocol_id))
