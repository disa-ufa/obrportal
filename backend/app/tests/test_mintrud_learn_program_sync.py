from __future__ import annotations

import asyncio

import pytest

from app.mintrud_learn_program_catalog import (
    MINTRUD_LEARN_PROGRAM_BY_ID_V109,
    MINTRUD_LEARN_PROGRAM_CATALOG_V109,
)
from app.models.mintrud_learn_program import (
    MintrudLearnProgram,
)
from app.services.mintrud_learn_programs import (
    MintrudLearnProgramCatalogSyncError,
    sync_mintrud_learn_program_catalog_v109,
)


class FakeScalarResult:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return list(
            self.rows
        )


class FakeExecuteResult:
    def __init__(self, rows):
        self.rows = rows

    def scalars(self):
        return FakeScalarResult(
            self.rows
        )


class FakeSession:
    def __init__(self, existing=()):
        self.existing = list(
            existing
        )
        self.added = []
        self.flush_count = 0

    async def execute(self, _query):
        return FakeExecuteResult(
            self.existing
            + self.added
        )

    def add(self, value):
        self.added.append(
            value
        )

    async def flush(self):
        self.flush_count += 1


def canonical_model(
    learn_program_id: int,
    **overrides,
):
    canonical = (
        MINTRUD_LEARN_PROGRAM_BY_ID_V109[
            learn_program_id
        ]
    )

    values = {
        "learn_program_id": (
            canonical.learn_program_id
        ),
        "code": canonical.code,
        "title": canonical.title,
        "schema_version": (
            canonical.schema_version
        ),
        "is_active": True,
    }

    values.update(
        overrides
    )

    return MintrudLearnProgram(
        **values
    )


def test_sync_creates_exact_canonical_catalog_and_is_idempotent():
    async def scenario():
        session = FakeSession()

        first = (
            await sync_mintrud_learn_program_catalog_v109(
                session
            )
        )

        assert first.created == 28
        assert first.updated == 0
        assert first.unchanged == 0
        assert first.deactivated == 0
        assert len(session.added) == 28
        assert session.flush_count == 1

        assert {
            item.learn_program_id
            for item in session.added
        } == {
            item.learn_program_id
            for item in MINTRUD_LEARN_PROGRAM_CATALOG_V109
        }

        second = (
            await sync_mintrud_learn_program_catalog_v109(
                session
            )
        )

        assert second.created == 0
        assert second.updated == 0
        assert second.unchanged == 28
        assert second.deactivated == 0
        assert len(session.added) == 28
        assert session.flush_count == 2

    asyncio.run(
        scenario()
    )


def test_sync_repairs_canonical_title_and_active_flag():
    async def scenario():
        program = canonical_model(
            1,
            title="stale title",
            is_active=False,
        )

        session = FakeSession(
            [program]
        )

        result = (
            await sync_mintrud_learn_program_catalog_v109(
                session
            )
        )

        canonical = (
            MINTRUD_LEARN_PROGRAM_BY_ID_V109[
                1
            ]
        )

        assert result.created == 27
        assert result.updated == 1
        assert result.unchanged == 0
        assert result.deactivated == 0

        assert program.title == canonical.title
        assert program.code == canonical.code
        assert program.is_active is True

    asyncio.run(
        scenario()
    )


def test_sync_fails_closed_on_unknown_v109_id_without_mutation():
    async def scenario():
        unknown = MintrudLearnProgram(
            learn_program_id=999999,
            code="LEGACY-UNKNOWN",
            title="Legacy unknown program",
            schema_version="1.0.9",
            is_active=True,
        )

        session = FakeSession(
            [unknown]
        )

        with pytest.raises(
            MintrudLearnProgramCatalogSyncError,
            match=(
                "Unexpected Mintrud learn_program_id"
                ".*999999"
            ),
        ):
            await sync_mintrud_learn_program_catalog_v109(
                session
            )

        assert unknown.is_active is True
        assert unknown in session.existing
        assert session.added == []
        assert session.flush_count == 0

    asyncio.run(
        scenario()
    )


def test_sync_fails_closed_on_canonical_code_mapped_to_wrong_id():
    async def scenario():
        official_code = (
            MINTRUD_LEARN_PROGRAM_BY_ID_V109[
                1
            ].code
        )

        conflicting = MintrudLearnProgram(
            learn_program_id=2,
            code=official_code,
            title="Conflicting row",
            schema_version="1.0.9",
            is_active=True,
        )

        session = FakeSession(
            [conflicting]
        )

        with pytest.raises(
            MintrudLearnProgramCatalogSyncError,
            match="Canonical Mintrud code conflict",
        ):
            await sync_mintrud_learn_program_catalog_v109(
                session
            )

        assert session.added == []
        assert session.flush_count == 0

    asyncio.run(
        scenario()
    )