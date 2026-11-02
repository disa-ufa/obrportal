"""P3 draft editor contract: static assertions without database access."""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_p3_update_route_is_draft_only():
    path = ROOT / 'app/api/v1/mintrud_protocol_drafts.py'
    source = path.read_text(encoding='utf-8')
    tree = ast.parse(source)
    f = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'update_protocol_draft')
    names = [n.id for n in ast.walk(f) if isinstance(n, ast.Name)]
    assert 'MintrudRegistryContext' not in names
    assert 'RegistrySubmissionBatch' not in names
    assert 'RegistryApprovalEvent' not in names
    assert 'AuditEvent' in names
    assert 'with_for_update' in source
    assert 'expected_updated_at' in source
    assert 'protocol.status != "draft"' in source
    assert 'protocol.updated_at != payload.expected_updated_at' in source
    assert 'admin.mintrud_protocol_draft_updated' in source


def test_p3_results_nullable_not_from_quiz():
    source = (ROOT / 'app/api/v1/mintrud_protocol_drafts.py').read_text(encoding='utf-8')
    assert 'QuizAttempt' not in source
    assert 'knowledge_check_result: str | None' in source
    assert '"satisfactory", "unsatisfactory"' in source
    assert 'Result and commission date must both be set or both be empty' in source


def test_p3_keeps_draft_editability_but_allows_explicit_recording():
    source = (ROOT / 'app/models/mintrud_knowledge_protocol.py').read_text(encoding='utf-8')
    assert "status IN ('draft', 'recorded')" in source
    assert 'knowledge_check_result IS NULL' in source
