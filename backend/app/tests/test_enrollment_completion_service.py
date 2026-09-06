from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from uuid import uuid4

import pytest

import app.services.enrollment_completion as completion_service
from app.services.enrollment_completion import (
    EnrollmentCompletionResult,
    ensure_enrollment_completed,
)


class FakeSession:
    def __init__(self):
        self.flush_calls = 0
        self.commit_calls = 0

    async def flush(self):
        self.flush_calls += 1

    async def commit(self):
        self.commit_calls += 1
        raise AssertionError(
            "Completion service must not commit"
        )


def build_enrollment(
    *,
    status: str = "active",
    started_at=None,
    completed_at=None,
):
    return SimpleNamespace(
        id=str(uuid4()),
        user_id=str(uuid4()),
        course_id=str(uuid4()),
        organization_id=None,
        learning_group_id=None,
        status=status,
        started_at=started_at,
        completed_at=completed_at,
    )


def install_downstream_stubs(
    monkeypatch,
    *,
    events: list,
):
    document = SimpleNamespace(
        id=str(uuid4()),
    )

    obligations = {
        "frdo": SimpleNamespace(
            registry="frdo"
        ),
        "mintrud": SimpleNamespace(
            registry="mintrud"
        ),
    }

    async def fake_document_service(
        enrollment,
        session,
    ):
        events.append(
            (
                "document",
                enrollment.status,
                enrollment.completed_at,
            )
        )

        return document

    async def fake_obligation_service(
        *,
        enrollment,
        session,
        document,
    ):
        events.append(
            (
                "obligations",
                enrollment.status,
                enrollment.completed_at,
                document.id,
            )
        )

        return obligations

    monkeypatch.setattr(
        completion_service,
        "ensure_completion_document_for_enrollment",
        fake_document_service,
    )

    monkeypatch.setattr(
        completion_service,
        "ensure_registry_obligations_for_completed_enrollment",
        fake_obligation_service,
    )

    return document, obligations


def test_fresh_completion_sets_status_and_timestamps(
    monkeypatch,
) -> None:
    async def case():
        events = []
        document, obligations = (
            install_downstream_stubs(
                monkeypatch,
                events=events,
            )
        )

        enrollment = build_enrollment()
        session = FakeSession()

        result = await ensure_enrollment_completed(
            enrollment=enrollment,
            session=session,
        )

        assert isinstance(
            result,
            EnrollmentCompletionResult,
        )

        assert enrollment.status == "completed"
        assert enrollment.started_at is not None
        assert enrollment.completed_at is not None
        assert (
            enrollment.started_at
            == enrollment.completed_at
        )
        assert (
            enrollment.completed_at.tzinfo
            is not None
        )

        assert result.document is document
        assert result.obligations is obligations
        assert (
            result.was_already_completed
            is False
        )
        assert (
            result.started_at_was_set
            is True
        )
        assert (
            result.completed_at_was_set
            is True
        )

        assert session.flush_calls == 1
        assert session.commit_calls == 0

        assert [
            event[0]
            for event in events
        ] == [
            "document",
            "obligations",
        ]

    asyncio.run(case())


def test_explicit_completion_timestamp_is_used_when_missing(
    monkeypatch,
) -> None:
    async def case():
        events = []
        install_downstream_stubs(
            monkeypatch,
            events=events,
        )

        explicit_completed_at = datetime(
            2026,
            9,
            4,
            10,
            15,
            tzinfo=timezone.utc,
        )

        enrollment = build_enrollment()
        session = FakeSession()

        result = await ensure_enrollment_completed(
            enrollment=enrollment,
            session=session,
            completed_at=explicit_completed_at,
        )

        assert (
            enrollment.completed_at
            == explicit_completed_at
        )
        assert (
            enrollment.started_at
            == explicit_completed_at
        )
        assert (
            result.completed_at_was_set
            is True
        )
        assert (
            result.started_at_was_set
            is True
        )

    asyncio.run(case())


