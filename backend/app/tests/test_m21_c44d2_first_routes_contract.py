"""Structural contracts for the first two PDF transaction routes."""

import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1]


def parse(relative):
    return ast.parse((APP / relative).read_text(encoding="utf-8-sig"))


def function(relative, name):
    matches = [
        node for node in parse(relative).body
        if isinstance(node, ast.AsyncFunctionDef) and node.name == name
    ]
    assert len(matches) == 1
    return matches[0]


def call_lines(node, expression):
    return sorted(
        item.lineno
        for item in ast.walk(node)
        if isinstance(item, ast.Call)
        and ast.unparse(item.func) == expression
    )


ROUTES = (
    ("api/v1/admin.py", "create_admin_enrollment"),
    ("api/v1/org.py", "create_org_group_enrollments"),
)


def test_01_coordinator_imported_in_both_routes():
    for relative, _ in ROUTES:
        imports = [
            item for item in parse(relative).body
            if isinstance(item, ast.ImportFrom)
            and item.module == "app.services.completion_pdf_transaction_boundary"
        ]
        assert len(imports) == 1
        assert any(
            alias.name == "CompletionPDFTransactionBoundary"
            for alias in imports[0].names
        )


def test_02_admin_pdf_and_audit_before_commit():
    node = function(*ROUTES[0])
    boundary = call_lines(node, "CompletionPDFTransactionBoundary")
    completion = call_lines(node, "ensure_enrollment_completed")
    audit = call_lines(node, "create_admin_audit_event")
    commit = call_lines(node, "boundary.commit")
    assert len(boundary) == len(completion) == len(audit) == len(commit) == 1
    assert boundary[0] < completion[0] < audit[0] < commit[0]


def test_03_org_bulk_completion_before_commit():
    node = function(*ROUTES[1])
    boundary = call_lines(node, "CompletionPDFTransactionBoundary")
    completion = call_lines(node, "ensure_enrollment_completed")
    commit = call_lines(node, "boundary.commit")
    assert len(boundary) == len(completion) == len(commit) == 1
    assert boundary[0] < completion[0] < commit[0]
    completion_call = [
        item for item in ast.walk(node)
        if isinstance(item, ast.Call)
        and ast.unparse(item.func) == "ensure_enrollment_completed"
    ][0]
    assert any(
        isinstance(loop, ast.For)
        and loop.lineno < completion_call.lineno <= loop.end_lineno
        for loop in ast.walk(node)
    )


def test_04_no_direct_commit_or_rollback_in_routes():
    for relative, name in ROUTES:
        node = function(relative, name)
        assert not call_lines(node, "session.commit")
        assert not call_lines(node, "session.rollback")
        assert len(call_lines(node, "boundary.commit")) == 1


def test_05_all_exceptions_and_cancellation_compensated():
    for relative, name in ROUTES:
        node = function(relative, name)
        handlers = [
            item for item in ast.walk(node)
            if isinstance(item, ast.ExceptHandler)
        ]
        assert len(handlers) == 1
        handler = handlers[0]
        assert isinstance(handler.type, ast.Tuple)
        assert [ast.unparse(t) for t in handler.type.elts] == [
            "Exception", "asyncio.CancelledError"
        ]
        assert len(call_lines(handler, "boundary.compensate")) == 1
        assert isinstance(handler.body[0], ast.Expr)
        assert ast.unparse(handler.body[0].value) == (
            "await boundary.compensate(exc)"
        )
        assert isinstance(handler.body[-1], ast.Raise)
        assert handler.body[-1].exc is None


def test_06_integrity_error_mapping_retained():
    expected_details = (
        "Enrollment already exists for this user and course",
        "Enrollment already exists",
    )
    for (relative, name), expected in zip(ROUTES, expected_details):
        node = function(relative, name)
        rendered = ast.unparse(node)
        assert "isinstance(exc, IntegrityError) and (not boundary.commit_attempted)" in rendered
        assert "status_code=status.HTTP_409_CONFLICT" in rendered
        assert "detail=" + repr(expected) in rendered
