
"""Real PostgreSQL regression for global registry permission scope."""

import asyncio
import os
import secrets
from datetime import datetime, timezone
from hashlib import sha256
from unittest.mock import patch
from uuid import uuid4

import httpx
import pytest

from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
)

from app.main import app
from app.core import security
from app.db.session import get_db
from app.api.v1.rbac import get_user_permission_codes

from app.models.user import User
from app.models.role import (
    Role,
    Permission,
    UserRole,
    RolePermission,
)
from app.models.organization import Organization
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.models.registry_submission_batch import (
    RegistrySubmissionBatch,
    RegistrySubmissionBatchItem,
)
from app.models.audit_event import AuditEvent
from app.schemas.admin import (
    AdminMintrudSubmissionBatchResultItemUpdate,
    AdminMintrudSubmissionBatchResultUpdate,
)


def utcnow():
    return datetime.now(timezone.utc)


async def seed(maker):
    marker = uuid4().hex

    async with maker.begin() as session:
        scoped = User(
            email=f"scope-{marker}@example.invalid",
            hashed_password="not-for-login",
            is_active=True,
        )

        global_actor = User(
            email=f"global-{marker}@example.invalid",
            hashed_password="not-for-login",
            is_active=True,
        )

        denied = User(
            email=f"denied-{marker}@example.invalid",
            hashed_password="not-for-login",
            is_active=True,
        )

        learner = User(
            email=f"learner-{marker}@example.invalid",
            hashed_password="not-for-login",
        )

        org_a = Organization(
            inn="1" + f"{int(marker[:12], 16) % 10**11:011d}",
            name="Synthetic organization A",
        )

        org_b = Organization(
            inn="2" + f"{int(marker[12:24], 16) % 10**11:011d}",
            name="Synthetic organization B",
        )

        course = Course(
            slug=f"rbac-registry-{marker}",
            title="Isolated RBAC registry regression",
            regulatory_program_type="occupational_safety_training",
        )

        scoped_role = Role(
            code=f"scope-{marker[:24]}",
            name="Organization-scoped registry role",
        )

        global_role = Role(
            code=f"global-{marker[:24]}",
            name="Global registry role",
        )

        permissions = [
            Permission(
                code="mintrud.export",
                name="Export Mintrud",
            ),
            Permission(
                code="frdo.export",
                name="Export FRDO",
            ),
            Permission(
                code="mintrud.read",
                name="Read Mintrud",
            ),
            Permission(
                code="frdo.read",
                name="Read FRDO",
            ),
            Permission(
                code="catalog.write",
                name="Write catalog",
            ),
        ]

        session.add_all([
            scoped,
            global_actor,
            denied,
            learner,
            org_a,
            org_b,
            course,
            scoped_role,
            global_role,
            *permissions,
        ])

        await session.flush()

        for permission in permissions:
            session.add(
                RolePermission(
                    role_id=scoped_role.id,
                    permission_id=permission.id,
                )
            )

            session.add(
                RolePermission(
                    role_id=global_role.id,
                    permission_id=permission.id,
                )
            )

        session.add_all([
            UserRole(
                user_id=scoped.id,
                role_id=scoped_role.id,
                organization_id=org_a.id,
            ),
            UserRole(
                user_id=global_actor.id,
                role_id=global_role.id,
                organization_id=None,
            ),
        ])

        await session.flush()

        enrollment = Enrollment(
            user_id=learner.id,
            course_id=course.id,
            organization_id=org_b.id,
            status="completed",
            completed_at=utcnow(),
        )

        session.add(enrollment)
        await session.flush()

        obligation = RegistryObligation(
            registry="mintrud",
            enrollment_id=enrollment.id,
            status="submitted",
            readiness_errors=[],
            submitted_at=utcnow(),
        )

        session.add(obligation)
        await session.flush()

        batch = RegistrySubmissionBatch(
            registry="mintrud",
            status="submitted",
            artifact_kind="portal-upload-artifact",
            transport="file",
            schema_version="1.0.9",
            obligation_count=1,
            record_count=1,
            artifact_path=f"synthetic/rbac/{marker}.xml",
            artifact_sha256=sha256(
                marker.encode()
            ).hexdigest(),
            generated_by_user_id=global_actor.id,
            submitted_by_user_id=global_actor.id,
            submitted_at=utcnow(),
        )

        session.add(batch)
        await session.flush()

        session.add(
            RegistrySubmissionBatchItem(
                batch_id=batch.id,
                obligation_id=obligation.id,
                position=0,
                approval_snapshot_json={
                    "synthetic_test": True,
                },
                approval_fingerprint="a" * 64,
                record_count=1,
                errors_json=[],
            )
        )

        await session.flush()

        return {
            "scoped": str(scoped.id),
            "global": str(global_actor.id),
            "denied": str(denied.id),
            "batch": str(batch.id),
            "obligation": str(obligation.id),
        }


