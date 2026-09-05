from __future__ import annotations

import asyncio
from datetime import datetime, timezone
from uuid import uuid4

import pytest
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings
from app.core.security import get_password_hash
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.registry_obligation import (
    RegistryObligation,
    RegistrySubmissionAttempt,
)
from app.models.user import User
from app.services.compliance_registry_attempts import (
    RegistrySubmissionAttemptError,
    attach_registry_submission_artifact,
    create_registry_submission_attempt,
    delete_registry_artifact_safely,
    freeze_registry_snapshot,
    mark_registry_submission,
    normalize_registry_result_errors,
    record_registry_submission_result,
)
from app.services.document_storage import (
    resolve_private_storage_path,
)


def create_attempt_fixture() -> dict:
    async def _create():
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        suffix = uuid4().hex

        async with session_factory() as session:
            user = User(
                email=(
                    "registry-attempt-"
                    + suffix
                    + "@example.test"
                ),
                phone=None,
                full_name=(
                    "Registry Attempt Test"
                ),
                hashed_password=(
                    get_password_hash(
                        "RegistryAttempt123!"
                    )
                ),
                is_active=True,
                is_email_verified=True,
                mfa_enabled=False,
            )

            course = Course(
                slug=(
                    "registry-attempt-"
                    + suffix
                ),
                title=(
                    "Registry Attempt Test "
                    + suffix[:8]
                ),
                hours=8,
                document_type=(
                    "certificate"
                ),
                regulatory_program_type=(
                    "other"
                ),
                frdo_requirement_mode=(
                    "required"
                ),
                mintrud_requirement_mode=(
                    "not_required"
                ),
                is_public=False,
                is_active=True,
            )

            session.add_all(
                [
                    user,
                    course,
                ]
            )

            await session.flush()

            now = datetime.now(
                timezone.utc
            )

            enrollment = Enrollment(
                user_id=str(
                    user.id
                ),
                course_id=str(
                    course.id
                ),
                status="completed",
                started_at=now,
                completed_at=now,
            )

            session.add(
                enrollment
            )

            await session.flush()

            obligation = (
                RegistryObligation(
                    registry="frdo",
                    enrollment_id=str(
                        enrollment.id
                    ),
                    document_id=None,
                    status="approved",
                    rule_code=(
                        "test.registry.attempt"
                    ),
                    rule_version=(
                        "test-v1"
                    ),
                    requirement_reason=(
                        "Registry attempt service test"
                    ),
                    readiness_errors=[],
                    approved_by_user_id=str(
                        user.id
                    ),
                    approved_at=now,
                )
            )

            session.add(
                obligation
            )

            await session.commit()

            result = {
                "user_id": str(
                    user.id
                ),
                "course_id": str(
                    course.id
                ),
                "enrollment_id": str(
                    enrollment.id
                ),
                "obligation_id": str(
                    obligation.id
                ),
            }

        await engine.dispose()

        return result

    return asyncio.run(
        _create()
    )


def cleanup_attempt_fixture(
    fixture: dict,
) -> None:
    async def _cleanup():
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            await session.execute(
                delete(
                    RegistrySubmissionAttempt
                ).where(
                    RegistrySubmissionAttempt
                    .obligation_id
                    == fixture[
                        "obligation_id"
                    ]
                )
            )

            await session.execute(
                delete(
                    RegistryObligation
                ).where(
                    RegistryObligation.id
                    == fixture[
                        "obligation_id"
                    ]
                )
            )

            await session.execute(
                delete(
                    Enrollment
                ).where(
                    Enrollment.id
                    == fixture[
                        "enrollment_id"
                    ]
                )
            )

            await session.execute(
                delete(
                    Course
                ).where(
                    Course.id
                    == fixture[
                        "course_id"
                    ]
                )
            )

            await session.execute(
                delete(
                    User
                ).where(
                    User.id
                    == fixture[
                        "user_id"
                    ]
                )
            )

            await session.commit()

        await engine.dispose()

    asyncio.run(
        _cleanup()
    )


