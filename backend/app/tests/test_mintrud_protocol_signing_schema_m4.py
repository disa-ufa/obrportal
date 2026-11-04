"""M4.1/M4.2: signing schema is additive and preserves recorded snapshots."""
from __future__ import annotations

import importlib.util
from pathlib import Path

from sqlalchemy import CheckConstraint, Date, DateTime, Integer, String, UniqueConstraint

from app.models.mintrud_knowledge_protocol import MintrudKnowledgeProtocol


SIGNING_FIELDS = (
    "signed_at", "signed_on", "signed_by_user_id", "signing_request_id",
    "signed_source_sha256", "signed_scan_path", "signed_scan_sha256",
    "signed_scan_size", "signed_scan_media_type", "signed_scan_uploaded_at",
    "signed_scan_uploaded_by_user_id",
)


def test_signing_schema_is_nullable_and_keeps_lifecycle() -> None:
    table = MintrudKnowledgeProtocol.__table__
    assert all(table.c[name].nullable for name in SIGNING_FIELDS)
    checks = {c.name: str(c.sqltext) for c in table.constraints if isinstance(c, CheckConstraint)}
    assert "status IN ('draft', 'recorded')" in checks["ck_mintrud_protocol_state"]
    assert "signed_source_sha256 = recorded_snapshot_sha256" in checks["ck_mintrud_protocol_signing_metadata"]
    assert "signed_at IS NOT NULL" in checks["ck_mintrud_protocol_signed_scan_metadata"]
    assert "signed_scan_media_type" in checks["ck_mintrud_protocol_signed_scan_metadata"]
    unique = {c.name for c in table.constraints if isinstance(c, UniqueConstraint)}
    assert "uq_mintrud_protocol_signing_request" in unique
    assert table.c.signed_at.type.timezone
    assert isinstance(table.c.signed_on.type, Date)
    assert isinstance(table.c.signed_scan_size.type, Integer)
    assert isinstance(table.c.signed_scan_media_type.type, String)
    assert table.c.signed_scan_media_type.type.length == 64


def test_signing_migration_is_additive_only(monkeypatch) -> None:
    path = Path(__file__).resolve().parents[2] / "alembic" / "versions" / "20261103_mintrud_protocol_signed.py"
    spec = importlib.util.spec_from_file_location("_obrportal_signing_migration_m4", path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.down_revision == "20261102_mintrud_protocol_fixed"

    calls = []

    class Ops:
        def add_column(self, table, column):
            calls.append(("add_column", table, column.name, column.nullable))

        def create_foreign_key(self, *args, **kwargs):
            calls.append(("create_foreign_key", args[0]))

        def create_unique_constraint(self, *args, **kwargs):
            calls.append(("create_unique_constraint", args[0]))

        def create_check_constraint(self, *args, **kwargs):
            calls.append(("create_check_constraint", args[0]))

    monkeypatch.setattr(module, "op", Ops())
    module.upgrade()
    added = {c[2] for c in calls if c[0] == "add_column"}
    assert added == set(SIGNING_FIELDS)
    assert all(c[1] == "mintrud_knowledge_protocols" and c[3] for c in calls if c[0] == "add_column")
    assert len(calls) == len(SIGNING_FIELDS) + 2 + 1 + 2
