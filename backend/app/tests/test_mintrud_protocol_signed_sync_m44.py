"""M4.4 signed-gate contract tests. Full PostgreSQL integration is separate."""
import ast
from pathlib import Path

# Extract only the pure eligibility function to keep these tests runnable
# without a live database, framework imports, or a repository checkout.
TREE = ast.parse((Path(__file__).resolve().parents[1]/"services"/"mintrud_protocol_sync.py").read_text(encoding="utf-8"))
FUNCTION = next(node for node in TREE.body if isinstance(node, ast.FunctionDef) and node.name == "_eligible")
ns = {"SOURCE_FIELDS": ("protocol_number", "knowledge_check_date", "knowledge_check_result"),
      "PERMITTED_OBLIGATION_STATUSES": frozenset({"pending_data"})}
exec(compile(ast.Module(body=[FUNCTION], type_ignores=[]), filename="<eligibility>", mode="exec"), ns)
_eligible = ns["_eligible"]

ROOT=Path(__file__).resolve().parents[1]
SYNC=ROOT/"services"/"mintrud_protocol_sync.py"
API=ROOT/"api"/"v1"/"mintrud_protocol_drafts.py"

def test_unsigned_is_never_eligible():
    assert _eligible({}, "pending_data", False) == (False, "protocol_not_signed")

def test_signed_guard_exists_on_public_sync_endpoint_service():
    tree=ast.parse(SYNC.read_text(encoding="utf-8"))
    method=next(x for x in tree.body if isinstance(x,ast.AsyncFunctionDef) and x.name=="apply_mintrud_protocol_sync")
    text=ast.unparse(method)
    assert "require_signed_protocol(protocol)" in text
    assert text.index("require_signed_protocol(protocol)") < text.index("await build_mintrud_sync_plan(")

def test_signing_is_committed_before_auto_sync():
    tree=ast.parse(API.read_text(encoding="utf-8"))
    method=next(x for x in tree.body if isinstance(x,ast.AsyncFunctionDef) and x.name=="confirm_protocol_paper_signature")
    code=ast.unparse(method)
    assert code.index("await session.commit()") < code.index("await auto_sync_mintrud_after_signing(")
    assert "except HTTPException" in code
    assert "RETRY_REQUIRED" in code

def test_auto_sync_uses_existing_guarded_atomic_writer_and_selects_only_eligible():
    text=SYNC.read_text(encoding="utf-8")
    assert 'eligible = plan["sync_eligible_obligation_ids"]' in text
    assert 'await apply_mintrud_protocol_sync(' in text
    assert 'uuid5(' in text
    assert '"blocked_obligations": blocked' in text

def test_plan_token_binds_signature_state():
    text=SYNC.read_text(encoding="utf-8")
    assert '"signed_source_sha256": signed_source' in text
    assert '"signed_on": protocol.signed_on.isoformat() if signed_source else None' in text

def test_sync_scope_remains_three_fields_only():
    tree=ast.parse(SYNC.read_text(encoding="utf-8"))
    assignment=next(x for x in tree.body if isinstance(x,ast.Assign) and any(isinstance(t,ast.Name) and t.id=="SOURCE_FIELDS" for t in x.targets))
    assert ast.literal_eval(assignment.value) == ("protocol_number", "knowledge_check_date", "knowledge_check_result")

def test_no_approval_export_or_submission_in_auto_service():
    tree=ast.parse(SYNC.read_text(encoding="utf-8"))
    func=next(x for x in tree.body if isinstance(x,ast.AsyncFunctionDef) and x.name=="auto_sync_mintrud_after_signing")
    code=ast.unparse(func)
    for forbidden in ("mark_registry_exported", "apply_registry_approval(", "create_mintrud_registry_submission_batch("):
        assert forbidden not in code


def _member(**overrides):
    out = {
        "structural_issues": [], "history_reasons": [], "conflict_fields": [],
        "fields": {name: {"source": "2026-11-02" if name.endswith("date") else "satisfactory"}
                   for name in ns["SOURCE_FIELDS"]},
        "verdict": "missing_target_fields",
    }
    out.update(overrides)
    return out


def test_eligible_signed_pending_data_allows_only_missing_fields():
    assert _eligible(_member(), "pending_data", True) == (True, "can_fill_empty")
    assert _eligible(_member(verdict="matches"), "pending_data", True) == (True, "already_matching")


def test_eligible_blocks_protected_conflicted_and_wrong_status():
    assert _eligible(_member(), "approved", True)[0] is False
    assert _eligible(_member(history_reasons=["approval"]), "pending_data", True) == (False, "protected_history")
    assert _eligible(_member(conflict_fields=["protocol_number"]), "pending_data", True) == (False, "manual_conflict")
    assert _eligible(_member(structural_issues=["bad_link"]), "pending_data", True) == (False, "invalid_links_or_applicability")


def test_auto_sync_checks_existing_receipt_before_new_plan():
    tree=ast.parse(SYNC.read_text(encoding="utf-8"))
    method=next(x for x in tree.body if isinstance(x,ast.AsyncFunctionDef) and x.name=="auto_sync_mintrud_after_signing")
    code=ast.unparse(method)
    assert code.index('previous = await session.scalar(') < code.index('plan = await build_mintrud_sync_plan(')
    assert "REPLAY_NO_WRITES" in code
    assert 'require_signed_protocol(protocol)' in code
