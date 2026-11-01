"""C4.4D.3B contracts: admin bulk PDF transaction boundary."""

import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1]


def parsed():
    return ast.parse(
        (APP / "api/v1/admin.py").read_text(encoding="utf-8-sig")
    )


def function():
    functions = [
        node for node in parsed().body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "create_admin_group_enrollments"
    ]
    assert len(functions) == 1
    return functions[0]


def calls(node, name):
    return sorted(
        item.lineno for item in ast.walk(node)
        if isinstance(item, ast.Call)
        and ast.unparse(item.func) == name
    )


def test_01_coordinator_import_exists_once():
    imports = [
        node for node in parsed().body
        if isinstance(node, ast.ImportFrom)
        and node.module == "app.services.completion_pdf_transaction_boundary"
    ]
    assert len(imports) == 1
    assert any(
        item.name == "CompletionPDFTransactionBoundary"
        for item in imports[0].names
    )


def test_02_boundary_initialized_before_flush():
    node = function()
    boundary = calls(node, "CompletionPDFTransactionBoundary")
    flush = calls(node, "session.flush")

    assert len(boundary) == 1
    assert len(flush) == 1
    assert boundary[0] < flush[0]


def test_03_bulk_completion_before_audit_and_commit():
    node = function()

    completed = calls(node, "ensure_enrollment_completed")
    audit = calls(node, "create_admin_audit_event")
    commit = calls(node, "boundary.commit")

    assert len(completed) == len(audit) == len(commit) == 1
    assert completed[0] < audit[0] < commit[0]

    assert any(
        isinstance(item, ast.For)
        and item.lineno < completed[0] <= item.end_lineno
        for item in ast.walk(node)
    )


def test_04_no_direct_commit_or_rollback():
    node = function()

    assert calls(node, "session.commit") == []
    assert calls(node, "session.rollback") == []
    assert len(calls(node, "boundary.commit")) == 1


def test_05_exception_and_cancellation_compensated():
    node = function()

    handlers = [
        item for item in ast.walk(node)
        if isinstance(item, ast.ExceptHandler)
    ]

    assert len(handlers) == 1
    handler = handlers[0]

    assert isinstance(handler.type, ast.Tuple)
    assert [ast.unparse(x) for x in handler.type.elts] == [
        "Exception", "asyncio.CancelledError"
    ]
    assert len(calls(handler, "boundary.compensate")) == 1
    assert ast.unparse(handler.body[0]) == (
        "await boundary.compensate(exc)"
    )
    assert isinstance(handler.body[-1], ast.Raise)
    assert handler.body[-1].exc is None


def test_06_integrity_conflict_only_before_commit():
    node = function()
    rendered = ast.unparse(node)

    assert (
        "isinstance(exc, IntegrityError) "
        "and (not boundary.commit_attempted)"
    ) in rendered

    assert "status_code=status.HTTP_409_CONFLICT" in rendered
    assert (
        "Some enrollments already exist for this course"
    ) in rendered


def test_07_audit_and_response_contract_retained():
    node = function()
    rendered = ast.unparse(node)

    assert "admin.enrollments_group_created" in rendered
    assert "created_enrollment_ids" in rendered
    assert "skipped_count=len(skipped)" in rendered
    assert "created_count=len(created_items)" in rendered
    assert "AdminEnrollmentBulkCreateResult" in rendered
    assert "require_permission('admin.users.write')" in rendered
