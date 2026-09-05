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
    create_registry_submission_attempt,
    freeze_registry_snapshot,
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
