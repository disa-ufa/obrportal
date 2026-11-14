"""Local-only read-only diagnostics and explicitly confirmed rule persistence."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from app.api.v1.auth import get_current_user, oauth2_scheme
from app.api.v1.rbac import require_permission, get_user_permission_codes
from app.db.session import engine
from app.models.role import Role, UserRole
from app.services.registry_batch_transaction import get_registry_batch_db
from app.services.registry_release_gate import require_mintrud_batch_exports_enabled
from app.services.mintrud_local_workflow import require_local_workspace, read_review, confirm_review

router=APIRouter(prefix='/admin/mintrud/local-workflow',tags=['admin'])

async def readonly_db():
    async with AsyncSession(engine,autoflush=False,expire_on_commit=False) as session:
        try:
            await session.execute(text('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY'))
            await require_local_workspace(session)
            yield session
        finally: await session.rollback()

async def confirm_user(token=Depends(oauth2_scheme),session=Depends(get_registry_batch_db)):
    user=await get_current_user(token=token,session=session)
    codes=await get_user_permission_codes(user,session)
    admin=await session.scalar(select(Role.id).join(UserRole,UserRole.role_id==Role.id).where(UserRole.user_id==user.id,UserRole.organization_id.is_(None),Role.code=='admin').limit(1))
    if admin is None or not {'mintrud.read','mintrud.approve'}.issubset(codes):
        raise HTTPException(403,'Требуется администратор с правами просмотра и утверждения Минтруда.')
    return user

@router.get('/export-status')
async def export_status(_=Depends(require_permission('mintrud.read')),session=Depends(readonly_db)):
    try:
        await require_mintrud_batch_exports_enabled(session)
    except (HTTPException, SQLAlchemyError, OSError, TimeoutError):
        return {'enabled':False,'code':'registry.batch_export.disabled','message':'Создание XML-партий отключено или идентичность локальной базы не подтверждена. Подготовка данных и просмотр истории доступны.','read_only':True}
    return {'enabled':True,'code':'mintrud.local_export.available','message':'Локальное создание XML разрешено. Готовность, применимость, утверждение и история каждой записи проверяются отдельно.','read_only':True}

@router.get('/obligations/{obligation_id}')
async def review(obligation_id:UUID,_=Depends(require_permission('mintrud.read')),session=Depends(readonly_db)):
    try: return (await read_review(session,str(obligation_id)))[0]
    except (ValueError,SQLAlchemyError) as exc:
        raise HTTPException(409,{'code':'mintrud.review_unverified','message':'Достоверность данных не подтверждена. Нужна сверка связей и истории.'}) from exc

class ConfirmRequest(BaseModel):
    model_config=ConfigDict(extra='forbid')
    expected_version:int=Field(ge=0)
    expected_input_fingerprint:str=Field(pattern=r'^[a-f0-9]{64}$')
    confirmed:bool

@router.post('/obligations/{obligation_id}/confirm')
async def confirm(obligation_id:UUID,body:ConfirmRequest,user=Depends(confirm_user),session=Depends(get_registry_batch_db)):
    if body.confirmed is not True: raise HTTPException(422,'Требуется явное подтверждение расчёта.')
    try:
        result=await confirm_review(session,str(obligation_id),body.expected_version,body.expected_input_fingerprint,str(user.id))
        await session.commit()
        return result
    except HTTPException:
        await session.rollback()
        raise
    except (ValueError,SQLAlchemyError) as exc:
        await session.rollback()
        raise HTTPException(409,{'code':'mintrud.review_blocked','message':'Решение не сохранено. Повторите проверку; при наличии утверждения или истории нужна отдельная сверка.'}) from exc
