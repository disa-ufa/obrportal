from __future__ import annotations

import ast
from pathlib import Path


BACKEND = (
    Path(__file__)
    .resolve()
    .parents[2]
)


READINESS_PATHS = (
    "app/api/v1/admin.py",
    (
        "app/services/"
        "compliance_registry_readiness_propagation.py"
    ),
)


SNAPSHOT_PATHS = (
    "app/api/v1/admin.py",
    (
        "app/services/"
        "compliance_registry_attempts.py"
    ),
)


def parse(relative):
    text = (
        BACKEND
        / relative
    ).read_text(
        encoding="utf-8"
    )

    return text, ast.parse(text)


def call_name(call):
    if isinstance(
        call.func,
        ast.Name,
    ):
        return call.func.id

    if isinstance(
        call.func,
        ast.Attribute,
    ):
        return call.func.attr

    return None


def registry_name(call):
    for keyword in call.keywords:
        if (
            keyword.arg == "registry"
            and isinstance(
                keyword.value,
                ast.Name,
            )
        ):
            return keyword.value.id

    return None


def keyword_value(
    call,
    name,
):
    for keyword in call.keywords:
        if keyword.arg == name:
            return keyword.value

    return None


def calls(relative, target):
    _, tree = parse(relative)

    return [
        node
        for node in ast.walk(tree)
        if isinstance(
            node,
            ast.Call,
        )
        and call_name(node) == target
    ]


def owner(relative, call):
    _, tree = parse(relative)

    found = []

    for node in ast.walk(tree):
        if not isinstance(
            node,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef,
            ),
        ):
            continue

        end = getattr(
            node,
            "end_lineno",
            node.lineno,
        )

        if node.lineno <= call.lineno <= end:
            found.append(node)

    assert found

    return max(
        found,
        key=lambda item: item.lineno,
    )


def uses_resolver(
    relative,
    call,
    value,
):
    if not isinstance(
        value,
        ast.Name,
    ):
        return (
            "resolve_mintrud_reporting_organization"
            in ast.unparse(value)
        )

    text, _ = parse(relative)

    function = owner(
        relative,
        call,
    )

    source = (
        ast.get_source_segment(
            text,
            function,
        )
        or ""
    )

    return (
        value.id in source
        and (
            "resolve_mintrud_reporting_organization"
            in source
        )
    )


def test_all_four_mintrud_readiness_calls_use_reporting_org():
    found = []

    for relative in READINESS_PATHS:
        for call in calls(
            relative,
            "evaluate_registry_readiness",
        ):
            if (
                registry_name(call)
                == "REGISTRY_MINTRUD"
            ):
                found.append(
                    (
                        relative,
                        call,
                    )
                )

    assert len(found) == 4

    for relative, call in found:
        value = keyword_value(
            call,
            "mintrud_reporting_organization",
        )

        assert value is not None

        assert uses_resolver(
            relative,
            call,
            value,
        )


def test_both_mintrud_approval_snapshots_use_reporting_org():
    found = []

    for relative in SNAPSHOT_PATHS:
        for call in calls(
            relative,
            "build_registry_approval_snapshot",
        ):
            if (
                registry_name(call)
                == "REGISTRY_MINTRUD"
            ):
                found.append(
                    (
                        relative,
                        call,
                    )
                )

    assert len(found) == 2

    for relative, call in found:
        value = keyword_value(
            call,
            "mintrud_reporting_organization",
        )

        assert value is not None

        assert uses_resolver(
            relative,
            call,
            value,
        )


def test_frdo_calls_do_not_receive_mintrud_reporting_org():
    found = []

    for relative in (
        READINESS_PATHS
        + SNAPSHOT_PATHS
    ):
        for target in (
            "evaluate_registry_readiness",
            "build_registry_approval_snapshot",
        ):
            for call in calls(
                relative,
                target,
            ):
                if (
                    registry_name(call)
                    == "REGISTRY_FRDO"
                ):
                    found.append(call)

    assert found

    for call in found:
        assert (
            keyword_value(
                call,
                "mintrud_reporting_organization",
            )
            is None
        )


def test_reporting_org_service_uses_only_central_settings():
    text = (
        BACKEND
        / (
            "app/services/"
            "mintrud_reporting_organization.py"
        )
    ).read_text(
        encoding="utf-8"
    )

    assert (
        "settings.document_org_name"
        in text
    )

    assert (
        "settings.document_org_inn"
        in text
    )

    assert "Enrollment" not in text
    assert "organization_id" not in text


def test_readiness_fails_closed_for_reporting_org_fields():
    text = (
        BACKEND
        / (
            "app/services/"
            "compliance_registry_readiness.py"
        )
    ).read_text(
        encoding="utf-8"
    )

    tree = ast.parse(text)

    function = next(
        node
        for node in tree.body
        if isinstance(
            node,
            ast.FunctionDef,
        )
        and node.name
        == "_evaluate_mintrud_readiness"
    )

    string_constants = {
        node.value
        for node in ast.walk(function)
        if isinstance(
            node,
            ast.Constant,
        )
        and isinstance(
            node.value,
            str,
        )
    }

    assert (
        "mintrud.reporting_organization_name_missing"
        in string_constants
    )

    assert (
        "mintrud.reporting_organization_inn_missing"
        in string_constants
    )



def test_approval_snapshot_contains_reporting_org():
    text = (
        BACKEND
        / (
            "app/services/"
            "compliance_registry_approval.py"
        )
    ).read_text(
        encoding="utf-8"
    )

    assert (
        '"mintrud_reporting_organization"'
        in text
    )
