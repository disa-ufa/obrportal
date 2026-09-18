from __future__ import annotations

from pathlib import Path

from app.schemas.admin import (
    AdminCourseMintrudLearnProgramUpdate,
    AdminMintrudLearnProgramItem,
)


def admin_source() -> str:
    return (
        Path(__file__)
        .resolve()
        .parents[1]
        .joinpath(
            "api",
            "v1",
            "admin.py",
        )
        .read_text(
            encoding="utf-8"
        )
    )


def mapping_update_body() -> str:
    source = admin_source()

    start = source.index(
        "async def replace_admin_course_mintrud_programs("
    )

    end = source.index(
        '@router.get("/courses"',
        start,
    )

    return source[start:end]


def test_mintrud_program_admin_schemas():
    payload = AdminCourseMintrudLearnProgramUpdate(
        mintrud_learn_program_ids=[
            "program-1",
            "program-2",
        ]
    )

    assert payload.mintrud_learn_program_ids == [
        "program-1",
        "program-2",
    ]

    item = AdminMintrudLearnProgramItem(
        id="program-1",
        learn_program_id=1,
        code="A",
        title="Program A",
        schema_version="1.0.9",
        is_active=True,
    )

    assert item.learn_program_id == 1
    assert item.schema_version == "1.0.9"
    assert item.is_active is True


def test_admin_exposes_program_catalog_and_mapping_routes():
    source = admin_source()

    assert '"/mintrud/learn-programs"' in source

    assert (
        '"/courses/{course_id}/mintrud-programs"'
        in source
    )

    assert (
        "async def list_admin_mintrud_learn_programs("
        in source
    )

    assert (
        "async def get_admin_course_mintrud_programs("
        in source
    )

    assert (
        "async def replace_admin_course_mintrud_programs("
        in source
    )


def test_mapping_update_is_mintrud_only_and_audited():
    body = mapping_update_body()

    assert (
        "lock_mintrud_registry_approvals_for_course("
        in body
    )

    assert (
        "invalidate_mintrud_registry_approvals_for_course("
        in body
    )

    assert (
        "invalidate_registry_approvals_for_course("
        not in body
    )

    assert (
        "admin.course_mintrud_programs_updated"
        in body
    )

    assert '"catalog.write"' in body


def test_mapping_update_validates_before_mutation():
    body = mapping_update_body()

    resolve_index = body.index(
        "resolve_active_mintrud_learn_programs("
    )

    lock_index = body.index(
        "lock_mintrud_registry_approvals_for_course("
    )

    replace_index = body.index(
        "replace_course_mintrud_learn_programs("
    )

    invalidate_index = body.index(
        "invalidate_mintrud_registry_approvals_for_course("
    )

    commit_index = body.index(
        "await session.commit()"
    )

    assert (
        resolve_index
        < lock_index
        < replace_index
        < invalidate_index
        < commit_index
    )


def test_mapping_update_handles_invalid_selection_before_lock():
    body = mapping_update_body()

    resolve_index = body.index(
        "resolve_active_mintrud_learn_programs("
    )

    error_index = body.index(
        "except MintrudLearnProgramSelectionError"
    )

    lock_index = body.index(
        "lock_mintrud_registry_approvals_for_course("
    )

    assert (
        resolve_index
        < error_index
        < lock_index
    )


def test_mapping_update_allows_noop_without_invalidation():
    body = mapping_update_body()

    changed_index = body.index(
        "mintrud_learn_program_selection_changed("
    )

    noop_index = body.index(
        "if not changed:"
    )

    lock_index = body.index(
        "lock_mintrud_registry_approvals_for_course("
    )

    assert (
        changed_index
        < noop_index
        < lock_index
    )