def body_for(obligation_id):
    item = (
        AdminMintrudSubmissionBatchResultItemUpdate
        .model_validate({
            "obligation_id": obligation_id,
            "result_status": "accepted",
            "external_id": "RBAC-SCOPE-001",
            "errors": [],
            "errors_json": [],
        })
    )

    return AdminMintrudSubmissionBatchResultUpdate(
        items=[item]
    ).model_dump(mode="json")


async def snapshot(maker, batch_id):
    async with maker() as session:
        batch = await session.get(
            RegistrySubmissionBatch,
            batch_id,
        )

        items = (
            await session.scalars(
                select(RegistrySubmissionBatchItem)
                .where(
                    RegistrySubmissionBatchItem.batch_id == batch_id
                )
            )
        ).all()

        audits = (
            await session.scalars(
                select(AuditEvent)
                .where(AuditEvent.entity_id == batch_id)
            )
        ).all()

        return {
            "reconciled": batch.reconciled_at is not None,
            "status": [item.result_status for item in items],
            "external_ids": [
                item.external_id for item in items
            ],
            "audits": len(audits),
        }


async def scenario():
    url = os.environ["DATABASE_URL"]

    assert url.startswith(
        "postgresql+asyncpg://obrportal_test:"
    ), "NON_TEST_DATABASE_BLOCKED"

    assert url.endswith(
        "@127.0.0.1:5432/obrportal_isolated_test"
    ), "NON_TEST_DATABASE_BLOCKED"

    engine = create_async_engine(url)

    maker = async_sessionmaker(
        engine,
        expire_on_commit=False,
    )

    originals = dict(app.dependency_overrides)

    async def disposable_db():
        async with maker() as session:
            yield session

    try:
        async with maker() as session:
            database = await session.scalar(
                text("SELECT current_database()")
            )

        assert database == "obrportal_isolated_test"

        identities = await seed(maker)

        async with maker() as session:
            scoped = await session.get(
                User, identities["scoped"]
            )
            global_actor = await session.get(
                User, identities["global"]
            )
            denied = await session.get(
                User, identities["denied"]
            )

            scoped_codes = await get_user_permission_codes(
                scoped, session
            )
            global_codes = await get_user_permission_codes(
                global_actor, session
            )
            denied_codes = await get_user_permission_codes(
                denied, session
            )

        registry_codes = {
            "mintrud.export",
            "mintrud.read",
            "frdo.export",
            "frdo.read",
        }

        assert not (registry_codes & scoped_codes)
        assert "catalog.write" in scoped_codes

        print(
            "SCOPED_REGISTRY_PERMISSIONS_DENIED=PASS",
            flush=True,
        )
        print(
            "NONREGISTRY_SCOPED_PERMISSION_PRESERVED=PASS",
            flush=True,
        )

        assert registry_codes <= global_codes
        assert "catalog.write" in global_codes
        assert not denied_codes

        print(
            "GLOBAL_REGISTRY_PERMISSIONS_PRESERVED=PASS",
            flush=True,
        )

        app.dependency_overrides.clear()
        app.dependency_overrides[get_db] = disposable_db

        assert len(app.dependency_overrides) == 1

        with patch.object(
            security.settings,
            "secret_key",
            secrets.token_urlsafe(48),
        ):
            tokens = {
                key: security.create_access_token(
                    identities[key]
                )
                for key in ("scoped", "global", "denied")
            }

            def headers(who):
                return {
                    "Authorization": "Bearer " + tokens[who]
                }

            mintrud_get = (
                "/api/v1/admin/mintrud/batches/"
                + identities["batch"]
            )
            mintrud_post = mintrud_get + "/result"
            frdo_get = "/api/v1/admin/frdo/batches"

            transport = httpx.ASGITransport(
                app=app,
                raise_app_exceptions=False,
            )

            async with httpx.AsyncClient(
                transport=transport,
                base_url="http://isolated-rbac-test",
                timeout=15,
            ) as client:
                before = await snapshot(
                    maker, identities["batch"]
                )

                assert not before["reconciled"]
                assert before["audits"] == 0

                scoped_get = await client.get(
                    mintrud_get,
                    headers=headers("scoped"),
                )
                assert scoped_get.status_code == 403, (
                    "SCOPED_MINTRUD_GET_NOT_403:"
                    + str(scoped_get.status_code)
                )

                scoped_post = await client.post(
                    mintrud_post,
                    json=body_for(
                        identities["obligation"]
                    ),
                    headers=headers("scoped"),
                )
                assert scoped_post.status_code == 403, (
                    "SCOPED_MINTRUD_POST_NOT_403:"
                    + str(scoped_post.status_code)
                )

                scoped_frdo = await client.get(
                    frdo_get,
                    headers=headers("scoped"),
                )
                assert scoped_frdo.status_code == 403, (
                    "SCOPED_FRDO_GET_NOT_403:"
                    + str(scoped_frdo.status_code)
                )

                denied_get = await client.get(
                    mintrud_get,
                    headers=headers("denied"),
                )
                assert denied_get.status_code == 403

                assert (
                    await snapshot(maker, identities["batch"])
                    == before
                )

                print(
                    "CROSS_ORG_MINTRUD_GET_403=PASS",
                    flush=True,
                )
                print(
                    "CROSS_ORG_MINTRUD_POST_403=PASS",
                    flush=True,
                )
                print(
                    "SCOPED_FRDO_GET_403=PASS",
                    flush=True,
                )
                print(
                    "DENIED_USER_403=PASS",
                    flush=True,
                )
                print(
                    "DENIED_REQUEST_NO_DB_MUTATION=PASS",
                    flush=True,
                )

                global_get = await client.get(
                    mintrud_get,
                    headers=headers("global"),
                )
                assert global_get.status_code == 200, (
                    "GLOBAL_MINTRUD_GET_FAILED:"
                    + global_get.text[:300]
                )

                global_frdo = await client.get(
                    frdo_get,
                    headers=headers("global"),
                )
                assert global_frdo.status_code == 200, (
                    "GLOBAL_FRDO_GET_FAILED:"
                    + global_frdo.text[:300]
                )

                print(
                    "GLOBAL_MINTRUD_GET_200=PASS",
                    flush=True,
                )
                print(
                    "GLOBAL_FRDO_GET_200=PASS",
                    flush=True,
                )

                accepted = await client.post(
                    mintrud_post,
                    json=body_for(
                        identities["obligation"]
                    ),
                    headers=headers("global"),
                )

                assert accepted.status_code == 200, (
                    "GLOBAL_POST_FAILED:"
                    + str(accepted.status_code)
                    + ":" + accepted.text[:500]
                )

                committed = await snapshot(
                    maker, identities["batch"]
                )

                assert committed["reconciled"]
                assert committed["status"] == ["accepted"]
                assert committed["external_ids"] == [
                    "RBAC-SCOPE-001"
                ]
                assert committed["audits"] == 1

                print(
                    "GLOBAL_MINTRUD_POST_200=PASS",
                    flush=True,
                )
                print(
                    "GLOBAL_AUDIT_PERSISTED_ONCE=PASS",
                    flush=True,
                )

                duplicate = await client.post(
                    mintrud_post,
                    json=body_for(
                        identities["obligation"]
                    ),
                    headers=headers("global"),
                )

                assert duplicate.status_code == 409
                assert (
                    await snapshot(maker, identities["batch"])
                    == committed
                )

                print(
                    "DUPLICATE_POST_409=PASS",
                    flush=True,
                )
                print(
                    "RESULT_IMMUTABILITY=PASS",
                    flush=True,
                )

                async with maker.begin() as session:
                    await session.execute(
                        delete(UserRole).where(
                            UserRole.user_id
                            == identities["global"]
                        )
                    )

                revoked = await client.get(
                    mintrud_get,
                    headers=headers("global"),
                )

                assert revoked.status_code == 403

                print(
                    "GLOBAL_ROLE_REVOCATION_403=PASS",
                    flush=True,
                )

        print(
            "REGISTRY_PERMISSION_SCOPE_PG=PASS",
            flush=True,
        )

    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(originals)
        await engine.dispose()


def test_registry_permissions_global_only():
    if os.environ.get("M5E4C5_SCOPE_PG") != "1":
        pytest.skip(
            "Explicit disposable PostgreSQL opt-in required"
        )

    asyncio.run(scenario())
