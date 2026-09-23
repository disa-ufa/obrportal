from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.mintrud_learn_program_catalog import (
    MINTRUD_LEARN_PROGRAM_CATALOG_V109,
    MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109,
)
from app.models.mintrud_learn_program import (
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

class MintrudLearnProgramCatalogSyncError(
    ValueError
):
    pass


@dataclass(frozen=True)
class MintrudLearnProgramCatalogSyncResult:
    created: int
    updated: int
    unchanged: int
    deactivated: int


async def sync_mintrud_learn_program_catalog_v109(
    session: AsyncSession,
) -> MintrudLearnProgramCatalogSyncResult:
    result = await session.execute(
        select(
            MintrudLearnProgram
        ).where(
            MintrudLearnProgram.schema_version
            == MINTRUD_LEARN_PROGRAM_SCHEMA_VERSION_V109
        )
    )

    existing = tuple(
        result.scalars().all()
    )

    existing_by_program_id: dict[
        int,
        MintrudLearnProgram,
    ] = {}

    for program in existing:
        program_id = int(
            program.learn_program_id
        )

        if program_id in existing_by_program_id:
            raise MintrudLearnProgramCatalogSyncError(
                "Duplicate Mintrud learn_program_id "
                f"for schema 1.0.9: {program_id}"
            )

        existing_by_program_id[
            program_id
        ] = program

    canonical_by_program_id = {
        item.learn_program_id: item
        for item in MINTRUD_LEARN_PROGRAM_CATALOG_V109
    }

    unexpected_program_ids = tuple(
        sorted(
            set(existing_by_program_id)
            - set(canonical_by_program_id)
        )
    )

    if unexpected_program_ids:
        raise MintrudLearnProgramCatalogSyncError(
            "Unexpected Mintrud learn_program_id "
            "values for schema 1.0.9: "
            + ", ".join(
                str(program_id)
                for program_id in unexpected_program_ids
            )
        )

    canonical_program_id_by_code = {
        item.code: item.learn_program_id
        for item in MINTRUD_LEARN_PROGRAM_CATALOG_V109
    }

    for program in existing:
        expected_program_id = (
            canonical_program_id_by_code.get(
                str(
                    program.code
                    or ""
                )
            )
        )

        if (
            expected_program_id is not None
            and expected_program_id
            != int(
                program.learn_program_id
            )
        ):
            raise MintrudLearnProgramCatalogSyncError(
                "Canonical Mintrud code conflict "
                f"for schema 1.0.9: code={program.code!r}, "
                f"stored_id={program.learn_program_id}, "
                f"expected_id={expected_program_id}"
            )

    created = 0
    updated = 0
    unchanged = 0
    deactivated = 0

    for canonical in (
        MINTRUD_LEARN_PROGRAM_CATALOG_V109
    ):
        program = existing_by_program_id.get(
            canonical.learn_program_id
        )

        if program is None:
            session.add(
                MintrudLearnProgram(
                    learn_program_id=(
                        canonical.learn_program_id
                    ),
                    code=canonical.code,
                    title=canonical.title,
                    schema_version=(
                        canonical.schema_version
                    ),
                    is_active=True,
                )
            )
            created += 1
            continue

        changed = False

        if program.code != canonical.code:
            program.code = canonical.code
            changed = True

        if program.title != canonical.title:
            program.title = canonical.title
            changed = True

        if (
            program.schema_version
            != canonical.schema_version
        ):
            program.schema_version = (
                canonical.schema_version
            )
            changed = True

        if program.is_active is not True:
            program.is_active = True
            changed = True

        if changed:
            updated += 1
        else:
            unchanged += 1

    await session.flush()

    return MintrudLearnProgramCatalogSyncResult(
        created=created,
        updated=updated,
        unchanged=unchanged,
        deactivated=deactivated,
    )
