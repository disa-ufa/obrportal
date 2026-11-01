import inspect
from unittest.mock import AsyncMock
import pytest
from fastapi import HTTPException
from app.api.v1 import admin
from app.core.config import settings, Settings

@pytest.mark.parametrize("name", ["prepare_admin_mintrud_submission_batch", "prepare_admin_frdo_submission_batch", "download_admin_mintrud_submission_batch", "download_admin_frdo_submission_batch"])
async def test_release_gate_before_any_business_use(monkeypatch, name):
    monkeypatch.setattr(settings, "production_exports_enabled", False)
    fn=getattr(admin,name)
    trap=AsyncMock(side_effect=AssertionError("Unexpected business operation"))
    kwargs={k:trap for k in inspect.signature(fn).parameters}
    with pytest.raises(HTTPException) as err:
        await fn(**kwargs)
    assert err.value.status_code==409
    assert err.value.detail["code"]=="registry.batch_export.disabled"
    trap.assert_not_called()

def test_default_release_gate_closed(monkeypatch):
    monkeypatch.delenv("PRODUCTION_EXPORTS_ENABLED",raising=False)
    assert Settings(_env_file=None).production_exports_enabled is False
