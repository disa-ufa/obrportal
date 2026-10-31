"""One request owner for authentication, P0, artifact, audit and COMMIT."""
from fastapi import Depends, HTTPException
from app.db.session import AsyncSessionLocal
from app.api.v1.auth import get_current_user, oauth2_scheme
from app.api.v1.rbac import get_user_permission_codes
from app.services.registry_catalog_policy_fence import begin_registry_catalog_policy_fence, RegistryCatalogPolicyFence
from app.services.registry_action_lockset import RegistryActionLockError
from app.services.registry_applicability_export_guard import RegistryApplicabilityGateError
from app.services.registry_batch_p0_scope import require_registry_batch_p0_scope

KEY = 'registry.batch.transaction.fence'

async def get_registry_batch_db():
    async with AsyncSessionLocal() as session:
        fence = await begin_registry_catalog_policy_fence(session=session, mode='exclusive')
        session.info[KEY] = fence
        try:
            yield session
        finally:
            session.info.pop(KEY, None)
            if session.in_transaction():
                await session.rollback()

def require_registry_batch_user(registry):
    async def dependency(token=Depends(oauth2_scheme), session=Depends(get_registry_batch_db)):
        user = await get_current_user(token=token, session=session)
        if registry + '.export' not in await get_user_permission_codes(user, session):
            raise HTTPException(status_code=403, detail='Permission required: ' + registry + '.export')
        return user
    return dependency

async def require_batch_transaction(session, *, registry, actor_id, obligation_ids, error_type):
    try:
        fence = session.info.get(KEY)
        if not isinstance(fence, RegistryCatalogPolicyFence):
            raise RegistryActionLockError('registry.batch_transaction_required')
        fence.require_session(session, 'exclusive')
        await require_registry_batch_p0_scope(session=session, fence=fence,
            registry=registry, actor_id=actor_id, obligation_ids=obligation_ids)
    except (RegistryActionLockError, RegistryApplicabilityGateError) as exc:
        raise error_type(str(exc)) from exc
