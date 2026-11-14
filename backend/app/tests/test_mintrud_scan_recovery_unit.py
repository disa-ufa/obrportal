import pytest
from app.core.config import settings
from app.services.mintrud_scan_resources import inspect_manifest

@pytest.mark.parametrize('reason',['ACCESS_DENIED','STORAGE_UNAVAILABLE','INVALID_PATH'])
def test_root_classification(monkeypatch,reason):
    from app.services import mintrud_scan_resources as r
    from app.services.mintrud_scan_namespace import StorageFailure
    def fail(self):raise StorageFailure(reason)
    monkeypatch.setattr(r.Namespace,'__enter__',fail)
    result=inspect_manifest(str(settings.document_storage_dir)+'/x.pending.json')
    assert result['state']==reason and result['destructive_action_allowed'] is False
