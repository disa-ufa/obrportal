"""Regression: SQLAlchemy Row-like Mintrud mapping values."""

import asyncio
from contextlib import nullcontext
from uuid import uuid4

from app.services import registry_action_scope as scope


class RowLike:
    def __init__(self, *values):
        self.values = values

    def __iter__(self):
        return iter(self.values)

    def __len__(self):
        return len(self.values)


class Result:
    def __init__(self, rows):
        self.rows = rows

    def all(self):
        return list(self.rows)


def test_mintrud_mapping_row_is_converted_to_tuple(monkeypatch):
    actor = str(uuid4())
    obligation = str(uuid4())
    enrollment = str(uuid4())
    course = str(uuid4())
    learner = str(uuid4())
    program = str(uuid4())

    obligation_row = RowLike(
        obligation,
        enrollment,
        "mintrud",
        course,
        learner,
        None,
        None,
        None,
        None,
    )

    mapping_row = RowLike(course, program)

    assert not isinstance(mapping_row, tuple)

    class Session:
        new = set()
        dirty = set()
        deleted = set()

        def __init__(self):
            self.calls = 0
            self.no_autoflush = nullcontext()

        def in_transaction(self):
            return True

        def in_nested_transaction(self):
            return False

        async def execute(self, statement):
            self.calls += 1

            if self.calls == 1:
                return Result([obligation_row])

            if self.calls == 2:
                return Result([mapping_row])

            raise AssertionError("Unexpected SQL query")

    async def isolation_check(session):
        return None

    monkeypatch.setattr(
        scope,
        "_assert_read_committed",
        isolation_check,
    )

    session = Session()

    result = asyncio.run(
        scope.discover_registry_action_scope(
            session=session,
            actor_id=actor,
            registry="mintrud",
            obligation_ids=(obligation,),
        )
    )

    assert session.calls == 2
    assert result.mintrud_mapping_memberships == (
        (course, program),
    )