from pathlib import Path

from sqlalchemy import CheckConstraint, UniqueConstraint

from app.models.registry_applicability import (
    RegistryApplicabilityEvent,
    RegistryApplicabilityRecord,
)


def _named_constraints(table, cls):
    return {c.name for c in table.constraints if isinstance(c, cls)}


def test_applicability_has_one_current_decision_per_enrollment_and_registry():
    table = RegistryApplicabilityRecord.__table__
    assert table.name == "registry_applicability"
    assert "uq_registry_applicability_enrollment_registry" in _named_constraints(table, UniqueConstraint)
    assert "ck_registry_applicability_decision" in _named_constraints(table, CheckConstraint)
    assert table.c.enrollment_id.foreign_keys
    assert table.c.input_fingerprint.nullable


def test_decision_history_is_versioned_and_has_no_cascading_delete():
    table = RegistryApplicabilityEvent.__table__
    assert table.name == "registry_applicability_events"
    assert "uq_registry_applicability_event_version" in _named_constraints(table, UniqueConstraint)
    assert "ck_registry_applicability_event_decision" in _named_constraints(table, CheckConstraint)
    fk = next(iter(table.c.applicability_id.foreign_keys))
    assert fk.ondelete == "RESTRICT"


def test_migration_only_adds_new_tables_and_rejects_history_mutation():
    source = (
        Path(__file__).resolve().parents[2]
        / "alembic/versions/20261013_registry_applicability.py"
    ).read_text(encoding="utf-8")
    assert 'down_revision = "20261008_registry_batch_frdo"' in source
    assert 'op.create_table(' in source
    assert "BEFORE UPDATE OR DELETE ON registry_applicability_events" in source
    assert "DROP TRIGGER" in source
    upgrade = source.split("def upgrade() -> None:", 1)[1].split("def downgrade() -> None:", 1)[0]
    assert "registry_obligations" not in upgrade
    assert "op.drop_table" not in upgrade
