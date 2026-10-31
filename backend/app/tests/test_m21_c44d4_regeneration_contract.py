"""C4.4D.4C: generated PDF regeneration transaction contracts."""

import ast
from pathlib import Path

APP = Path(__file__).resolve().parents[1]


def route():
    tree = ast.parse(
        (APP / "api/v1/admin.py").read_text(encoding="utf-8-sig")
    )
    matches = [
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "regenerate_admin_completion_document"
    ]
    assert len(matches) == 1
    return matches[0]


def calls(node, name):
    return sorted(
        item.lineno
        for item in ast.walk(node)
        if isinstance(item, ast.Call)
        and ast.unparse(item.func) == name
    )


def transaction():
    node = route()
    matches = [
        statement for statement in node.body
        if isinstance(statement, ast.Try)
        and calls(statement, "boundary.commit")
    ]
    assert len(matches) == 1
    return matches[0]


def test_01_boundary_initialized_once():
    node = route()
    assert len(calls(node, "CompletionPDFTransactionBoundary")) == 1


def test_02_boundary_precedes_registry_lock_and_writer():
    node = route()
    boundary = calls(node, "CompletionPDFTransactionBoundary")
    lock = calls(node, "lock_registry_approval_for_document")
    writer = calls(node, "write_completion_document_pdf_to_storage")
    assert len(boundary) == len(lock) == len(writer) == 1
    assert boundary[0] < lock[0] < writer[0]


def test_03_writer_precedes_flush_and_commit():
    guarded = transaction()
    writer = calls(guarded, "write_completion_document_pdf_to_storage")
    flush = calls(guarded, "session.flush")
    commit = calls(guarded, "boundary.commit")
    assert len(writer) == len(flush) == len(commit) == 1
    assert writer[0] < flush[0] < commit[0]


def test_04_no_direct_commit_or_rollback():
    node = route()
    assert not calls(node, "session.commit")
    assert not calls(node, "session.rollback")
    assert len(calls(node, "boundary.commit")) == 1


def test_05_failure_and_cancellation_compensated():
    guarded = transaction()
    assert len(guarded.handlers) == 1
    handler = guarded.handlers[0]
    assert ast.unparse(handler.type) == (
        "(Exception, asyncio.CancelledError)"
    )
    assert ast.unparse(handler.body[0]) == (
        "await boundary.compensate(exc)"
    )
    assert isinstance(handler.body[-1], ast.Raise)
    assert handler.body[-1].exc is None


def test_06_document_metadata_and_generation_event_retained():
    guarded = transaction()
    assert len(calls(
        guarded, "mark_completion_document_generation_metadata"
    )) == 1
    assert len(calls(
        guarded, "add_completion_document_generation_event"
    )) == 1
    rendered = ast.unparse(guarded)
    assert "admin_regenerate" in rendered
    assert "admin.document_regenerated" in rendered


def test_07_frdo_approval_lock_and_invalidation_retained():
    guarded = transaction()
    lock = calls(guarded, "lock_registry_approval_for_document")
    invalidation = calls(
        guarded, "invalidate_registry_approval_for_document"
    )
    assert len(lock) == 1
    assert len(invalidation) == 1
    assert lock[0] < invalidation[0]


def test_08_previous_pdf_is_not_deleted_by_route():
    node = route()
    rendered = ast.unparse(node)
    assert "delete_private_storage_file" not in rendered
    assert "unlink(" not in rendered
    assert "document.storage_path =" in rendered


def test_09_postcommit_fetch_is_outside_transaction_guard():
    node = route()
    guarded = transaction()
    reads = [
        statement for statement in node.body
        if (
            isinstance(statement, ast.Assign)
            and calls(statement, "get_admin_document_row_or_404")
        )
    ]
    assert len(reads) == 1
    assert reads[0].lineno > guarded.end_lineno
    assert len(calls(node, "build_admin_document_item")) == 1
