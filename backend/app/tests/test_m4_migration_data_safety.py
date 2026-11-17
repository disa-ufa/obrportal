"""Fail-closed regression for the irreversible M4 education/registry migrations.

These are source-level safety checks. They do not connect to a database,
perform a downgrade, or replace the required backup-backed restore drill.
"""
import ast
import importlib.util
from pathlib import Path

import pytest


VERSIONS = Path(__file__).resolve().parents[2] / "alembic" / "versions"
PROTECTED_MIGRATIONS = (
    "20261102_mintrud_knowledge_protocol_drafts.py",
    "20261102_mintrud_protocol_fixed.py",
    "20261103_mintrud_protocol_signed.py",
    "20261117_enrollment_employment.py",
)


@pytest.mark.parametrize("filename", PROTECTED_MIGRATIONS)
def test_protected_migrations_refuse_destructive_downgrade(filename: str) -> None:
    path = VERSIONS / filename
    spec = importlib.util.spec_from_file_location(f"m4_safe_{path.stem}", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    with pytest.raises(RuntimeError, match="approved recovery plan"):
        module.downgrade()


def test_enrollment_employment_upgrade_has_no_drop_or_data_rewrite() -> None:
    source = (VERSIONS / "20261117_enrollment_employment.py").read_text(encoding="utf-8")
    tree = ast.parse(source)
    upgrade = next(node for node in tree.body if isinstance(node, ast.FunctionDef) and node.name == "upgrade")
    operations = [
        call.func.attr
        for call in ast.walk(upgrade)
        if isinstance(call, ast.Call) and isinstance(call.func, ast.Attribute)
        and isinstance(call.func.value, ast.Name) and call.func.value.id == "op"
    ]
    assert "add_column" in operations and "create_table" in operations
    assert not {"drop_table", "drop_column", "alter_column", "execute"}.intersection(operations)
