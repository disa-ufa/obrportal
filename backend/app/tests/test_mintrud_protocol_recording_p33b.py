"""P3.3B static safety contract; live behavior tested on an isolated Postgres."""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_explicit_server_recording_and_no_registry_side_effects():
    src = (ROOT / 'app/api/v1/mintrud_protocol_drafts.py').read_text(encoding='utf-8')
    tree = ast.parse(src)
    record = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'record_protocol_commission_check')
    names = {n.id for n in ast.walk(record) if isinstance(n, ast.Name)}
    assert {'AuditEvent', 'sha256', '_recording_report'} <= names
    assert not {'QuizAttempt', 'RegistrySubmissionAttempt', 'RegistrySubmissionBatch'} & names
    assert 'confirmed_actual_check: Literal[True]' in src
    assert 'protocol.status != "draft"' in src
    assert 'recording_request_id == request_id' in src
    assert 'with_for_update()' in src


def test_recording_migration_is_additive_without_backfill():
    path = ROOT / 'alembic/versions/20261102_mintrud_protocol_fixed.py'
    code = path.read_text(encoding='utf-8')
    tree = ast.parse(code)
    upgrade = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == 'upgrade')
    ops = [n for n in ast.walk(upgrade) if isinstance(n, ast.Attribute)]
    names = {o.attr for o in ops}
    assert 'add_column' in names
    assert 'create_check_constraint' in names
    assert not ({'execute', 'drop_table', 'drop_column', 'delete', 'update', 'insert'} & names)
    assert '20261102_mintrud_protocol_drafts' in code


def test_no_automatic_eisot_write_in_readiness():
    src = (ROOT / 'app/api/v1/mintrud_protocol_drafts.py').read_text(encoding='utf-8')
    tree = ast.parse(src)
    ready = next(n for n in tree.body if isinstance(n, ast.AsyncFunctionDef) and n.name == 'get_protocol_recording_readiness')
    assert 'session.commit' not in ast.unparse(ready)
    assert 'session.add' not in ast.unparse(ready)
