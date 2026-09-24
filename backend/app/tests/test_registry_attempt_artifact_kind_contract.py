from __future__ import annotations

import ast
from pathlib import Path


BACKEND = (
    Path(__file__)
    .resolve()
    .parents[2]
)


INTERNAL = "internal-export-package"
PORTAL = "portal-upload-artifact"


def read(relative):
    return (
        BACKEND
        / relative
    ).read_text(
        encoding="utf-8"
    )


def function_source(
    relative,
    name,
):
    text = read(relative)
    tree = ast.parse(text)

    node = next(
        item
        for item in tree.body
        if isinstance(
            item,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef,
            ),
        )
        and item.name == name
    )

    return (
        ast.get_source_segment(
            text,
            node,
        )
        or ""
    )


def test_artifact_kinds_are_canonical_contract_values():
    text = read(
        "app/services/"
        "compliance_registry_contract.py"
    )

    assert INTERNAL in text
    assert PORTAL in text

    portal_text = read(
        "app/services/"
        "compliance_registry_portal_artifacts.py"
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE"
        not in portal_text
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD"
        not in portal_text
    )


def test_submission_attempt_model_persists_artifact_kind():
    text = read(
        "app/models/"
        "registry_obligation.py"
    )

    assert (
        "artifact_kind: Mapped[str]"
        in text
    )

    assert (
        "ck_registry_submission_attempt_"
        in text
    )

    assert INTERNAL in text
    assert PORTAL in text


def test_artifact_kind_migration_extends_current_head():
    text = read(
        "alembic/versions/"
        "20260918_registry_attempt_artifact_kind.py"
    )

    assert (
        'revision: str = "20260918_registry_artifact_kind"'
        in text
    )

    assert (
        '"20260917_mintrud_programs"'
        in text
    )

    assert (
        '"artifact_kind"'
        in text
    )

    assert INTERNAL in text
    assert PORTAL in text


def test_create_attempt_defaults_to_internal_export_package():
    source = function_source(
        "app/services/"
        "compliance_registry_attempts.py",
        "create_registry_submission_attempt",
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE"
        in source
    )

    assert (
        "normalize_registry_artifact_kind"
        in source
    )

    assert (
        "artifact_kind=("
        in source
    )


def test_only_portal_artifact_can_finalize_export():
    source = function_source(
        "app/services/"
        "compliance_registry_attempts.py",
        "mark_registry_exported",
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD"
        in source
    )

    assert (
        "Only portal upload artifacts"
        in source
    )


def test_only_portal_artifact_can_be_submitted():
    source = function_source(
        "app/services/"
        "compliance_registry_attempts.py",
        "mark_registry_submission",
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD"
        in source
    )

    assert (
        "Only portal upload artifacts"
        in source
    )


def test_internal_export_does_not_consume_exported_lifecycle():
    source = function_source(
        "app/api/v1/admin.py",
        "prepare_admin_registry_export_attempt",
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE"
        in source
    )

    assert (
        "mark_registry_exported"
        not in source
    )

    assert (
        "artifact_kind"
        in source
    )


def test_admin_attempt_api_exposes_artifact_kind():
    schema = read(
        "app/schemas/admin.py"
    )

    assert (
        "class AdminRegistrySubmissionAttemptItem"
        in schema
    )

    assert (
        "artifact_kind: str"
        in schema
    )

    builder = function_source(
        "app/api/v1/admin.py",
        "build_admin_registry_submission_attempt_item",
    )

    assert (
        "artifact_kind"
        in builder
    )


def test_mintrud_portal_endpoint_uses_official_xml_lifecycle():
    source = function_source(
        "app/api/v1/admin.py",
        "prepare_admin_mintrud_portal_artifact",
    )

    assert (
        "require_registry_portal_artifact_contract"
        in source
    )
    assert (
        "validate_registry_approval_current"
        in source
    )
    assert (
        "obligation.approval_snapshot_json"
        in source
    )
    assert (
        "serialize_mintrud_eisot_xml_v109"
        in source
    )
    assert (
        "validate_mintrud_eisot_xml_v109"
        in source
    )
    assert (
        "REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD"
        in source
    )
    assert (
        "create_registry_submission_attempt"
        in source
    )
    assert (
        "attach_registry_submission_artifact"
        in source
    )
    assert (
        "mark_registry_exported"
        in source
    )
    assert (
        "build_registry_export_package"
        not in source
    )
    assert (
        "HTTP_501_NOT_IMPLEMENTED"
        not in source
    )


def test_portal_contract_service_does_not_implement_xml_processing():
    service = read(
        "app/services/"
        "compliance_registry_portal_artifacts.py"
    )

    assert "ElementTree" not in service
    assert "from lxml" not in service
    assert "xmlschema" not in service
    assert (
        "serialize_mintrud_eisot_xml_v109"
        not in service
    )
    assert (
        "validate_mintrud_eisot_xml_v109"
        not in service
    )


def test_mintrud_portal_endpoint_never_auto_submits():
    source = function_source(
        "app/api/v1/admin.py",
        "prepare_admin_mintrud_portal_artifact",
    )

    assert (
        "mark_registry_submission"
        not in source
    )
    assert (
        '"external_registry_io": False'
        in source
    )
