"""P2 draft-creation contract still applies after P3.3B state extension."""
import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_protocol_models_support_drafts_and_explicit_recorded_state():
    code = (ROOT / "app/models/mintrud_knowledge_protocol.py").read_text()
    assert "status IN ('draft', 'recorded')" in code
    assert "knowledge_check_date: Mapped[date | None]" in code
    assert "knowledge_check_result: Mapped[str | None]" in code
    ast.parse(code)


def test_draft_api_does_not_touch_mintrud_context_or_exports():
    code = (ROOT / "app/api/v1/mintrud_protocol_drafts.py").read_text()
    tree = ast.parse(code)
    creation = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "create_protocol_draft")
    assert "MintrudRegistryContext" not in [node.id for node in ast.walk(creation) if isinstance(node, ast.Name)]
    assert "prepare_mintrud" not in code
    functions = [node.name for node in tree.body if isinstance(node, ast.AsyncFunctionDef)]
    assert "create_protocol_draft" in functions
    assert "list_protocol_drafts" in functions


def test_migration_never_changes_existing_tables():
    code = (ROOT / "alembic/versions/20261102_mintrud_knowledge_protocol_drafts.py").read_text()
    tree = ast.parse(code)
    upgrade = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "upgrade")
    calls = [node for node in ast.walk(upgrade) if isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute)]
    assert sum(node.func.attr == "create_table" for node in calls) == 2
    assert all(node.func.attr not in {"drop_table", "drop_column", "alter_column", "execute"} for node in calls)
