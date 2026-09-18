from pathlib import Path
import ast


ATTEMPTS_PATH = Path(
    "app/services/"
    "compliance_registry_attempts.py"
)

ADMIN_PATH = Path(
    "app/api/v1/admin.py"
)


def _function_source(
    path: Path,
    function_name: str,
) -> str:
    text = path.read_text(
        encoding="utf-8"
    )

    tree = ast.parse(
        text
    )

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
        and item.name
        == function_name
    )

    return (
        ast.get_source_segment(
            text,
            node,
        )
        or ""
    )


def test_shared_freshness_validator_rebuilds_current_snapshot():
    source = _function_source(
        ATTEMPTS_PATH,
        "validate_registry_approval_current",
    )

    assert (
        "OBLIGATION_STATUS_APPROVED"
        in source
    )

    assert (
        "_build_current_registry_approval_snapshot"
        in source
    )

    assert (
        "is_registry_approval_current"
        in source
    )

    assert (
        "Registry approval is stale"
        in source
    )

    assert (
        "OBLIGATION_STATUS_EXPORTED"
        not in source
    )

    assert (
        "obligation.status ="
        not in source
    )


def test_internal_export_checks_freshness_before_package_and_attempt():
    source = _function_source(
        ADMIN_PATH,
        "prepare_admin_registry_export_attempt",
    )

    validate_position = source.index(
        "validate_registry_approval_current"
    )

    package_position = source.index(
        "build_registry_export_package"
    )

    attempt_position = source.index(
        "create_registry_submission_attempt"
    )

    attach_position = source.index(
        "attach_registry_submission_artifact"
    )

    assert (
        validate_position
        < package_position
        < attempt_position
        < attach_position
    )


def test_internal_export_remains_non_transitioning():
    source = _function_source(
        ADMIN_PATH,
        "prepare_admin_registry_export_attempt",
    )

    assert (
        "mark_registry_exported"
        not in source
    )

    assert (
        "OBLIGATION_STATUS_EXPORTED"
        not in source
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_INTERNAL_EXPORT_PACKAGE"
        in source
    )


def test_portal_export_reuses_shared_validator():
    source = _function_source(
        ATTEMPTS_PATH,
        "mark_registry_exported",
    )

    assert (
        "validate_registry_approval_current"
        in source
    )

    assert (
        "_build_current_registry_approval_snapshot"
        not in source
    )

    assert (
        "is_registry_approval_current"
        not in source
    )

    assert (
        "REGISTRY_ARTIFACT_KIND_PORTAL_UPLOAD"
        in source
    )

    assert (
        "OBLIGATION_STATUS_EXPORTED"
        in source
    )

    assert (
        "obligation.status ="
        in source
    )


def test_admin_imports_shared_freshness_validator():
    text = ADMIN_PATH.read_text(
        encoding="utf-8"
    )

    tree = ast.parse(
        text
    )

    imports = {
        alias.name
        for node in tree.body
        if isinstance(
            node,
            ast.ImportFrom,
        )
        and node.module
        == (
            "app.services."
            "compliance_registry_attempts"
        )
        for alias in node.names
    }

    assert (
        "validate_registry_approval_current"
        in imports
    )
