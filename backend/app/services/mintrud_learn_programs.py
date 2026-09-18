from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mintrud_learn_program import (
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
    CourseMintrudLearnProgram,
    MintrudLearnProgram,
)


async def load_course_mintrud_learn_programs(
    session: AsyncSession,
    *,
    course_id: str,
    schema_version: str = (
        MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
    ),
    active_only: bool = True,
) -> tuple[MintrudLearnProgram, ...]:
    query = (
        select(MintrudLearnProgram)
        .join(
            CourseMintrudLearnProgram,
            CourseMintrudLearnProgram.mintrud_learn_program_id
            == MintrudLearnProgram.id,
        )
        .where(
            CourseMintrudLearnProgram.course_id == str(course_id),
            MintrudLearnProgram.schema_version == str(schema_version),
        )
    )

    if active_only:
        query = query.where(
            MintrudLearnProgram.is_active.is_(True)
        )

    query = query.order_by(
        MintrudLearnProgram.learn_program_id.asc(),
        MintrudLearnProgram.code.asc(),
        MintrudLearnProgram.id.asc(),
    )

    result = await session.execute(query)

    return tuple(result.scalars().all())


def build_mintrud_learn_program_snapshot(
    programs: Iterable[Any],
) -> tuple[dict[str, Any], ...]:
    rows = []

    for program in programs:
        rows.append(
            {
                "id": str(getattr(program, "id", "") or ""),
                "learn_program_id": int(
                    getattr(program, "learn_program_id")
                ),
                "code": str(
                    getattr(program, "code", "") or ""
                ),
                "title": str(
                    getattr(program, "title", "") or ""
                ),
                "schema_version": str(
                    getattr(program, "schema_version", "") or ""
                ),
            }
        )

    rows.sort(
        key=lambda item: (
            item["schema_version"],
            item["learn_program_id"],
            item["code"],
            item["id"],
        )
    )

    return tuple(rows)
