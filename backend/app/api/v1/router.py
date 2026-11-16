from fastapi import APIRouter

from app.api.v1 import (
    account,
    admin,
    auth,
    org,
    public,
    registry_applicability_preview,
    registry_historical_mintrud_api,
    system,
)

api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(auth.router)
api_router.include_router(account.router)
api_router.include_router(public.router)
api_router.include_router(admin.router)
api_router.include_router(registry_applicability_preview.router)
api_router.include_router(registry_historical_mintrud_api.router)
api_router.include_router(org.router)

from app.api.v1 import mintrud_local_workflow
api_router.include_router(mintrud_local_workflow.router)
