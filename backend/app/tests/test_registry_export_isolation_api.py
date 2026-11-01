"""Release 1.0 single-export refusal matrices (old names retained for traceability); PostgreSQL cases use a disposable database.

Auth is overridden. Real approval rejects the pending PG fixture; these are
focused route/transaction integration tests, not complete artifact exports.
"""
import asyncio

from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock
from uuid import uuid4

from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
import pytest
from sqlalchemy import event, func, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.api.v1 import admin, rbac
from app.api.v1.auth import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.registry_obligation import RegistryObligation, RegistrySubmissionAttempt
from app.services.compliance_registry_attempts import RegistrySubmissionAttemptError
import test_registry_applicability_writer_pg as pg_tests
from test_registry_applicability_writer_pg import _veto_fixture

# Reuse the unique-database fixture without a second migration/cleanup protocol.
pg_applicability_db = pg_tests.pg_applicability_db

ROUTES = [(registry, kind) for registry in ("frdo", "mintrud")
          for kind in ("export", "portal-artifact")]
ISOLATION_ERROR = "registry.attempt_veto_requires_read_committed"


def route_app(monkeypatch, session_dependency, registry, *, permitted=True):
    app = FastAPI()
    app.include_router(admin.router)
    app.dependency_overrides[get_db] = session_dependency

    async def actor():
        return SimpleNamespace(id=str(uuid4()))

    app.dependency_overrides[get_current_user] = actor
    monkeypatch.setattr(rbac, "get_user_permission_codes", AsyncMock(
        return_value={registry + ".export"} if permitted else set(),
    ))
    # The Mintrud route checks its contract before checking approval.
    monkeypatch.setattr(admin, "require_registry_portal_artifact_contract", Mock(
        return_value=SimpleNamespace(extension=".xml", contract_version="test"),
    ))
    return app


async def post(app, registry, kind, obligation_id):
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test.local") as client:
        return await client.post(
            f"/admin/{registry}/obligations/{obligation_id}/{kind}"
        )


def fake_session(registry, isolation, *, exists=True, disappear=False):
    statements = []
    obligation = SimpleNamespace(
        id=str(uuid4()), enrollment_id=str(uuid4()), registry=registry,
        approval_snapshot_json={"course": {"regulatory_program_type": "vocational_training"}},
    )

    async def execute(query):
        sql = str(query).strip().lower()
        statements.append(sql)
        if sql == "show transaction_isolation":
            return Mock(scalar_one=Mock(return_value=isolation))
        locked = "for update" in sql
        value = (obligation if locked else obligation.id) if exists else None
        if locked and disappear:
            value = None
        return Mock(scalar_one_or_none=Mock(return_value=value))

    session = SimpleNamespace(
        execute=AsyncMock(side_effect=execute), scalar=AsyncMock(return_value=0),
        add=Mock(), flush=AsyncMock(), commit=AsyncMock(), rollback=AsyncMock(),
    )
    return session, obligation, statements


def fake_route(monkeypatch, registry, isolation, **kwargs):
    session, obligation, statements = fake_session(registry, isolation, **kwargs)

    async def db():
        yield session

    app = route_app(monkeypatch, db, registry)
    approval = AsyncMock(side_effect=RegistrySubmissionAttemptError("test.approval_reached"))
    monkeypatch.setattr(admin, "validate_registry_approval_current", approval)
    attach, audit = AsyncMock(), AsyncMock()
    monkeypatch.setattr(admin, "attach_registry_submission_artifact", attach)
    monkeypatch.setattr(admin, "create_admin_audit_event", audit)
    return app, session, obligation, statements, approval, attach, audit


@pytest.mark.parametrize("registry,kind", ROUTES)
@pytest.mark.parametrize("isolation", ["repeatable read", "serializable"])
async def test_api_unsafe_isolation_rejected_before_obligation_lock(monkeypatch, registry, kind, isolation):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    app, session, row, sql, approval, attach, audit = fake_route(monkeypatch, registry, isolation)
    response = await post(app, registry, kind, row.id)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "registry.single_export.disabled"
    assert sql == []  # No discovery, lock, approval, or business statement.
    approval.assert_not_awaited()
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()


@pytest.mark.parametrize("registry,kind", ROUTES)
@pytest.mark.parametrize("enabled", [False, True])
async def test_api_rc_reaches_approval_with_compatible_sql_order(monkeypatch, registry, kind, enabled):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", enabled)
    app, session, row, sql, approval, attach, audit = fake_route(monkeypatch, registry, "read committed")
    response = await post(app, registry, kind, row.id)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "registry.single_export.disabled"
    assert sql == []  # No discovery, lock, approval, or business statement.
    approval.assert_not_awaited()
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()


