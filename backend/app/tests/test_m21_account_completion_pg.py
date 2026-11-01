from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import (
    async_sessionmaker,
    create_async_engine,
)

import app.api.v1.account as account_api
import app.services.completion_documents as completion_documents
import app.services.enrollment_completion as completion_service

from app.models.document_record import DocumentRecord
from app.models.enrollment import Enrollment
from app.models.registry_obligation import RegistryObligation
from app.models.user import User

from app.services.registry_action_lockset import (
    RegistrySourceFence,
    acquire_registry_source_write_fences,
)

from test_m21_enrollment_source_fence_pg import make_enrollment
from test_registry_applicability_writer_pg import (
    pg_applicability_db,
    _wait_for_pg_blocker,
)


def stub_pdf_storage(monkeypatch):
    """Only the filesystem write is mocked; DB operations remain real."""
    writes = []

    def fake_pdf_writer(**kwargs):
        writes.append(str(kwargs["document"].id))
        return "m21-c5/mocked-document.pdf"

    monkeypatch.setattr(
        completion_documents,
        "write_completion_document_pdf_to_storage",
        fake_pdf_writer,
    )

    return writes


async def read_completion_state(maker, enrollment_id):
    async with maker() as session:
        enrollment = await session.get(
            Enrollment,
            enrollment_id,
        )

        documents = (
            await session.scalars(
                select(DocumentRecord).where(
                    DocumentRecord.enrollment_id == enrollment_id
                )
            )
        ).all()

        obligations = (
            await session.scalars(
                select(RegistryObligation).where(
                    RegistryObligation.enrollment_id == enrollment_id
                )
            )
        ).all()

        return {
            "status": enrollment.status,
            "started_at": enrollment.started_at,
            "completed_at": enrollment.completed_at,
            "documents": sorted(
                str(document.id)
                for document in documents
            ),
            "obligations": {
                obligation.registry: str(obligation.document_id)
                if obligation.document_id is not None
                else None
                for obligation in obligations
            },
            "obligation_count": len(obligations),
        }


async def call_account_completion(
    maker,
    enrollment_id,
    *,
    started=None,
    tracker=None,
):
    async with maker() as session:
        enrollment = await session.get(
            Enrollment,
            enrollment_id,
        )

        learner = await session.get(
            User,
            enrollment.user_id,
        )

        if tracker is not None:
            tracker["pid"] = await session.scalar(
                text("SELECT pg_backend_pid()")
            )

        if started is not None:
            started.set()

        return await account_api.complete_account_course_learning(
            enrollment_id=enrollment_id,
            current_user=learner,
            session=session,
        )


def assert_single_completion(state):
    assert state["status"] == "completed"
    assert state["completed_at"] is not None

    assert len(state["documents"]) == 1

    assert state["obligation_count"] == 2
    assert set(state["obligations"]) == {"frdo", "mintrud"}

    document_id = state["documents"][0]

    assert all(
        value == document_id
        for value in state["obligations"].values()
    )


def test_account_completion_waits_for_course_fence(
    pg_applicability_db,
    monkeypatch,
):
    writes = stub_pdf_storage(monkeypatch)

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        task = None

        try:
            course_id, _, enrollment_id = await make_enrollment(
                maker
            )

            tracker = {}
            started = asyncio.Event()

            before = await read_completion_state(
                maker,
                enrollment_id,
            )

            assert before["status"] == "active"
            assert before["documents"] == []
            assert before["obligation_count"] == 0

            async with maker.begin() as blocker:
                blocker_pid = await blocker.scalar(
                    text("SELECT pg_backend_pid()")
                )

                await acquire_registry_source_write_fences(
                    session=blocker,
                    source_fences=(
                        RegistrySourceFence(
                            "course",
                            course_id,
                        ),
                    ),
                )

                task = asyncio.create_task(
                    call_account_completion(
                        maker,
                        enrollment_id,
                        started=started,
                        tracker=tracker,
                    )
                )

                await asyncio.wait_for(
                    started.wait(),
                    timeout=10,
                )

                await _wait_for_pg_blocker(
                    engine,
                    tracker["pid"],
                    blocker_pid,
                )

                assert not task.done()

                during = await read_completion_state(
                    maker,
                    enrollment_id,
                )

                assert during == before
                assert writes == []

            await asyncio.wait_for(task, timeout=20)

            after = await read_completion_state(
                maker,
                enrollment_id,
            )

            assert_single_completion(after)
            assert len(writes) == 1

        finally:
            if task is not None:
                if not task.done():
                    task.cancel()

                await asyncio.gather(
                    task,
                    return_exceptions=True,
                )

            await engine.dispose()

    asyncio.run(scenario())


