from __future__ import annotations

import asyncio
from types import SimpleNamespace

from app.services.mintrud_learn_programs import (
    build_mintrud_learn_program_snapshot,
    load_course_mintrud_learn_programs,
)


class FakeScalarResult:
    def __init__(self, rows):
        self.rows = list(rows)

    def all(self):
        return list(self.rows)


class FakeExecuteResult:
    def __init__(self, rows):
        self.rows = list(rows)

    def scalars(self):
        return FakeScalarResult(self.rows)


class FakeSession:
    def __init__(self, rows):
        self.rows = list(rows)
        self.statement = None

    async def execute(self, statement):
        self.statement = statement
        return FakeExecuteResult(self.rows)


def make_program(
    *,
    id,
    learn_program_id,
    code,
    title,
    schema_version="1.0.9",
):
    return SimpleNamespace(
        id=id,
        learn_program_id=learn_program_id,
        code=code,
        title=title,
        schema_version=schema_version,
    )


def test_program_snapshot_is_deterministic():
    snapshot = build_mintrud_learn_program_snapshot(
        [
            make_program(
                id="program-2",
                learn_program_id=2,
                code="B",
                title="Second",
            ),
            make_program(
                id="program-1",
                learn_program_id=1,
                code="A",
                title="First",
            ),
        ]
    )

    assert snapshot == (
        {
            "id": "program-1",
            "learn_program_id": 1,
            "code": "A",
            "title": "First",
            "schema_version": "1.0.9",
        },
        {
            "id": "program-2",
            "learn_program_id": 2,
            "code": "B",
            "title": "Second",
            "schema_version": "1.0.9",
        },
    )


def test_course_program_query_is_current_schema_and_active_only():
    row = make_program(
        id="program-1",
        learn_program_id=1,
        code="A",
        title="First",
    )

    session = FakeSession([row])

    result = asyncio.run(
        load_course_mintrud_learn_programs(
            session,
            course_id="course-1",
        )
    )

    assert result == (row,)

    compiled = session.statement.compile()
    values = set(compiled.params.values())

    assert "course-1" in values
    assert "1.0.9" in values

    statement = str(session.statement)
    where_clause = str(
        session.statement.whereclause
    )

    assert "course_mintrud_learn_programs" in statement
    assert (
        "mintrud_learn_programs.is_active"
        in where_clause
    )


def test_course_program_query_can_include_inactive():
    session = FakeSession([])

    asyncio.run(
        load_course_mintrud_learn_programs(
            session,
            course_id="course-2",
            active_only=False,
        )
    )

    where_clause = str(
        session.statement.whereclause
    )

    assert (
        "mintrud_learn_programs.is_active"
        not in where_clause
    )
