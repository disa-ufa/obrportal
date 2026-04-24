from fastapi import APIRouter

from app.api.v1 import account, admin, auth, org, public, system

api_router = APIRouter()
api_router.include_router(system.router, tags=["system"])
api_router.include_router(auth.router)
api_router.include_router(account.router)
api_router.include_router(public.router)
api_router.include_router(admin.router)
api_router.include_router(org.router)