def test_two_concurrent_completions_do_not_duplicate_records(
    pg_applicability_db,
    monkeypatch,
):
    writes = stub_pdf_storage(monkeypatch)

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        tasks = []

        try:
            course_id, _, enrollment_id = await make_enrollment(
                maker
            )

            trackers = [{}, {}]
            started = [
                asyncio.Event(),
                asyncio.Event(),
            ]

            async with maker.begin() as blocker:
                blocker_pid = await blocker.scalar(
                    text("SELECT pg_backend_pid()")
                )

                await acquire_registry_source_write_fences(
                    session=blocker,
                    source_fences=(
                        RegistrySourceFence(
                            "course",
                            course_id,
                        ),
                    ),
                )

                for index in range(2):
                    tasks.append(
                        asyncio.create_task(
                            call_account_completion(
                                maker,
                                enrollment_id,
                                started=started[index],
                                tracker=trackers[index],
                            )
                        )
                    )

                for event in started:
                    await asyncio.wait_for(
                        event.wait(),
                        timeout=10,
                    )

                for tracker in trackers:
                    await _wait_for_pg_blocker(
                        engine,
                        tracker["pid"],
                        blocker_pid,
                    )

                assert all(
                    not task.done()
                    for task in tasks
                )

                before = await read_completion_state(
                    maker,
                    enrollment_id,
                )

                assert before["status"] == "active"
                assert before["documents"] == []
                assert before["obligation_count"] == 0

            results = await asyncio.wait_for(
                asyncio.gather(
                    *tasks,
                    return_exceptions=True,
                ),
                timeout=30,
            )

            successes = [
                result for result in results
                if not isinstance(result, BaseException)
            ]

            rejected = [
                result for result in results
                if isinstance(result, HTTPException)
                and result.status_code in {400, 409}
            ]

            assert len(successes) == 1
            assert len(rejected) == 1

            after = await read_completion_state(
                maker,
                enrollment_id,
            )

            assert_single_completion(after)
            assert len(writes) == 1

        finally:
            for task in tasks:
                if not task.done():
                    task.cancel()

            if tasks:
                await asyncio.gather(
                    *tasks,
                    return_exceptions=True,
                )

            await engine.dispose()

    asyncio.run(scenario())


def test_completion_obligation_failure_rolls_back_database(
    pg_applicability_db,
    monkeypatch,
):
    writes = stub_pdf_storage(monkeypatch)

    async def fail_obligations(
        *,
        enrollment,
        session,
        document,
    ):
        assert enrollment.status == "completed"
        assert document.id is not None

        raise RuntimeError(
            "m21-completion-obligation-failure"
        )

    monkeypatch.setattr(
        completion_service,
        "ensure_registry_obligations_for_completed_enrollment",
        fail_obligations,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        try:
            _, _, enrollment_id = await make_enrollment(
                maker
            )

            before = await read_completion_state(
                maker,
                enrollment_id,
            )

            async with maker() as session:
                enrollment = await session.get(
                    Enrollment,
                    enrollment_id,
                )

                learner = await session.get(
                    User,
                    enrollment.user_id,
                )

                with pytest.raises(
                    RuntimeError,
                    match="m21-completion-obligation-failure",
                ):
                    await account_api.complete_account_course_learning(
                        enrollment_id=enrollment_id,
                        current_user=learner,
                        session=session,
                    )

                assert not session.in_transaction()

            after = await read_completion_state(
                maker,
                enrollment_id,
            )

            assert after == before

            # Physical PDF persistence is mocked in this test.
            # Filesystem compensation belongs to P2.1-C4.
            assert len(writes) == 1

        finally:
            await engine.dispose()

    asyncio.run(scenario())


def test_completion_cancellation_rolls_back_database(
    pg_applicability_db,
    monkeypatch,
):
    writes = stub_pdf_storage(monkeypatch)

    async def cancel_obligations(
        *,
        enrollment,
        session,
        document,
    ):
        assert enrollment.status == "completed"
        assert document.id is not None

        raise asyncio.CancelledError()

    monkeypatch.setattr(
        completion_service,
        "ensure_registry_obligations_for_completed_enrollment",
        cancel_obligations,
    )

    async def scenario():
        engine = create_async_engine(pg_applicability_db)
        maker = async_sessionmaker(
            engine,
            expire_on_commit=False,
        )

        try:
            _, _, enrollment_id = await make_enrollment(
                maker
            )

            before = await read_completion_state(
                maker,
                enrollment_id,
            )

            async with maker() as session:
                enrollment = await session.get(
                    Enrollment,
                    enrollment_id,
                )

                learner = await session.get(
                    User,
                    enrollment.user_id,
                )

                with pytest.raises(
                    asyncio.CancelledError,
                ):
                    await account_api.complete_account_course_learning(
                        enrollment_id=enrollment_id,
                        current_user=learner,
                        session=session,
                    )

                assert not session.in_transaction()

            after = await read_completion_state(
                maker,
                enrollment_id,
            )

            assert after == before
            assert len(writes) == 1

        finally:
            await engine.dispose()

    asyncio.run(scenario())
