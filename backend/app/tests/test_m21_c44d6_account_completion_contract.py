"""C4.4D.6C: account completion PDF transaction contracts."""

import ast
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "api/v1/account.py"

ROUTES = (
    "complete_account_course_lesson",
    "complete_account_course_learning",
)


def tree():
    return ast.parse(
        SOURCE.read_text(encoding="utf-8-sig")
    )


def function(name):
    found = [
        node for node in tree().body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == name
    ]
    assert len(found) == 1
    return found[0]


def calls(node, name):
    return [
        item.lineno
        for item in ast.walk(node)
        if isinstance(item, ast.Call)
        and ast.unparse(item.func) == name
    ]


def context(route):
    matching = [
        node for node in route.body
        if isinstance(node, ast.AsyncWith)
    ]
    assert len(matching) == 1
    return matching[0]


def handlers():
    node = function(
        "_account_registry_source_write_transaction"
    )
    matching = [
        item for item in ast.walk(node)
        if isinstance(item, ast.ExceptHandler)
    ]
    assert len(matching) == 2
    return matching


def test_01_boundary_import_is_present():
    imports = [
        node for node in tree().body
        if isinstance(node, ast.ImportFrom)
        and node.module
        == "app.services.completion_pdf_transaction_boundary"
    ]
    assert len(imports) == 1
    assert any(
        alias.name == "CompletionPDFTransactionBoundary"
        for alias in imports[0].names
    )


def test_02_context_keeps_optional_legacy_signature():
    node = function(
        "_account_registry_source_write_transaction"
    )
    names = [arg.arg for arg in node.args.kwonlyargs]
    assert names == [
        "enrollment_id", "current_user", "session", "boundary"
    ]
    assert len(node.args.kw_defaults) == 4
    assert isinstance(node.args.kw_defaults[-1], ast.Constant)
    assert node.args.kw_defaults[-1].value is None


def test_03_legacy_paths_still_rollback():
    node = function(
        "_account_registry_source_write_transaction"
    )
    assert len(calls(node, "session.rollback")) == 2
    assert len(calls(node, "boundary.compensate")) == 2
    for handler in handlers():
        assert "if boundary is None:" in ast.unparse(handler)


def test_04_registry_conflict_guard_prevents_false_http409():
    handler = handlers()[0]
    assert ast.unparse(handler.type) == "RegistryActionLockError"
    value = ast.unparse(handler)
    assert "await boundary.compensate(exc)" in value
    assert "if boundary.commit_attempted:" in value
    assert "HTTP_409_CONFLICT" in value
    assert value.index(
        "boundary.commit_attempted"
    ) < value.index("HTTP_409_CONFLICT")


def test_05_general_handler_covers_cancellation():
    handler = handlers()[1]
    assert ast.unparse(handler.type) == (
        "(Exception, asyncio.CancelledError)"
    )
    assert handler.name == "exc"
    assert "await boundary.compensate(exc)" in ast.unparse(handler)
    assert isinstance(handler.body[-1], ast.Raise)
    assert handler.body[-1].exc is None


def test_06_source_fences_and_owner_refresh_are_retained():
    node = function(
        "_account_registry_source_write_transaction"
    )
    assert len(calls(
        node, "acquire_discovered_registry_source_write_scope"
    )) == 1
    assert len(calls(node, "session.refresh")) == 1
    source = ast.unparse(node)
    assert "with_for_update=True" in source
    assert "yield enrollment" in source


def test_07_lesson_boundary_precedes_context():
    node = function(ROUTES[0])
    assert len(calls(
        node, "CompletionPDFTransactionBoundary"
    )) == 1
    assert (
        calls(node, "CompletionPDFTransactionBoundary")[0]
        < calls(
            node, "_account_registry_source_write_transaction"
        )[0]
    )


def test_08_learning_boundary_precedes_context():
    node = function(ROUTES[1])
    assert len(calls(
        node, "CompletionPDFTransactionBoundary"
    )) == 1
    assert (
        calls(node, "CompletionPDFTransactionBoundary")[0]
        < calls(
            node, "_account_registry_source_write_transaction"
        )[0]
    )


def test_09_lesson_uses_coordinated_commit():
    node = function(ROUTES[0])
    assert len(calls(node, "boundary.commit")) == 1
    assert not calls(node, "session.commit")
    invocation = context(node).items[0].context_expr
    assert any(
        item.arg == "boundary"
        and isinstance(item.value, ast.Name)
        and item.value.id == "boundary"
        for item in invocation.keywords
    )


def test_10_learning_uses_coordinated_commit():
    node = function(ROUTES[1])
    assert len(calls(node, "boundary.commit")) == 1
    assert not calls(node, "session.commit")
    invocation = context(node).items[0].context_expr
    assert any(
        item.arg == "boundary"
        and isinstance(item.value, ast.Name)
        and item.value.id == "boundary"
        for item in invocation.keywords
    )


def test_11_response_reads_are_outside_transaction_context():
    for name in ROUTES:
        node = function(name)
        body = context(node)
        reads = calls(node, "get_account_course_row_or_404")
        commits = calls(node, "boundary.commit")
        assert len(reads) == len(commits) == 1
        assert commits[0] <= body.end_lineno
        assert reads[0] > body.end_lineno


def test_12_completion_precedes_commit_in_both_routes():
    for name in ROUTES:
        node = function(name)
        complete = calls(node, "ensure_enrollment_completed")
        commit = calls(node, "boundary.commit")
        assert len(complete) == len(commit) == 1
        assert complete[0] < commit[0]
