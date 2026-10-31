"""Real PostgreSQL and filesystem regression for batch COMMIT compensation."""

from __future__ import annotations

import asyncio
import os
import re
from hashlib import sha256
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import text
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.api.v1.admin as admin
from app.core.config import settings
from app.models.registry_submission_batch import RegistrySubmissionBatch
from app.services.document_storage import write_private_storage_file_exclusive


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "phase",
    ["success", "before_commit", "committed_ack_lost"],
)
def test_m231d2d_real_pg_batch_commit(
    tmp_path, monkeypatch, registry, phase,
):
    """A committed batch probe must never lose its physical artifact."""

    test_db = os.environ.get("M231D2D_TEST_DB", "")
    if not test_db:
        pytest.skip("Opt-in disposable PostgreSQL test only")

    assert re.fullmatch(r"m231d2d_batch_[0-9a-f]{12}", test_db)

    url = make_url(os.environ["DATABASE_URL"])
    assert url.host == "postgres"
    assert url.database == test_db

    monkeypatch.setattr(
        settings, "document_storage_dir", str(tmp_path)
    )

    relative_path = (
        f"generated/registry/{registry}/"
        f"m231d2d-{phase}.bin"
    )
    physical_file = tmp_path.joinpath(*relative_path.split("/"))
    content = f"real-pg-batch-{registry}-{phase}".encode()
    expected_sha256 = sha256(content).hexdigest()

    batch = SimpleNamespace(
        id=str(uuid4()),
        registry=registry,
        status="exported",
        artifact_kind="portal-upload-artifact",
        transport="file",
        schema_version=("1.0.9" if registry == "mintrud" else "frdo-po-working-reference-v1"),
        obligation_count=1,
        record_count=1,
        artifact_path=relative_path,
        artifact_sha256=expected_sha256,
    )

    service_name = {
        "frdo": "create_frdo_registry_submission_batch",
        "mintrud": "create_mintrud_registry_submission_batch",
    }[registry]

    builder_name = {
        "frdo": "build_admin_frdo_submission_batch_item",
        "mintrud": "build_admin_mintrud_submission_batch_item",
    }[registry]

    endpoint_name = {
        "frdo": "prepare_admin_frdo_submission_batch",
        "mintrud": "prepare_admin_mintrud_submission_batch",
    }[registry]

    async def create_batch(session, *, obligation_ids, generated_by_user_id):
        assert obligation_ids == ["probe-obligation"]
        assert generated_by_user_id == "probe-user"

        saved_path = write_private_storage_file_exclusive(
            relative_path, content
        )
        assert saved_path == relative_path

        await session.execute(
            text(
                "INSERT INTO m231d2d_batch_ack_probe "
                "(registry, phase, artifact_path, artifact_sha256) "
                "VALUES (:registry, :phase, :path, :hash)"
            ),
            {
                "registry": registry,
                "phase": phase,
                "path": relative_path,
                "hash": expected_sha256,
            },
        )
        # The production COMMIT probe reads this real table in a separate session.
        await session.execute(
            RegistrySubmissionBatch.__table__.insert().values(**vars(batch))
        )
        return batch

    async def audit_event(session, **kwargs):
        if phase == "before_commit":
            raise RuntimeError("simulated pre-commit audit failure")

    monkeypatch.setattr(admin, service_name, create_batch)
    monkeypatch.setattr(
        admin, builder_name,
        lambda value: SimpleNamespace(id=value.id),
    )
    monkeypatch.setattr(
        admin, "create_admin_audit_event", audit_event,
    )

    calls = {"commits": 0, "rollbacks": 0}

    async def scenario():
        engine = create_async_engine(
            url,
            connect_args={
                "server_settings": {"statement_timeout": "12000"}
            },
        )
        try:
            async with engine.begin() as connection:
                await connection.execute(
                    text(
                        "CREATE TABLE IF NOT EXISTS "
                        "m231d2d_batch_ack_probe ("
                        "registry TEXT NOT NULL, "
                        "phase TEXT NOT NULL, "
                        "artifact_path TEXT NOT NULL, "
                        "artifact_sha256 TEXT NOT NULL, "
                        "PRIMARY KEY (registry, phase))"
                    )
                )

            maker = async_sessionmaker(
                engine, expire_on_commit=False
            )

            async with maker() as real_session:
                class SessionProxy:
                    async def execute(self, *args, **kwargs):
                        return await real_session.execute(
                            *args, **kwargs
                        )

                    async def commit(self):
                        calls["commits"] += 1
                        await real_session.commit()

                        if phase == "committed_ack_lost":
                            raise ConnectionError(
                                "simulated batch COMMIT ACK loss"
                            )

                    async def rollback(self):
                        calls["rollbacks"] += 1
                        await real_session.rollback()

                endpoint = getattr(admin, endpoint_name)

                async def invoke():
                    return await endpoint(
                        payload=SimpleNamespace(
                            obligation_ids=["probe-obligation"]
                        ),
                        request=object(),
                        current_user=SimpleNamespace(
                            id="probe-user"
                        ),
                        session=SessionProxy(),
                    )

                if phase == "success":
                    response = await invoke()
                    assert response.id == batch.id
                else:
                    expected_exception = (
                        RuntimeError
                        if phase == "before_commit"
                        else ConnectionError
                    )
                    with pytest.raises(
                        expected_exception, match="simulated"
                    ):
                        await invoke()

            async with maker() as verify_session:
                result = await verify_session.execute(
                    text(
                        "SELECT artifact_path, artifact_sha256 "
                        "FROM m231d2d_batch_ack_probe "
                        "WHERE registry = :registry "
                        "AND phase = :phase"
                    ),
                    {"registry": registry, "phase": phase},
                )
                persisted = result.mappings().one_or_none()

            return persisted
        finally:
            await engine.dispose()

    persisted = asyncio.run(scenario())

    if phase == "before_commit":
        assert calls == {"commits": 0, "rollbacks": 1}
        assert persisted is None
        assert not physical_file.exists()
    else:
        assert calls["commits"] == 1
        assert calls["rollbacks"] == (
            1 if phase == "committed_ack_lost" else 0
        )
        assert persisted is not None
        assert persisted["artifact_path"] == relative_path
        assert persisted["artifact_sha256"] == expected_sha256
        assert physical_file.exists()
        assert sha256(
            physical_file.read_bytes()
        ).hexdigest() == expected_sha256