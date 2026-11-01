"""Real ORM batch durability with disposable migrated PostgreSQL."""

from __future__ import annotations

import asyncio
import os
import re
from hashlib import sha256
from types import SimpleNamespace
from uuid import uuid4

import pytest
from sqlalchemy import select
from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import app.api.v1.admin as admin
from app.core.config import settings
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import (
    RegistrySubmissionBatch,
    RegistrySubmissionBatchItem,
)
from app.models.user import User
from app.services.document_storage import write_private_storage_file_exclusive


@pytest.mark.parametrize("registry", ["frdo", "mintrud"])
@pytest.mark.parametrize(
    "phase",
    ["success", "before_commit", "committed_ack_lost"],
)
def test_m231d2d_real_orm_batch_commit(
    tmp_path, monkeypatch, registry, phase,
):
    database_name = os.getenv("M231D2D_ORM_TEST_DB", "")
    if not database_name:
        pytest.skip("Requires explicit disposable ORM test database")

    assert re.fullmatch(r"m231d2d_orm_[0-9a-f]{12}", database_name)

    url = make_url(os.environ["DATABASE_URL"])
    assert url.drivername == "postgresql+asyncpg"
    assert url.host == "postgres"
    assert url.database == database_name
    assert url.username == "obrtest"
    assert not url.query

    monkeypatch.setattr(
        settings, "document_storage_dir", str(tmp_path)
    )

    batch_id = str(uuid4())
    relative_path = (
        f"generated/registry/{registry}/batches/{batch_id}.bin"
    )
    physical_path = tmp_path.joinpath(*relative_path.split("/"))

    content = f"ORM-BATCH-{registry}-{phase}-{batch_id}".encode()
    digest = sha256(content).hexdigest()
    approval_digest = sha256(b"isolated-approval").hexdigest()

    schema_version = (
        "1.0.9"
        if registry == "mintrud"
        else "frdo-po-working-reference-v1"
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

    calls = {"commits": 0, "rollbacks": 0}

    async def scenario():
        engine = create_async_engine(url)
        maker = async_sessionmaker(
            engine, expire_on_commit=False
        )

        try:
            # Seed actual FK dependencies, in their dependency order.
            async with maker.begin() as session:
                unique = uuid4().hex

                user = User(
                    email=f"orm-batch-{unique}@example.invalid",
                    hashed_password="not-a-login-account",
                )
                course = Course(
                    slug=f"orm-batch-{unique}",
                    title="Isolated ORM batch test",
                )
                session.add_all([user, course])
                await session.flush()

                enrollment = Enrollment(
                    user_id=user.id,
                    course_id=course.id,
                    status="completed",
                )
                session.add(enrollment)
                await session.flush()

                obligation = RegistryObligation(
                    registry=registry,
                    enrollment_id=enrollment.id,
                    status="approved",
                    readiness_errors=[],
                )
                session.add(obligation)
                await session.flush()

                user_id = str(user.id)
                obligation_id = str(obligation.id)

            async def create_batch(
                session,
                *,
                obligation_ids,
                generated_by_user_id,
            ):
                assert obligation_ids == [obligation_id]
                assert generated_by_user_id == user_id

                saved_path = write_private_storage_file_exclusive(
                    relative_path, content
                )
                assert saved_path == relative_path

                batch = RegistrySubmissionBatch(
                    id=batch_id,
                    registry=registry,
                    status="exported",
                    artifact_kind="portal-upload-artifact",
                    transport="file",
                    schema_version=schema_version,
                    obligation_count=1,
                    record_count=1,
                    artifact_path=saved_path,
                    artifact_sha256=digest,
                    generated_by_user_id=user_id,
                )

                session.add(batch)
                await session.flush()

                item = RegistrySubmissionBatchItem(
                    batch_id=batch_id,
                    obligation_id=obligation_id,
                    position=0,
                    approval_snapshot_json={"test": "m231d2d"},
                    approval_fingerprint=approval_digest,
                    record_count=1,
                )
                session.add(item)
                await session.flush()

                return batch

            async def create_audit_event(session, **kwargs):
                if phase == "before_commit":
                    raise RuntimeError(
                        "simulated pre-COMMIT audit failure"
                    )

            monkeypatch.setattr(
                admin, service_name, create_batch
            )
            monkeypatch.setattr(
                admin,
                builder_name,
                lambda batch: SimpleNamespace(id=batch.id),
            )
            monkeypatch.setattr(
                admin, "create_admin_audit_event", create_audit_event
            )

            async with maker() as real_session:
                class SessionProxy:
                    def __getattr__(self, name):
                        return getattr(real_session, name)

                    async def commit(self):
                        calls["commits"] += 1
                        await real_session.commit()

                        if phase == "committed_ack_lost":
                            raise ConnectionError(
                                "simulated COMMIT ACK loss"
                            )

                    async def rollback(self):
                        calls["rollbacks"] += 1
                        await real_session.rollback()

                async def invoke():
                    endpoint = getattr(admin, endpoint_name)
                    return await endpoint(
                        payload=SimpleNamespace(
                            obligation_ids=[obligation_id]
                        ),
                        request=object(),
                        current_user=SimpleNamespace(id=user_id),
                        session=SessionProxy(),
                    )

                if phase == "success":
                    response = await invoke()
                    assert response.id == batch_id

                else:
                    exception_type = (
                        RuntimeError
                        if phase == "before_commit"
                        else ConnectionError
                    )

                    with pytest.raises(
                        exception_type, match="simulated"
                    ):
                        await invoke()

            # Verify persistence from an independent DB session.
            async with maker() as verification_session:
                stored_batch = await verification_session.get(
                    RegistrySubmissionBatch, batch_id
                )

                stored_items = (
                    await verification_session.scalars(
                        select(RegistrySubmissionBatchItem).where(
                            RegistrySubmissionBatchItem.batch_id
                            == batch_id
                        )
                    )
                ).all()

                if phase == "before_commit":
                    assert stored_batch is None
                    assert stored_items == []

                else:
                    assert stored_batch is not None
                    assert stored_batch.registry == registry
                    assert stored_batch.status == "exported"
                    assert stored_batch.schema_version == schema_version
                    assert stored_batch.artifact_path == relative_path
                    assert stored_batch.artifact_sha256 == digest
                    assert stored_batch.generated_by_user_id == user_id
                    assert stored_batch.record_count == 1

                    assert len(stored_items) == 1
                    assert stored_items[0].obligation_id == obligation_id
                    assert stored_items[0].position == 0
                    assert stored_items[0].record_count == 1
                    assert (
                        stored_items[0].approval_fingerprint
                        == approval_digest
                    )

            if phase == "before_commit":
                assert calls == {"commits": 0, "rollbacks": 1}
                assert not physical_path.exists()

            else:
                assert calls["commits"] == 1
                assert calls["rollbacks"] == (
                    1 if phase == "committed_ack_lost" else 0
                )
                assert physical_path.is_file()
                assert sha256(
                    physical_path.read_bytes()
                ).hexdigest() == digest

        finally:
            await engine.dispose()

    asyncio.run(scenario())