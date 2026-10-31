"""C4.4D.5B: update_admin_enrollment transaction contracts."""

import ast
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / "api/v1/admin.py"


def route():
    tree = ast.parse(SOURCE.read_text(encoding="utf-8-sig"))
    matching = [
        node for node in tree.body
        if isinstance(node, ast.AsyncFunctionDef)
        and node.name == "update_admin_enrollment"
    ]
    assert len(matching) == 1
    return matching[0]


def calls(node, name):
    return sorted(
        item.lineno
        for item in ast.walk(node)
        if isinstance(item, ast.Call)
        and ast.unparse(item.func) == name
    )


def guarded():
    node = route()
    matching = [
        item for item in node.body
        if isinstance(item, ast.Try)
    ]
    assert len(matching) == 1
    return matching[0]


def test_01_single_coordinator_precedes_registry_scope():
    node = route()
    boundary = calls(node, "CompletionPDFTransactionBoundary")
    scope = calls(node, "acquire_discovered_registry_source_write_scope")
    assert len(boundary) == len(scope) == 1
    assert boundary[0] < scope[0]


def test_02_registry_fences_and_refresh_retained():
    node = guarded()
    assert len(calls(node, "RegistrySourceFence")) >= 2
    assert len(calls(node, "session.refresh")) == 1
    assert len(calls(
        node, "acquire_discovered_registry_source_write_scope"
    )) == 1
    assert "session.no_autoflush" in ast.unparse(node)


def test_03_completion_and_audit_precede_coordinated_commit():
    node = guarded()
    completion = calls(node, "ensure_enrollment_completed")
    flush = calls(node, "session.flush")
    audit = calls(node, "create_admin_audit_event")
    commit = calls(node, "boundary.commit")
    assert (
        len(completion) == len(flush) == len(audit)
        == len(commit) == 1
    )
    assert completion[0] < flush[0] < audit[0] < commit[0]


def test_04_no_direct_commit_or_rollback():
    node = route()
    assert not calls(node, "session.commit")
    assert not calls(node, "session.rollback")
    assert len(calls(node, "boundary.commit")) == 1


def test_05_registry_lock_error_compensates_before_mapping():
    handler = guarded().handlers[0]
    assert ast.unparse(handler.type) == "RegistryActionLockError"
    rendered = ast.unparse(handler)
    assert "await boundary.compensate(exc)" in rendered
    assert "HTTP_409_CONFLICT" in rendered
    assert rendered.index("boundary.compensate") < rendered.index(
        "HTTP_409_CONFLICT"
    )


def test_06_ambiguous_commit_cannot_be_mapped_to_http409():
    handler = guarded().handlers[0]
    controls = [
        item for item in handler.body
        if isinstance(item, ast.If)
    ]
    assert len(controls) == 1
    branch = controls[0]
    assert ast.unparse(branch.test) == "boundary.commit_attempted"
    assert len(branch.body) == 1
    assert isinstance(branch.body[0], ast.Raise)
    assert branch.body[0].exc is None


def test_07_failure_and_cancellation_both_compensated():
    handler = guarded().handlers[1]
    assert ast.unparse(handler.type) == (
        "(Exception, asyncio.CancelledError)"
    )
    assert ast.unparse(handler.body[0]) == (
        "await boundary.compensate(exc)"
    )
    assert isinstance(handler.body[-1], ast.Raise)
    assert handler.body[-1].exc is None


def test_08_postcommit_fetch_remains_inside_error_handling():
    node = guarded()
    commit = calls(node, "boundary.commit")
    read = calls(node, "get_admin_enrollment_row_or_404")
    assert len(commit) == len(read) == 1
    assert commit[0] < read[0]
    assert len(calls(node, "build_admin_enrollment_item")) == 1


def test_09_assignment_validation_and_audit_payload_retained():
    node = guarded()
    assert len(calls(
        node, "ensure_learning_group_assignment_is_valid"
    )) == 1
    assert len(calls(node, "enrollment_snapshot")) == 2
    rendered = ast.unparse(node)
    assert "admin.enrollment_updated" in rendered
    assert "changed_fields" in rendered
    assert "organization_id" in rendered
    assert "learning_group_id" in rendered
