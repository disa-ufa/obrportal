from contextlib import nullcontext
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from asyncpg import InvalidPasswordError
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import SecretStr
from sqlalchemy import create_engine
from sqlalchemy.exc import MultipleResultsFound, OperationalError

from app.api.v1 import admin, rbac
from app.core.config import Settings, settings
from app.main import app
from app.services import registry_batch_transaction as transaction
from app.services.registry_release_gate import (
    require_mintrud_batch_exports_enabled,
    require_registry_batch_exports_enabled,
)


HOST = "obr-m4p9-20261111-pg"
DATABASE = "obrportal_m4p9_workspace_20261111"
MARKER = "b8256951-8ce8-4b84-a0b0-4cf4dddbd194"
OTHER_MARKER = "37ee5c93-1529-4af7-8a30-acf05465bfa1"
URL = f"postgresql+asyncpg://obrportal_m4p9_login@{HOST}:5432/{DATABASE}"


@pytest.fixture(autouse=True)
def local_settings(monkeypatch):
    monkeypatch.setattr(settings, "environment", "local")
    monkeypatch.setattr(settings, "production_exports_enabled", False)
    monkeypatch.setattr(settings, "local_mintrud_xml_export_enabled", True)
    monkeypatch.setattr(settings, "local_mintrud_db_marker", SecretStr(MARKER))


@pytest.fixture
def session():
    return SimpleNamespace(
        get_bind=Mock(return_value=create_engine(URL)),
        no_autoflush=nullcontext(),
        execute=AsyncMock(return_value=Mock(one_or_none=Mock(return_value=(DATABASE, MARKER, "obrportal_m4p9_login", True)))),
        scalar=AsyncMock(side_effect=AssertionError("Unexpected business query")),
        commit=AsyncMock(),
        rollback=AsyncMock(),
    )


def assert_closed(error):
    assert error.status_code == 409
    assert error.detail["code"] == "registry.batch_export.disabled"


def test_local_settings_off_by_default(monkeypatch):
    monkeypatch.delenv("LOCAL_MINTRUD_XML_EXPORT_ENABLED", raising=False)
    monkeypatch.delenv("LOCAL_MINTRUD_DB_MARKER", raising=False)
    defaults = Settings(_env_file=None)
    assert defaults.local_mintrud_xml_export_enabled is False
    assert defaults.local_mintrud_db_marker is None


@pytest.mark.parametrize(
    ("setting", "value"),
    [
        ("local_mintrud_xml_export_enabled", False),
        ("environment", "production"),
        ("environment", "staging"),
        ("environment", "prodclone"),
        ("environment", "LOCAL"),
        ("local_mintrud_db_marker", None),
        ("local_mintrud_db_marker", SecretStr("")),
    ],
)
async def test_reject_local_settings_before_database_io(session, monkeypatch, setting, value):
    monkeypatch.setattr(settings, setting, value)
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)
    session.get_bind.assert_not_called()
    session.execute.assert_not_awaited()


@pytest.mark.parametrize(
    "url",
    [
        URL.replace(HOST, "prodclone"),
        URL.replace(HOST, "postgres"),
        URL.replace(DATABASE, "obrportal_prodclone"),
        URL.replace(DATABASE, "unverified"),
        URL.replace(":5432", ":5433"),
        URL.replace(":5432", ""),
        URL + "?host=prodclone",
    ],
)
async def test_reject_unexpected_session_binding(session, url):
    session.get_bind.return_value = create_engine(url)
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)
    session.execute.assert_not_awaited()


@pytest.mark.parametrize(
    "identity", [None, (DATABASE, None), (DATABASE, OTHER_MARKER), ("prodclone", MARKER)]
)
async def test_reject_unconfirmed_database_identity(session, identity):
    session.execute.return_value.one_or_none.return_value = identity
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)
    session.execute.assert_awaited_once()


@pytest.mark.parametrize(
    "failure",
    [
        ConnectionRefusedError(),
        TimeoutError(),
        OperationalError(None, None, RuntimeError("missing marker table or denied SELECT")),
    ],
)
async def test_reject_failed_identity_query(session, failure):
    session.execute.side_effect = failure
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)


async def test_reject_duplicate_marker_rows(session):
    session.execute.return_value.one_or_none.side_effect = MultipleResultsFound()
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)


async def test_reject_session_without_bound_engine(session):
    session.get_bind.return_value = None
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)
    session.execute.assert_not_awaited()


async def test_confirmed_identity_opens_mintrud_only(session):
    await require_mintrud_batch_exports_enabled(session)
    session.execute.assert_awaited_once()
    sql = str(session.execute.await_args.args[0])
    assert "pg_catalog.current_database()" in sql
    assert "obrportal_local_guard.mintrud_identity" in sql
    assert MARKER not in sql
    with pytest.raises(HTTPException) as error:
        require_registry_batch_exports_enabled()
    assert_closed(error.value)


async def test_global_authorization_keeps_existing_behavior(session, monkeypatch):
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "production_exports_enabled", True)
    monkeypatch.setattr(settings, "local_mintrud_db_marker", None)
    await require_mintrud_batch_exports_enabled(session)
    require_registry_batch_exports_enabled()
    session.get_bind.assert_not_called()
    session.execute.assert_not_awaited()


@pytest.fixture
def business_io(monkeypatch):
    stubs = {}
    for name in (
        "create_mintrud_registry_submission_batch",
        "create_frdo_registry_submission_batch",
        "create_admin_audit_event",
        "read_registry_submission_batch_artifact",
        "_compensate_failed_registry_batch_export",
    ):
        stub = Mock() if name == "read_registry_submission_batch_artifact" else AsyncMock()
        monkeypatch.setattr(admin, name, stub)
        stubs[name] = stub
    return stubs