def test_freeze_registry_snapshot_is_detached_and_json_safe() -> None:
    source = {
        "learner": {
            "name": "????",
        },
        "items": [
            1,
            2,
        ],
        "flag": True,
    }

    frozen = freeze_registry_snapshot(
        source
    )

    assert frozen == source
    assert frozen is not source

    source[
        "learner"
    ][
        "name"
    ] = "Changed"

    source[
        "items"
    ].append(
        3
    )

    assert (
        frozen[
            "learner"
        ][
            "name"
        ]
        == "????"
    )

    assert (
        frozen[
            "items"
        ]
        == [
            1,
            2,
        ]
    )

    with pytest.raises(
        RegistrySubmissionAttemptError
    ):
        freeze_registry_snapshot(
            {
                "bad": {
                    1,
                    2,
                },
            }
        )

    with pytest.raises(
        RegistrySubmissionAttemptError
    ):
        freeze_registry_snapshot(
            {
                "nan": float(
                    "nan"
                ),
            }
        )


def test_create_registry_submission_attempt_numbers_and_freezes() -> None:
    fixture = (
        create_attempt_fixture()
    )

    try:
        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            source_snapshot = {
                "registry": "frdo",
                "person": {
                    "first_name": "Ivan",
                },
                "course": {
                    "title": "Course",
                },
            }

            async with session_factory() as session:
                first = (
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=fixture[
                            "obligation_id"
                        ],
                        snapshot=source_snapshot,
                        generated_by_user_id=fixture[
                            "user_id"
                        ],
                        transport="  file  ",
                        schema_version="  test-v1  ",
                    )
                )

                first_id = str(
                    first.id
                )

                source_snapshot[
                    "person"
                ][
                    "first_name"
                ] = "Changed"

                second = (
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=fixture[
                            "obligation_id"
                        ],
                        snapshot={
                            "registry": "frdo",
                            "sequence": 2,
                        },
                        generated_by_user_id=fixture[
                            "user_id"
                        ],
                    )
                )

                second_id = str(
                    second.id
                )

                assert (
                    first.attempt_no
                    == 1
                )

                assert (
                    second.attempt_no
                    == 2
                )

                assert (
                    first.transport
                    == "file"
                )

                assert (
                    first.schema_version
                    == "test-v1"
                )

                assert (
                    first.snapshot_json[
                        "person"
                    ][
                        "first_name"
                    ]
                    == "Ivan"
                )

                assert (
                    first.artifact_path
                    is None
                )

                assert (
                    first.artifact_sha256
                    is None
                )

                assert (
                    first.generated_at
                    is not None
                )

                await session.commit()

            async with session_factory() as session:
                rows = (
                    await session.execute(
                        select(
                            RegistrySubmissionAttempt
                        )
                        .where(
                            RegistrySubmissionAttempt
                            .obligation_id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                        .order_by(
                            RegistrySubmissionAttempt
                            .attempt_no
                        )
                    )
                ).scalars().all()

                assert [
                    row.attempt_no
                    for row in rows
                ] == [
                    1,
                    2,
                ]

                assert {
                    str(
                        row.id
                    )
                    for row in rows
                } == {
                    first_id,
                    second_id,
                }

                obligation_status = (
                    await session.scalar(
                        select(
                            RegistryObligation.status
                        ).where(
                            RegistryObligation.id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    obligation_status
                    == "approved"
                )

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        cleanup_attempt_fixture(
            fixture
        )


def test_create_registry_submission_attempt_obeys_caller_rollback() -> None:
    fixture = (
        create_attempt_fixture()
    )

    try:
        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=fixture[
                            "obligation_id"
                        ],
                        snapshot={
                            "registry": "frdo",
                            "rollback": True,
                        },
                        generated_by_user_id=fixture[
                            "user_id"
                        ],
                    )
                )

                assert (
                    attempt.attempt_no
                    == 1
                )

                visible_in_transaction = (
                    await session.scalar(
                        select(
                            func.count(
                                RegistrySubmissionAttempt.id
                            )
                        ).where(
                            RegistrySubmissionAttempt
                            .obligation_id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    int(
                        visible_in_transaction
                        or 0
                    )
                    == 1
                )

                await session.rollback()

            async with session_factory() as session:
                persisted = (
                    await session.scalar(
                        select(
                            func.count(
                                RegistrySubmissionAttempt.id
                            )
                        ).where(
                            RegistrySubmissionAttempt
                            .obligation_id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    int(
                        persisted
                        or 0
                    )
                    == 0
                )

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        cleanup_attempt_fixture(
            fixture
        )


def test_create_registry_submission_attempt_validates_inputs() -> None:
    fixture = (
        create_attempt_fixture()
    )

    try:
        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                with pytest.raises(
                    RegistrySubmissionAttemptError
                ):
                    await create_registry_submission_attempt(
                        session,
                        obligation_id="",
                        snapshot={},
                        generated_by_user_id=None,
                    )

                with pytest.raises(
                    RegistrySubmissionAttemptError
                ):
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=fixture[
                            "obligation_id"
                        ],
                        snapshot={},
                        generated_by_user_id=None,
                        transport=" ",
                    )

                with pytest.raises(
                    RegistrySubmissionAttemptError
                ):
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=fixture[
                            "obligation_id"
                        ],
                        snapshot={},
                        generated_by_user_id=None,
                        transport=(
                            "x"
                            * 33
                        ),
                    )

                with pytest.raises(
                    RegistrySubmissionAttemptError
                ):
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=fixture[
                            "obligation_id"
                        ],
                        snapshot={},
                        generated_by_user_id=None,
                        schema_version=(
                            "x"
                            * 65
                        ),
                    )

                with pytest.raises(
                    RegistrySubmissionAttemptError
                ):
                    await create_registry_submission_attempt(
                        session,
                        obligation_id=(
                            "00000000-0000-0000-"
                            "0000-000000000000"
                        ),
                        snapshot={},
                        generated_by_user_id=None,
                    )

                await session.rollback()

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        cleanup_attempt_fixture(
            fixture
        )

def create_persisted_attempt(
    fixture: dict,
) -> str:
    async def _create():
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            attempt = (
                await create_registry_submission_attempt(
                    session,
                    obligation_id=fixture[
                        "obligation_id"
                    ],
                    snapshot={
                        "registry": "frdo",
                        "artifact_test": True,
                    },
                    generated_by_user_id=fixture[
                        "user_id"
                    ],
                    transport="file",
                    schema_version=(
                        "test-artifact-v1"
                    ),
                )
            )

            attempt_id = str(
                attempt.id
            )

            await session.commit()

        await engine.dispose()

        return attempt_id

    return asyncio.run(
        _create()
    )


def test_attach_registry_submission_artifact_persists_hash_and_file(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        attempt_id = (
            create_persisted_attempt(
                fixture
            )
        )

        content = (
            b"<registry>"
            b"immutable"
            b"</registry>"
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await attach_registry_submission_artifact(
                        session,
                        attempt_id=attempt_id,
                        content=content,
                        extension="  XML  ",
                    )
                )

                saved_path = (
                    attempt.artifact_path
                )

                saved_hash = (
                    attempt.artifact_sha256
                )

                assert (
                    saved_path
                    is not None
                )

                assert saved_path.startswith(
                    "generated/registry/"
                    + fixture[
                        "obligation_id"
                    ]
                    + "/"
                )

                assert saved_path.endswith(
                    ".xml"
                )

                from hashlib import sha256

                assert (
                    saved_hash
                    == sha256(
                        content
                    ).hexdigest()
                )

                resolved = (
                    resolve_private_storage_path(
                        saved_path
                    )
                )

                assert (
                    resolved
                    is not None
                )

                assert resolved.exists()

                assert (
                    resolved.read_bytes()
                    == content
                )

                await session.commit()

            async with session_factory() as session:
                persisted = (
                    await session.scalar(
                        select(
                            RegistrySubmissionAttempt
                        ).where(
                            RegistrySubmissionAttempt.id
                            == attempt_id
                        )
                    )
                )

                assert (
                    persisted
                    is not None
                )

                assert (
                    persisted.artifact_path
                    == saved_path
                )

                assert (
                    persisted.artifact_sha256
                    == saved_hash
                )

                obligation_status = (
                    await session.scalar(
                        select(
                            RegistryObligation.status
                        ).where(
                            RegistryObligation.id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    obligation_status
                    == "approved"
                )

            await engine.dispose()

            return saved_path

        artifact_path = asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            assert (
                delete_registry_artifact_safely(
                    artifact_path
                )
                is True
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_attach_registry_submission_artifact_is_attach_once(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        attempt_id = (
            create_persisted_attempt(
                fixture
            )
        )

        first_content = (
            b"first-artifact"
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                first = (
                    await attach_registry_submission_artifact(
                        session,
                        attempt_id=attempt_id,
                        content=first_content,
                        extension=".json",
                    )
                )

                saved_path = (
                    first.artifact_path
                )

                await session.commit()

            async with session_factory() as session:
                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match=(
                        "already has an artifact"
                    ),
                ):
                    await attach_registry_submission_artifact(
                        session,
                        attempt_id=attempt_id,
                        content=(
                            b"replacement"
                        ),
                        extension=".xml",
                    )

                await session.rollback()

            resolved = (
                resolve_private_storage_path(
                    saved_path
                )
            )

            assert (
                resolved
                is not None
            )

            assert (
                resolved.read_bytes()
                == first_content
            )

            await engine.dispose()

            return saved_path

        artifact_path = asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_attach_registry_submission_artifact_caller_rollback_requires_compensation(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        attempt_id = (
            create_persisted_attempt(
                fixture
            )
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await attach_registry_submission_artifact(
                        session,
                        attempt_id=attempt_id,
                        content=(
                            b"rollback-artifact"
                        ),
                        extension=".xml",
                    )
                )

                saved_path = (
                    attempt.artifact_path
                )

                resolved = (
                    resolve_private_storage_path(
                        saved_path
                    )
                )

                assert (
                    resolved
                    is not None
                )

                assert resolved.exists()

                await session.rollback()

                # Filesystem writes are not part of the
                # PostgreSQL transaction. The caller that
                # owns rollback must compensate explicitly.
                assert resolved.exists()

                assert (
                    delete_registry_artifact_safely(
                        saved_path
                    )
                    is True
                )

                assert (
                    not resolved.exists()
                )

            async with session_factory() as session:
                persisted = (
                    await session.scalar(
                        select(
                            RegistrySubmissionAttempt
                        ).where(
                            RegistrySubmissionAttempt.id
                            == attempt_id
                        )
                    )
                )

                assert (
                    persisted
                    is not None
                )

                assert (
                    persisted.artifact_path
                    is None
                )

                assert (
                    persisted.artifact_sha256
                    is None
                )

            await engine.dispose()

            return saved_path

        artifact_path = asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_attach_registry_submission_artifact_cleans_file_when_flush_fails(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        attempt_id = (
            create_persisted_attempt(
                fixture
            )
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                async def fail_flush(
                    *args,
                    **kwargs,
                ):
                    raise RuntimeError(
                        "forced flush failure"
                    )

                monkeypatch.setattr(
                    session,
                    "flush",
                    fail_flush,
                )

                with pytest.raises(
                    RuntimeError,
                    match=(
                        "forced flush failure"
                    ),
                ):
                    await attach_registry_submission_artifact(
                        session,
                        attempt_id=attempt_id,
                        content=(
                            b"must-be-cleaned"
                        ),
                        extension=".xml",
                    )

                registry_root = (
                    tmp_path
                    / "generated"
                    / "registry"
                )

                files = []

                if registry_root.exists():
                    files = [
                        path
                        for path
                        in registry_root.rglob(
                            "*"
                        )
                        if path.is_file()
                    ]

                assert files == []

                await session.rollback()

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        cleanup_attempt_fixture(
            fixture
        )


def test_attach_registry_submission_artifact_validates_inputs(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        attempt_id = (
            create_persisted_attempt(
                fixture
            )
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                invalid_cases = [
                    {
                        "attempt_id": "",
                        "content": b"x",
                        "extension": ".xml",
                    },
                    {
                        "attempt_id": attempt_id,
                        "content": b"",
                        "extension": ".xml",
                    },
                    {
                        "attempt_id": attempt_id,
                        "content": "not-bytes",
                        "extension": ".xml",
                    },
                    {
                        "attempt_id": attempt_id,
                        "content": b"x",
                        "extension": "",
                    },
                    {
                        "attempt_id": attempt_id,
                        "content": b"x",
                        "extension": (
                            "../../evil.xml"
                        ),
                    },
                    {
                        "attempt_id": attempt_id,
                        "content": b"x",
                        "extension": (
                            ".abcdefghijklmnop"
                        ),
                    },
                    {
                        "attempt_id": (
                            "00000000-0000-0000-"
                            "0000-000000000000"
                        ),
                        "content": b"x",
                        "extension": ".xml",
                    },
                ]

                for case in invalid_cases:
                    with pytest.raises(
                        RegistrySubmissionAttemptError
                    ):
                        await attach_registry_submission_artifact(
                            session,
                            **case,
                        )

                await session.rollback()

            await engine.dispose()

        asyncio.run(
            _run()
        )

        registry_root = (
            tmp_path
            / "generated"
            / "registry"
        )

        files = []

        if registry_root.exists():
            files = [
                path
                for path
                in registry_root.rglob(
                    "*"
                )
                if path.is_file()
            ]

        assert files == []

    finally:
        cleanup_attempt_fixture(
            fixture
        )

def prepare_exported_artifact_attempt(
    fixture: dict,
    *,
    content: bytes = b"registry-export",
    extension: str = ".xml",
) -> tuple[str, str]:
    async def _prepare():
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            attempt = (
                await create_registry_submission_attempt(
                    session,
                    obligation_id=fixture[
                        "obligation_id"
                    ],
                    snapshot={
                        "registry": "frdo",
                        "manual_reconciliation": True,
                    },
                    generated_by_user_id=fixture[
                        "user_id"
                    ],
                    transport="file",
                    schema_version=None,
                )
            )

            attempt_id = str(
                attempt.id
            )

            attached = (
                await attach_registry_submission_artifact(
                    session,
                    attempt_id=attempt_id,
                    content=content,
                    extension=extension,
                )
            )

            artifact_path = (
                attached.artifact_path
            )

            obligation = (
                await session.scalar(
                    select(
                        RegistryObligation
                    ).where(
                        RegistryObligation.id
                        == fixture[
                            "obligation_id"
                        ]
                    )
                )
            )

            assert (
                obligation
                is not None
            )

            obligation.status = (
                "exported"
            )

            await session.commit()

        await engine.dispose()

        assert (
            artifact_path
            is not None
        )

        return (
            attempt_id,
            artifact_path,
        )

    return asyncio.run(
        _prepare()
    )


def mark_attempt_submitted(
    attempt_id: str,
    *,
    user_id: str,
    external_reference: str | None = None,
) -> None:
    async def _submit():
        engine = create_async_engine(
            str(
                settings.database_url
            )
        )

        session_factory = (
            async_sessionmaker(
                engine,
                expire_on_commit=False,
            )
        )

        async with session_factory() as session:
            await mark_registry_submission(
                session,
                attempt_id=attempt_id,
                submitted_by_user_id=user_id,
                external_reference=(
                    external_reference
                ),
            )

            await session.commit()

        await engine.dispose()

    asyncio.run(
        _submit()
    )


def test_normalize_registry_result_errors() -> None:
    assert (
        normalize_registry_result_errors(
            None
        )
        == []
    )

    assert (
        normalize_registry_result_errors(
            [
                "  first  ",
                "",
                "   ",
                "second",
            ]
        )
        == [
            "first",
            "second",
        ]
    )

    with pytest.raises(
        RegistrySubmissionAttemptError
    ):
        normalize_registry_result_errors(
            "not-a-list"
        )

    with pytest.raises(
        RegistrySubmissionAttemptError
    ):
        normalize_registry_result_errors(
            [
                "x" * 4001,
            ]
        )


def test_mark_registry_submission_persists_attempt_and_obligation(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_exported_artifact_attempt(
            fixture
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await mark_registry_submission(
                        session,
                        attempt_id=attempt_id,
                        submitted_by_user_id=fixture[
                            "user_id"
                        ],
                        external_reference=(
                            "  PACKAGE-42  "
                        ),
                    )
                )

                assert (
                    str(
                        attempt.submitted_by_user_id
                    )
                    == fixture[
                        "user_id"
                    ]
                )

                assert (
                    attempt.submitted_at
                    is not None
                )

                assert (
                    attempt.external_reference
                    == "PACKAGE-42"
                )

                assert (
                    attempt.result_status
                    is None
                )

                assert (
                    attempt.errors_json
                    == []
                )

                await session.commit()

            async with session_factory() as session:
                persisted = (
                    await session.scalar(
                        select(
                            RegistrySubmissionAttempt
                        ).where(
                            RegistrySubmissionAttempt.id
                            == attempt_id
                        )
                    )
                )

                obligation = (
                    await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    persisted
                    is not None
                )

                assert (
                    obligation
                    is not None
                )

                assert (
                    persisted.submitted_at
                    is not None
                )

                assert (
                    obligation.status
                    == "submitted"
                )

                assert (
                    obligation.submitted_at
                    is not None
                )

                assert (
                    obligation.accepted_at
                    is None
                )

                assert (
                    obligation.last_error
                    is None
                )

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_mark_registry_submission_requires_valid_artifact(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_exported_artifact_attempt(
            fixture,
            content=b"original",
        )

        resolved = (
            resolve_private_storage_path(
                artifact_path
            )
        )

        assert (
            resolved
            is not None
        )

        resolved.write_bytes(
            b"tampered"
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match="checksum mismatch",
                ):
                    await mark_registry_submission(
                        session,
                        attempt_id=attempt_id,
                        submitted_by_user_id=fixture[
                            "user_id"
                        ],
                    )

                await session.rollback()

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_mark_registry_submission_obeys_caller_rollback(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_exported_artifact_attempt(
            fixture
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await mark_registry_submission(
                        session,
                        attempt_id=attempt_id,
                        submitted_by_user_id=fixture[
                            "user_id"
                        ],
                    )
                )

                assert (
                    attempt.submitted_at
                    is not None
                )

                await session.rollback()

            async with session_factory() as session:
                persisted = (
                    await session.scalar(
                        select(
                            RegistrySubmissionAttempt
                        ).where(
                            RegistrySubmissionAttempt.id
                            == attempt_id
                        )
                    )
                )

                obligation = (
                    await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    persisted
                    is not None
                )

                assert (
                    obligation
                    is not None
                )

                assert (
                    persisted.submitted_at
                    is None
                )

                assert (
                    persisted.submitted_by_user_id
                    is None
                )

                assert (
                    obligation.status
                    == "exported"
                )

                assert (
                    obligation.submitted_at
                    is None
                )

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_record_registry_submission_result_accepted(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_exported_artifact_attempt(
            fixture
        )

        mark_attempt_submitted(
            attempt_id,
            user_id=fixture[
                "user_id"
            ],
            external_reference="PKG-1",
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status="accepted",
                        external_id=(
                            "  REGISTRY-777  "
                        ),
                        errors=[],
                    )
                )

                assert (
                    attempt.result_status
                    == "accepted"
                )

                assert (
                    attempt.errors_json
                    == []
                )

                await session.commit()

            async with session_factory() as session:
                obligation = (
                    await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    obligation
                    is not None
                )

                assert (
                    obligation.status
                    == "accepted"
                )

                assert (
                    obligation.accepted_at
                    is not None
                )

                assert (
                    obligation.external_id
                    == "REGISTRY-777"
                )

                assert (
                    obligation.last_error
                    is None
                )

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


@pytest.mark.parametrize(
    (
        "result_status",
        "errors",
        "expected_last_error",
    ),
    [
        (
            "rejected",
            [
                " invalid SNILS ",
                "Program mismatch",
            ],
            (
                "invalid SNILS\n"
                "Program mismatch"
            ),
        ),
        (
            "correction_required",
            [],
            None,
        ),
    ],
)
def test_record_registry_submission_result_negative_states(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
    result_status: str,
    errors: list[str],
    expected_last_error: str | None,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_exported_artifact_attempt(
            fixture
        )

        mark_attempt_submitted(
            attempt_id,
            user_id=fixture[
                "user_id"
            ],
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                attempt = (
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status=(
                            result_status
                        ),
                        errors=errors,
                    )
                )

                assert (
                    attempt.result_status
                    == result_status
                )

                await session.commit()

            async with session_factory() as session:
                obligation = (
                    await session.scalar(
                        select(
                            RegistryObligation
                        ).where(
                            RegistryObligation.id
                            == fixture[
                                "obligation_id"
                            ]
                        )
                    )
                )

                assert (
                    obligation
                    is not None
                )

                assert (
                    obligation.status
                    == result_status
                )

                assert (
                    obligation.accepted_at
                    is None
                )

                assert (
                    obligation.external_id
                    is None
                )

                assert (
                    obligation.last_error
                    == expected_last_error
                )

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )


def test_registry_reconciliation_rejects_duplicate_and_invalid_transitions(
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    fixture = (
        create_attempt_fixture()
    )

    artifact_path = None

    monkeypatch.setattr(
        settings,
        "document_storage_dir",
        str(
            tmp_path
        ),
    )

    try:
        (
            attempt_id,
            artifact_path,
        ) = prepare_exported_artifact_attempt(
            fixture
        )

        mark_attempt_submitted(
            attempt_id,
            user_id=fixture[
                "user_id"
            ],
        )

        async def _run():
            engine = create_async_engine(
                str(
                    settings.database_url
                )
            )

            session_factory = (
                async_sessionmaker(
                    engine,
                    expire_on_commit=False,
                )
            )

            async with session_factory() as session:
                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match="already submitted",
                ):
                    await mark_registry_submission(
                        session,
                        attempt_id=attempt_id,
                        submitted_by_user_id=fixture[
                            "user_id"
                        ],
                    )

                await session.rollback()

            async with session_factory() as session:
                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match="Unsupported",
                ):
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status="unknown",
                    )

                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match=(
                        "allowed only for accepted"
                    ),
                ):
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status="rejected",
                        external_id="BAD",
                    )

                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match=(
                        "must not contain errors"
                    ),
                ):
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status="accepted",
                        errors=[
                            "error",
                        ],
                    )

                accepted = (
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status="accepted",
                    )
                )

                assert (
                    accepted.result_status
                    == "accepted"
                )

                await session.commit()

            async with session_factory() as session:
                with pytest.raises(
                    RegistrySubmissionAttemptError,
                    match=(
                        "already has a result"
                    ),
                ):
                    await record_registry_submission_result(
                        session,
                        attempt_id=attempt_id,
                        result_status="rejected",
                    )

                await session.rollback()

            await engine.dispose()

        asyncio.run(
            _run()
        )

    finally:
        if artifact_path:
            delete_registry_artifact_safely(
                artifact_path
            )

        cleanup_attempt_fixture(
            fixture
        )