@pytest.mark.parametrize("registry,kind", ROUTES)
@pytest.mark.parametrize("enabled", [False, True])
@pytest.mark.parametrize("isolation", ["read committed", "repeatable read", "serializable"])
async def test_api_missing_obligation_keeps_404(monkeypatch, registry, kind, enabled, isolation):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", enabled)
    app, session, row, sql, approval, attach, audit = fake_route(
        monkeypatch, registry, isolation, exists=False,
    )
    response = await post(app, registry, kind, row.id)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "registry.single_export.disabled"
    assert sql == []  # No discovery, lock, approval, or business statement.
    approval.assert_not_awaited()
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()


@pytest.mark.parametrize("registry,kind", ROUTES)
async def test_api_disappearance_after_discovery_still_returns_404(monkeypatch, registry, kind):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    app, session, row, sql, approval, attach, audit = fake_route(
        monkeypatch, registry, "read committed", disappear=True,
    )
    response = await post(app, registry, kind, row.id)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "registry.single_export.disabled"
    assert sql == []  # No discovery, lock, approval, or business statement.
    approval.assert_not_awaited()
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()


@pytest.mark.parametrize("registry,kind", ROUTES)
async def test_api_forbidden_precedes_transaction_guard(monkeypatch, registry, kind):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session, row, sql = fake_session(registry, "serializable")

    async def db():
        yield session

    app = route_app(monkeypatch, db, registry, permitted=False)
    response = await post(app, registry, kind, row.id)
    assert response.status_code == 403
    assert sql == []
    session.add.assert_not_called()


@pytest.mark.parametrize("registry,kind", ROUTES)
@pytest.mark.parametrize("enabled", [False, True])
@pytest.mark.parametrize("decision", [None, "required", "not_required", "needs_review"])
async def test_api_preserves_partial_veto_contract(monkeypatch, registry, kind, enabled, decision):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", enabled)
    app, session, row, sql, approval, attach, audit = fake_route(monkeypatch, registry, "read committed")
    approval.side_effect = None
    session.scalar.side_effect = [decision, 0] if enabled else [0]
    monkeypatch.setattr(admin, "build_registry_export_package", Mock(return_value={"test": True}))
    monkeypatch.setattr(admin, "serialize_registry_export_package", Mock(return_value=b"test"))
    monkeypatch.setattr(admin, "require_frdo_po_portal_contract", Mock(
        return_value=SimpleNamespace(extension=".xlsx", template_contract_version="test"),
    ))
    monkeypatch.setattr(admin, "prepare_frdo_po_portal_artifact", Mock(return_value=b"test"))
    monkeypatch.setattr(admin, "serialize_mintrud_eisot_xml_v109", Mock(return_value=b"test"))
    monkeypatch.setattr(admin, "validate_mintrud_eisot_xml_v109", Mock())
    attach.side_effect = RegistrySubmissionAttemptError("test.attach_reached")
    blocked = enabled and decision in {"not_required", "needs_review"}
    response = await post(app, registry, kind, row.id)
    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "registry.single_export.disabled"
    assert sql == []  # No discovery, lock, approval, or business statement.
    approval.assert_not_awaited()
    attach.assert_not_awaited()
    audit.assert_not_awaited()
    session.add.assert_not_called()
    session.flush.assert_not_awaited()
    session.commit.assert_not_awaited()
    session.rollback.assert_not_awaited()


@pytest.mark.parametrize("registry,kind", ROUTES)
@pytest.mark.parametrize("enabled,isolation", [
    (True, "REPEATABLE READ"), (True, "SERIALIZABLE"),
    (True, "READ COMMITTED"), (False, "READ COMMITTED"),
])
async def test_pg_http_actual_isolation_and_lock_order(pg_applicability_db, monkeypatch, registry, kind, enabled, isolation):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", enabled)
    engine = create_async_engine(pg_applicability_db)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    statements = []
    try:
        _, obligation_id = await _veto_fixture(maker, registry)

        async def db():
            async with maker() as session:
                await session.connection(execution_options={"isolation_level": isolation})
                await session.execute(text("SELECT 1"))  # Request transaction already active.
                yield session

        def capture(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement.strip().lower())

        app = route_app(monkeypatch, db, registry)
        attach, audit = AsyncMock(), AsyncMock()
        monkeypatch.setattr(admin, "attach_registry_submission_artifact", attach)
        monkeypatch.setattr(admin, "create_admin_audit_event", audit)
        async with maker() as blocker:
            if enabled and isolation != "READ COMMITTED":
                # A real conflicting row lock must not delay the early refusal.
                await blocker.execute(select(RegistryObligation).where(
                    RegistryObligation.id == obligation_id,
                ).with_for_update())
            event.listen(engine.sync_engine, "before_cursor_execute", capture)
            try:
                response = await asyncio.wait_for(
                    post(app, registry, kind, obligation_id), timeout=5,
                )
            finally:
                event.remove(engine.sync_engine, "before_cursor_execute", capture)
                await blocker.rollback()
        assert response.status_code == 409
        sql = [statement for statement in statements if statement != "select 1"]
        assert response.json()["detail"]["code"] == "registry.single_export.disabled"
        assert sql == []  # Even a conflicting real row lock is not reached.
        assert not any("pg_advisory" in statement for statement in sql)
        assert not any(statement.startswith(("insert ", "update ", "delete ")) for statement in sql)
        attach.assert_not_awaited()
        audit.assert_not_awaited()
        async with maker() as session:
            assert await session.scalar(select(func.count(RegistrySubmissionAttempt.id)).where(
                RegistrySubmissionAttempt.obligation_id == obligation_id,
            )) == 0
    finally:
        await engine.dispose()