@pytest.fixture
def client(monkeypatch, session, business_io):
    async def fake_db():
        yield session

    monkeypatch.setattr(admin, "get_registry_batch_db", fake_db)
    monkeypatch.setitem(app.dependency_overrides, transaction.get_registry_batch_db, fake_db)
    monkeypatch.setitem(app.dependency_overrides, admin.get_db, fake_db)
    with TestClient(app) as test_client:
        yield test_client


ROUTES = [
    ("POST", "mintrud", ""),
    ("GET", "mintrud", "/synthetic-batch/download"),
    ("POST", "frdo", ""),
    ("GET", "frdo", "/synthetic-batch/download"),
]


def request(client, method, registry, suffix, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    kwargs = {"json": {"obligation_ids": ["synthetic-obligation"]}} if method == "POST" else {}
    return client.request(method, f"/api/v1/admin/{registry}/batches{suffix}", headers=headers, **kwargs)


def allow_user(monkeypatch, permissions):
    fake_user = AsyncMock(return_value=SimpleNamespace(id="synthetic-user"))

    async def authenticated_user():
        return await fake_user()

    monkeypatch.setattr(transaction, "get_current_user", fake_user)
    monkeypatch.setattr(admin, "get_current_user", fake_user)
    monkeypatch.setattr(rbac, "get_user_permission_codes", AsyncMock(return_value=permissions))
    monkeypatch.setattr(transaction, "get_user_permission_codes", AsyncMock(return_value=permissions))
    monkeypatch.setitem(app.dependency_overrides, rbac.get_current_user, authenticated_user)


@pytest.mark.parametrize(("method", "registry", "suffix"), ROUTES)
def test_http_auth_and_permission_precede_export(client, session, monkeypatch, method, registry, suffix):
    assert request(client, method, registry, suffix).status_code == 401
    assert request(client, method, registry, suffix, "invalid").status_code == 401
    allow_user(monkeypatch, {"other.export"})
    assert request(client, method, registry, suffix, "synthetic").status_code == 403
    session.execute.assert_not_awaited()


@pytest.mark.parametrize(("method", "registry", "suffix"), ROUTES)
def test_http_refusal_has_no_business_side_effects(
    client, session, business_io, monkeypatch, method, registry, suffix
):
    allow_user(monkeypatch, {f"{registry}.export"})
    if registry == "mintrud":
        session.execute.return_value.one_or_none.return_value = None
    response = request(client, method, registry, suffix, "synthetic")
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "registry.batch_export.disabled"
    assert session.execute.await_count == (1 if registry == "mintrud" else 0)
    for stub in business_io.values():
        stub.assert_not_called()
    session.scalar.assert_not_awaited()
    session.commit.assert_not_awaited()


def test_http_local_mintrud_post_database_open_failure(client, monkeypatch):
    async def unavailable_db():
        if False:
            yield None
        raise ConnectionRefusedError("synthetic database unavailable")

    monkeypatch.setattr(admin, "get_registry_batch_db", unavailable_db)
    response = request(client, "POST", "mintrud", "", "synthetic")
    assert response.status_code == 409


@pytest.mark.parametrize(("method", "suffix"), [("POST", ""), ("GET", "/synthetic-batch/download")])
@pytest.mark.parametrize("failure", [ConnectionRefusedError(), InvalidPasswordError()])
def test_http_local_mintrud_auth_database_failure(client, monkeypatch, method, suffix, failure):
    unavailable = AsyncMock(side_effect=failure)
    monkeypatch.setattr(transaction, "get_current_user", unavailable)
    monkeypatch.setattr(admin, "get_current_user", unavailable)
    response = request(client, method, "mintrud", suffix, "synthetic")
    assert response.status_code == 409


def test_http_confirmed_mintrud_uses_same_session_before_creation(
    client, session, monkeypatch, business_io
):
    allow_user(monkeypatch, {"mintrud.export"})

    async def verify_writer(writer_session, **kwargs):
        assert writer_session is session
        session.execute.assert_awaited_once()
        raise admin.RegistrySubmissionBatchError("synthetic downstream veto")

    business_io["create_mintrud_registry_submission_batch"].side_effect = verify_writer
    response = request(client, "POST", "mintrud", "", "synthetic")
    assert response.status_code == 409
    assert response.json()["detail"] == "synthetic downstream veto"
    business_io["create_mintrud_registry_submission_batch"].assert_awaited_once()
    business_io["create_admin_audit_event"].assert_not_called()
    session.commit.assert_not_awaited()


def test_http_confirmed_mintrud_download_uses_same_session(
    client, session, monkeypatch, business_io
):
    allow_user(monkeypatch, {"mintrud.export"})
    batch = SimpleNamespace(id="synthetic-batch", schema_version="1.0.9")

    async def read_batch(*args):
        session.execute.assert_awaited_once()
        return batch

    session.scalar.side_effect = read_batch
    business_io["read_registry_submission_batch_artifact"].return_value = b"<synthetic/>"
    response = request(client, "GET", "mintrud", "/synthetic-batch/download", "synthetic")
    assert response.status_code == 200
    assert response.content == b"<synthetic/>"
    business_io["read_registry_submission_batch_artifact"].assert_called_once_with(batch)


@pytest.mark.parametrize("identity", [(DATABASE, MARKER, "obrportal_stage", True), (DATABASE, MARKER, "obrportal_m4p9_login", False)])
async def test_reject_privileged_or_wrong_marker_role(session, identity):
    session.execute.return_value.one_or_none.return_value = identity
    with pytest.raises(HTTPException) as error:
        await require_mintrud_batch_exports_enabled(session)
    assert_closed(error.value)
