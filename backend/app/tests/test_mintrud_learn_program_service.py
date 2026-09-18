from __future__ import annotations

import asyncio
from types import SimpleNamespace

from app.services.mintrud_learn_programs import (
    MintrudLearnProgramSelectionError,
    build_mintrud_learn_program_snapshot,
    load_course_mintrud_learn_programs,
    load_mintrud_learn_program_catalog,
    mintrud_learn_program_selection_changed,
    normalize_mintrud_learn_program_ids,
    replace_course_mintrud_learn_programs,
    resolve_active_mintrud_learn_programs,
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
        self.statements = []
        self.added = []
        self.flush_count = 0

    async def execute(self, statement):
        self.statement = statement
        self.statements.append(
            statement
        )
        return FakeExecuteResult(self.rows)

    def add(self, value):
        self.added.append(
            value
        )

    async def flush(self):
        self.flush_count += 1


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

def test_normalize_program_ids_deduplicates_preserving_order():
    assert (
        normalize_mintrud_learn_program_ids(
            [
                " program-2 ",
                "program-1",
                "program-2",
            ]
        )
        == (
            "program-2",
            "program-1",
        )
    )


def test_normalize_program_ids_rejects_blank():
    try:
        normalize_mintrud_learn_program_ids(
            [
                "program-1",
                "   ",
            ]
        )
    except MintrudLearnProgramSelectionError as exc:
        assert exc.invalid_program_ids == (
            "<blank>",
        )
    else:
        raise AssertionError(
            "Blank program id was accepted"
        )


def test_program_catalog_is_current_schema_and_active_only():
    row = make_program(
        id="program-1",
        learn_program_id=1,
        code="A",
        title="First",
    )

    session = FakeSession(
        [row]
    )

    result = asyncio.run(
        load_mintrud_learn_program_catalog(
            session
        )
    )

    assert result == (
        row,
    )

    compiled = (
        session.statement.compile()
    )

    assert (
        "1.0.9"
        in set(
            compiled.params.values()
        )
    )

    where_clause = str(
        session.statement.whereclause
    )

    assert (
        "mintrud_learn_programs.schema_version"
        in where_clause
    )

    assert (
        "mintrud_learn_programs.is_active"
        in where_clause
    )


def test_resolve_programs_rejects_missing_or_inactive_ids():
    row = make_program(
        id="program-1",
        learn_program_id=1,
        code="A",
        title="First",
    )

    session = FakeSession(
        [row]
    )

    try:
        asyncio.run(
            resolve_active_mintrud_learn_programs(
                session,
                program_ids=(
                    "program-1",
                    "program-missing",
                ),
            )
        )
    except MintrudLearnProgramSelectionError as exc:
        assert exc.invalid_program_ids == (
            "program-missing",
        )
    else:
        raise AssertionError(
            "Missing program id was accepted"
        )


def test_selection_change_uses_program_identity_not_order():
    first = make_program(
        id="program-1",
        learn_program_id=1,
        code="A",
        title="First",
    )

    second = make_program(
        id="program-2",
        learn_program_id=2,
        code="B",
        title="Second",
    )

    assert (
        mintrud_learn_program_selection_changed(
            (first, second),
            (second, first),
        )
        is False
    )

    assert (
        mintrud_learn_program_selection_changed(
            (first,),
            (first, second),
        )
        is True
    )


def test_replace_course_programs_replaces_current_schema_mapping():
    row = make_program(
        id="program-1",
        learn_program_id=1,
        code="A",
        title="First",
    )

    session = FakeSession(
        []
    )

    asyncio.run(
        replace_course_mintrud_learn_programs(
            session,
            course_id="course-1",
            programs=(
                row,
            ),
        )
    )

    assert len(
        session.statements
    ) == 1

    delete_statement = str(
        session.statements[0]
    )

    assert (
        "DELETE FROM course_mintrud_learn_programs"
        in delete_statement
    )

    assert (
        "mintrud_learn_programs.schema_version"
        in delete_statement
    )

    assert len(
        session.added
    ) == 1

    mapping = session.added[0]

    assert (
        str(
            mapping.course_id
        )
        == "course-1"
    )

    assert (
        str(
            mapping.mintrud_learn_program_id
        )
        == "program-1"
    )

    assert session.flush_count == 1
