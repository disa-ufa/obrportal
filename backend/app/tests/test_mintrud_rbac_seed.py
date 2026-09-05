from __future__ import annotations

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1.admin import (
    SYSTEM_ROLE_CODES,
    ensure_role_can_be_deleted,
    ensure_role_metadata_can_be_modified,
    ensure_role_permissions_can_be_modified,
)
from app.db.seed import (
    PERMISSIONS,
    ROLES,
    ROLE_PERMISSION_MAP,
)


EXPECTED_MINTRUD_PERMISSIONS = {
    "mintrud.read",
    "mintrud.write",
    "mintrud.validate",
    "mintrud.approve",
    "mintrud.export",
}


EXPECTED_MINTRUD_ROLE_PERMISSIONS = {
    "documents.read",
    "mintrud.read",
    "mintrud.write",
    "mintrud.validate",
    "mintrud.approve",
    "mintrud.export",
    "audit.read",
    "files.read",
    "files.write",
}


def test_mintrud_seed_contract() -> None:
    roles_by_code = {
        item["code"]: item
        for item in ROLES
    }

    assert (
        "mintrud_operator"
        in roles_by_code
    )

    assert (
        roles_by_code[
            "mintrud_operator"
        ]["name"]
        == "???????? ????????"
    )

    permission_codes = {
        code
        for code, _name
        in PERMISSIONS
    }

    assert (
        EXPECTED_MINTRUD_PERMISSIONS
        <= permission_codes
    )

    assert (
        set(
            ROLE_PERMISSION_MAP[
                "mintrud_operator"
            ]
        )
        == EXPECTED_MINTRUD_ROLE_PERMISSIONS
    )


def test_mintrud_role_is_system_role() -> None:
    assert (
        "mintrud_operator"
        in SYSTEM_ROLE_CODES
    )

    role = SimpleNamespace(
        code="mintrud_operator"
    )

    with pytest.raises(
        HTTPException
    ) as metadata_error:
        ensure_role_metadata_can_be_modified(
            role
        )

    assert (
        metadata_error.value.status_code
        == 400
    )

    with pytest.raises(
        HTTPException
    ) as delete_error:
        asyncio.run(
            ensure_role_can_be_deleted(
                role,
                None,
            )
        )

    assert (
        delete_error.value.status_code
        == 400
    )


def test_mintrud_operator_permissions_follow_frdo_policy() -> None:
    mintrud_role = SimpleNamespace(
        code="mintrud_operator"
    )

    frdo_role = SimpleNamespace(
        code="frdo_operator"
    )

    ensure_role_permissions_can_be_modified(
        mintrud_role
    )

    ensure_role_permissions_can_be_modified(
        frdo_role
    )
