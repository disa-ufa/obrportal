from __future__ import annotations

import ast
from pathlib import Path


BACKEND_ROOT = Path(__file__).resolve().parents[2]


def _load_tree(relative_path: str):
    path = BACKEND_ROOT / relative_path

    text = path.read_text(
        encoding="utf-8-sig"
    )

    return (
        text,
        ast.parse(
            text,
            filename=str(path),
        ),
    )


def _find_function(
    tree: ast.AST,
    name: str,
):
    matches = [
        node
        for node in ast.walk(tree)
        if isinstance(
            node,
            (
                ast.FunctionDef,
                ast.AsyncFunctionDef,
            ),
        )
        and node.name == name
    ]

    assert len(matches) == 1

    return matches[0]


def _call_name(node: ast.AST):
    if isinstance(
        node,
        ast.Name,
    ):
        return node.id

    if isinstance(
        node,
        ast.Attribute,
    ):
        return node.attr

    return None


def _keyword_names(
    call: ast.Call,
) -> set[str]:
    return {
        keyword.arg
        for keyword in call.keywords
        if keyword.arg is not None
    }


def _registry_keyword_name(
    call: ast.Call,
):
    for keyword in call.keywords:
        if keyword.arg != "registry":
            continue

        if isinstance(
            keyword.value,
            ast.Name,
        ):
            return keyword.value.id

        if isinstance(
            keyword.value,
            ast.Constant,
        ):
            return keyword.value.value

    return None


def _calls(
    function_node: ast.AST,
    name: str,
):
    return [
        node
        for node in ast.walk(
            function_node
        )
        if isinstance(
            node,
            ast.Call,
        )
        and _call_name(
            node.func
        )
        == name
    ]


def _frdo_calls(
    function_node: ast.AST,
    name: str,
):
    return [
        call
        for call in _calls(
            function_node,
            name,
        )
        if _registry_keyword_name(
            call
        )
        in {
            "REGISTRY_FRDO",
            "frdo",
        }
    ]


def _assert_frdo_context_query(
    function_node: ast.AST,
) -> None:
    names = {
        node.id
        for node in ast.walk(
            function_node
        )
        if isinstance(
            node,
            ast.Name,
        )
    }

    attributes = {
        node.attr
        for node in ast.walk(
            function_node
        )
        if isinstance(
            node,
            ast.Attribute,
        )
    }

    assert (
        "FrdoRegistryContext"
        in names
    )

    assert (
        "obligation_id"
        in attributes
    )


def test_admin_frdo_validate_loads_and_passes_context() -> None:
    text, tree = _load_tree(
        "app/api/v1/admin.py"
    )

    assert (
        "from app.models.frdo_registry_context "
        "import"
        in text
    )

    function = _find_function(
        tree,
        "validate_admin_frdo_obligation",
    )

    _assert_frdo_context_query(
        function
    )

    calls = _frdo_calls(
        function,
        "evaluate_registry_readiness",
    )

    assert len(calls) == 1

    assert (
        "frdo_context"
        in _keyword_names(
            calls[0]
        )
    )


def test_admin_frdo_approve_passes_context_to_readiness_and_snapshot() -> None:
    _, tree = _load_tree(
        "app/api/v1/admin.py"
    )

    function = _find_function(
        tree,
        "approve_admin_frdo_obligation",
    )

    _assert_frdo_context_query(
        function
    )

    readiness_calls = _frdo_calls(
        function,
        "evaluate_registry_readiness",
    )

    snapshot_calls = _frdo_calls(
        function,
        "build_registry_approval_snapshot",
    )

    assert len(readiness_calls) == 1
    assert len(snapshot_calls) == 1

    assert (
        "frdo_context"
        in _keyword_names(
            readiness_calls[0]
        )
    )

    assert (
        "frdo_context"
        in _keyword_names(
            snapshot_calls[0]
        )
    )


def test_readiness_propagation_loads_and_passes_frdo_context() -> None:
    text, tree = _load_tree(
        "app/services/"
        "compliance_registry_readiness_propagation.py"
    )

    assert (
        "from app.models.frdo_registry_context "
        "import FrdoRegistryContext"
        in text
    )

    function = _find_function(
        tree,
        "refresh_registry_readiness_for_user",
    )

    _assert_frdo_context_query(
        function
    )

    calls = _frdo_calls(
        function,
        "evaluate_registry_readiness",
    )

    assert len(calls) == 1

    assert (
        "frdo_context"
        in _keyword_names(
            calls[0]
        )
    )


def test_current_approval_snapshot_loads_and_passes_frdo_context() -> None:
    text, tree = _load_tree(
        "app/services/"
        "compliance_registry_attempts.py"
    )

    assert (
        "from app.models.frdo_registry_context "
        "import FrdoRegistryContext"
        in text
    )

    function = _find_function(
        tree,
        "_build_current_registry_approval_snapshot",
    )

    _assert_frdo_context_query(
        function
    )

    calls = _frdo_calls(
        function,
        "build_registry_approval_snapshot",
    )

    assert len(calls) == 1

    assert (
        "frdo_context"
        in _keyword_names(
            calls[0]
        )
    )


def test_missing_frdo_context_is_not_raised_by_wiring_layer() -> None:
    paths = [
        "app/api/v1/admin.py",
        (
            "app/services/"
            "compliance_registry_readiness_propagation.py"
        ),
        (
            "app/services/"
            "compliance_registry_attempts.py"
        ),
    ]

    for relative_path in paths:
        text = (
            BACKEND_ROOT
            / relative_path
        ).read_text(
            encoding="utf-8-sig"
        )

        assert (
            "FRDO approval context is missing"
            not in text
        )

        assert (
            "FRDO registry context is missing"
            not in text
        )
