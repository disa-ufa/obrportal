from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from sqlalchemy import delete, select
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

class MintrudLearnProgramSelectionError(
    ValueError
):
    def __init__(
        self,
        invalid_program_ids: Iterable[str],
    ):
        self.invalid_program_ids = tuple(
            str(value)
            for value in invalid_program_ids
        )

        super().__init__(
            "Unknown, inactive, or incompatible "
            "Mintrud learn program ids: "
            + ", ".join(
                self.invalid_program_ids
            )
        )


def normalize_mintrud_learn_program_ids(
    program_ids: Iterable[str],
) -> tuple[str, ...]:
    normalized: list[str] = []
    seen: set[str] = set()

    for raw_value in program_ids:
        value = str(
            raw_value
        ).strip()

        if not value:
            raise MintrudLearnProgramSelectionError(
                ("<blank>",)
            )

        if value in seen:
            continue

        seen.add(
            value
        )

        normalized.append(
            value
        )

    return tuple(
        normalized
    )


async def load_mintrud_learn_program_catalog(
    session: AsyncSession,
    *,
    schema_version: str = (
        MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
    ),
    active_only: bool = True,
) -> tuple[MintrudLearnProgram, ...]:
    query = (
        select(
            MintrudLearnProgram
        )
        .where(
            MintrudLearnProgram.schema_version
            == str(schema_version)
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

    result = await session.execute(
        query
    )

    return tuple(
        result.scalars().all()
    )


async def resolve_active_mintrud_learn_programs(
    session: AsyncSession,
    *,
    program_ids: Iterable[str],
    schema_version: str = (
        MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
    ),
) -> tuple[MintrudLearnProgram, ...]:
    normalized_ids = (
        normalize_mintrud_learn_program_ids(
            program_ids
        )
    )

    if not normalized_ids:
        return ()

    result = await session.execute(
        select(
            MintrudLearnProgram
        )
        .where(
            MintrudLearnProgram.id.in_(
                normalized_ids
            ),
            MintrudLearnProgram.schema_version
            == str(schema_version),
            MintrudLearnProgram.is_active.is_(True),
        )
        .order_by(
            MintrudLearnProgram.learn_program_id.asc(),
            MintrudLearnProgram.code.asc(),
            MintrudLearnProgram.id.asc(),
        )
    )

    programs = tuple(
        result.scalars().all()
    )

    found_ids = {
        str(program.id)
        for program in programs
    }

    invalid_ids = tuple(
        value
        for value in normalized_ids
        if value not in found_ids
    )

    if invalid_ids:
        raise MintrudLearnProgramSelectionError(
            invalid_ids
        )

    return programs


def mintrud_learn_program_selection_changed(
    current_programs: Iterable[Any],
    selected_programs: Iterable[Any],
) -> bool:
    current_ids = {
        str(
            getattr(
                program,
                "id",
                "",
            )
            or ""
        )
        for program in current_programs
    }

    selected_ids = {
        str(
            getattr(
                program,
                "id",
                "",
            )
            or ""
        )
        for program in selected_programs
    }

    return (
        current_ids
        != selected_ids
    )


async def replace_course_mintrud_learn_programs(
    session: AsyncSession,
    *,
    course_id: str,
    programs: Iterable[MintrudLearnProgram],
    schema_version: str = (
        MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
    ),
) -> None:
    selected_programs = tuple(
        programs
    )

    current_schema_program_ids = (
        select(
            MintrudLearnProgram.id
        )
        .where(
            MintrudLearnProgram.schema_version
            == str(schema_version)
        )
    )

    await session.execute(
        delete(
            CourseMintrudLearnProgram
        )
        .where(
            CourseMintrudLearnProgram.course_id
            == str(course_id),
            CourseMintrudLearnProgram
            .mintrud_learn_program_id
            .in_(
                current_schema_program_ids
            ),
        )
    )

    for program in selected_programs:
        session.add(
            CourseMintrudLearnProgram(
                course_id=str(
                    course_id
                ),
                mintrud_learn_program_id=str(
                    program.id
                ),
            )
        )

    await session.flush()