def test_existing_first_completion_timestamp_is_never_overwritten(
    monkeypatch,
) -> None:
    async def case():
        events = []
        install_downstream_stubs(
            monkeypatch,
            events=events,
        )

        first_started_at = datetime(
            2026,
            8,
            1,
            8,
            0,
            tzinfo=timezone.utc,
        )

        first_completed_at = datetime(
            2026,
            8,
            2,
            9,
            30,
            tzinfo=timezone.utc,
        )

        later_requested_at = (
            first_completed_at
            + timedelta(days=30)
        )

        enrollment = build_enrollment(
            status="completed",
            started_at=first_started_at,
            completed_at=first_completed_at,
        )

        session = FakeSession()

        result = await ensure_enrollment_completed(
            enrollment=enrollment,
            session=session,
            completed_at=later_requested_at,
        )

        assert (
            enrollment.started_at
            == first_started_at
        )
        assert (
            enrollment.completed_at
            == first_completed_at
        )

        assert (
            result.was_already_completed
            is True
        )
        assert (
            result.started_at_was_set
            is False
        )
        assert (
            result.completed_at_was_set
            is False
        )

    asyncio.run(case())


def test_existing_completed_at_backfills_missing_started_at(
    monkeypatch,
) -> None:
    async def case():
        events = []
        install_downstream_stubs(
            monkeypatch,
            events=events,
        )

        first_completed_at = datetime(
            2026,
            8,
            10,
            12,
            0,
            tzinfo=timezone.utc,
        )

        enrollment = build_enrollment(
            status="completed",
            started_at=None,
            completed_at=first_completed_at,
        )

        session = FakeSession()

        result = await ensure_enrollment_completed(
            enrollment=enrollment,
            session=session,
        )

        assert (
            enrollment.completed_at
            == first_completed_at
        )
        assert (
            enrollment.started_at
            == first_completed_at
        )
        assert (
            result.started_at_was_set
            is True
        )
        assert (
            result.completed_at_was_set
            is False
        )

    asyncio.run(case())


def test_existing_started_at_is_preserved_on_first_completion(
    monkeypatch,
) -> None:
    async def case():
        events = []
        install_downstream_stubs(
            monkeypatch,
            events=events,
        )

        original_started_at = datetime(
            2026,
            7,
            1,
            7,
            0,
            tzinfo=timezone.utc,
        )

        completion_at = datetime(
            2026,
            7,
            15,
            18,
            0,
            tzinfo=timezone.utc,
        )

        enrollment = build_enrollment(
            status="active",
            started_at=original_started_at,
            completed_at=None,
        )

        session = FakeSession()

        result = await ensure_enrollment_completed(
            enrollment=enrollment,
            session=session,
            completed_at=completion_at,
        )

        assert (
            enrollment.started_at
            == original_started_at
        )
        assert (
            enrollment.completed_at
            == completion_at
        )

        assert (
            result.started_at_was_set
            is False
        )
        assert (
            result.completed_at_was_set
            is True
        )

    asyncio.run(case())


def test_document_is_created_before_obligations_and_passed_through(
    monkeypatch,
) -> None:
    async def case():
        events = []

        document, obligations = (
            install_downstream_stubs(
                monkeypatch,
                events=events,
            )
        )

        enrollment = build_enrollment()
        session = FakeSession()

        result = await ensure_enrollment_completed(
            enrollment=enrollment,
            session=session,
        )

        assert result.document is document
        assert result.obligations is obligations

        assert events[0][0] == "document"
        assert events[1][0] == "obligations"
        assert (
            events[1][3]
            == document.id
        )

        assert (
            events[0][1]
            == "completed"
        )
        assert (
            events[1][1]
            == "completed"
        )

        assert (
            events[0][2]
            == enrollment.completed_at
        )
        assert (
            events[1][2]
            == enrollment.completed_at
        )

    asyncio.run(case())


def test_downstream_error_propagates_without_commit(
    monkeypatch,
) -> None:
    async def case():
        events = []

        async def fake_document_service(
            enrollment,
            session,
        ):
            events.append("document")

            return SimpleNamespace(
                id=str(uuid4()),
            )

        async def failing_obligation_service(
            *,
            enrollment,
            session,
            document,
        ):
            events.append("obligations")
            raise RuntimeError(
                "obligation failure"
            )

        monkeypatch.setattr(
            completion_service,
            "ensure_completion_document_for_enrollment",
            fake_document_service,
        )

        monkeypatch.setattr(
            completion_service,
            "ensure_registry_obligations_for_completed_enrollment",
            failing_obligation_service,
        )

        enrollment = build_enrollment()
        session = FakeSession()

        with pytest.raises(
            RuntimeError,
            match="obligation failure",
        ):
            await ensure_enrollment_completed(
                enrollment=enrollment,
                session=session,
            )

        assert events == [
            "document",
            "obligations",
        ]
        assert enrollment.status == "completed"
        assert enrollment.completed_at is not None
        assert session.flush_calls == 1
        assert session.commit_calls == 0

    asyncio.run(case())
