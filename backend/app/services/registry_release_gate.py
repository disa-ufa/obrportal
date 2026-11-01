"""Release gate; opening requires explicit environment authorization."""
from fastapi import HTTPException
from app.core.config import settings


def require_registry_batch_exports_enabled() -> None:
    if not settings.production_exports_enabled:
        raise HTTPException(status_code=409, detail={
            "code": "registry.batch_export.disabled",
            "message": "Пакетная выгрузка отключена в этой среде.",
        })