@pytest.mark.parametrize("registry,kind", ROUTES)
@pytest.mark.parametrize("isolation", ["READ COMMITTED", "REPEATABLE READ", "SERIALIZABLE"])
@pytest.mark.parametrize("wrong_registry", [False, True])
async def test_pg_http_missing_or_other_registry_keeps_404(
    pg_applicability_db, monkeypatch, registry, kind, isolation, wrong_registry,
):
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    engine = create_async_engine(pg_applicability_db)
    maker = async_sessionmaker(engine, expire_on_commit=False)
    statements = []
    try:
        target_id = str(uuid4())
        if wrong_registry:
            other = "mintrud" if registry == "frdo" else "frdo"
            _, target_id = await _veto_fixture(maker, other)

        async def db():
            async with maker() as session:
                await session.connection(execution_options={"isolation_level": isolation})
                yield session

        def capture(conn, cursor, statement, parameters, context, executemany):
            statements.append(statement.strip().lower())

        app = route_app(monkeypatch, db, registry)
        event.listen(engine.sync_engine, "before_cursor_execute", capture)
        try:
            response = await post(app, registry, kind, target_id)
        finally:
            event.remove(engine.sync_engine, "before_cursor_execute", capture)
        assert response.status_code == 409
        assert response.json()["detail"]["code"] == "registry.single_export.disabled"
        assert statements == []
        async with maker() as session:
            assert await session.scalar(select(func.count(RegistrySubmissionAttempt.id)).where(
                RegistrySubmissionAttempt.obligation_id == target_id,
            )) == 0
    finally:
        await engine.dispose()


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("enabled", [False, True])
@pytest.mark.parametrize("isolation", ["read committed", "repeatable read", "serializable"])
async def test_retained_service_discovery_isolation_before_lock(monkeypatch, registry, enabled, isolation):
    """Direct reusable helper contract, never bypass the closed HTTP route."""
    from fastapi import HTTPException
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", enabled)
    session, row, sql = fake_session(registry, isolation)
    if enabled and isolation != "read committed":
        with pytest.raises(HTTPException) as error:
            await admin.get_admin_registry_export_obligation_or_404(row.id, session, registry=registry)
        assert error.value.status_code == 409 and error.value.detail == ISOLATION_ERROR
        assert sql[-1] == "show transaction_isolation"
        assert not any("for update" in s for s in sql)
        session.rollback.assert_awaited_once()
    else:
        result = await admin.get_admin_registry_export_obligation_or_404(row.id, session, registry=registry)
        assert result is row
        lock_index = next(i for i,s in enumerate(sql) if "for update" in s)
        if enabled:
            assert sql.index("show transaction_isolation") < lock_index
        else:
            assert len(sql) == 1 and lock_index == 0
    session.add.assert_not_called()
    session.commit.assert_not_awaited()


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize("disappear", [False, True])
async def test_retained_service_missing_or_disappearing_obligation(monkeypatch, registry, disappear):
    from fastapi import HTTPException
    monkeypatch.setattr(settings, "registry_attempt_applicability_veto_enabled", True)
    session,row,sql=fake_session(registry,"read committed",exists=disappear,disappear=disappear)
    with pytest.raises(HTTPException) as error:
        await admin.get_admin_registry_export_obligation_or_404(row.id,session,registry=registry)
    assert error.value.status_code==404
    assert error.value.detail == ("FRDO" if registry == "frdo" else "Mintrud") + " obligation not found"
    assert any("for update" in s for s in sql)==disappear
    session.add.assert_not_called()
    session.commit.assert_not_awaited()
