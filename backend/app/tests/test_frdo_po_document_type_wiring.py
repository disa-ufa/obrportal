from __future__ import annotations

from datetime import date, datetime, timezone
from pathlib import Path
from types import SimpleNamespace

from app.models.frdo_registry_context import (
    FrdoRegistryContext,
)
from app.schemas.admin import (
    AdminFrdoRegistryContext,
    AdminFrdoRegistryContextUpdate,
)
from app.services.compliance_registry_approval import (
    FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION,
    build_registry_approval_snapshot,
)
from app.services.compliance_registry_contract import (
    PROGRAM_TYPE_VOCATIONAL_TRAINING,
    REGISTRY_FRDO,
)


def test_model_has_po_document_type() -> None:
    column = FrdoRegistryContext.__table__.c.po_document_type

    assert column.nullable is True
    assert column.type.length == 128


def test_admin_schemas_have_po_document_type() -> None:
    assert "po_document_type" in (
        AdminFrdoRegistryContext.model_fields
    )
    assert "po_document_type" in (
        AdminFrdoRegistryContextUpdate.model_fields
    )


def test_approval_snapshot_freezes_po_document_type() -> None:
    now = datetime(
        2026,
        10,
        7,
        tzinfo=timezone.utc,
    )

    snapshot = build_registry_approval_snapshot(
        registry=REGISTRY_FRDO,
        enrollment=SimpleNamespace(
            status="completed",
            started_at=now,
            completed_at=now,
        ),
        course=SimpleNamespace(
            title="PO test",
            hours=72,
            regulatory_program_type=(
                PROGRAM_TYPE_VOCATIONAL_TRAINING
            ),
        ),
        learner_profile=SimpleNamespace(
            last_name="Ivanov",
            first_name="Ivan",
            middle_name="Ivanovich",
            birth_date=date(1990, 1, 2),
            sex="male",
            snils="112-233-445 95",
            citizenship_country_code="643",
        ),
        document=SimpleNamespace(
            enrollment_id="enrollment-1",
            document_series="AA",
            document_number="1",
            document_type="certificate",
            issued_at=date(2026, 10, 7),
            registration_number="1",
            revoked_at=None,
        ),
        frdo_context=SimpleNamespace(
            document_status="Original",
            loss_confirmation="No",
            exchange_confirmation="No",
            destruction_confirmation="No",
            study_form="Full-time",
            funding_source="Paid",
            education_delivery_form="In organization",
            po_document_type="FRDO PO DOC TYPE",
            po_program_type="Initial training",
            po_profession="Worker",
            po_qualification=None,
            original_document_snapshot_json=None,
        ),
    )

    assert snapshot["schema_version"] == (
        FRDO_PO_APPROVAL_SNAPSHOT_SCHEMA_VERSION
    )
    assert snapshot["frdo_context"]["po_document_type"] == (
        "FRDO PO DOC TYPE"
    )


def test_migration_contract() -> None:
    migration = Path(
        "alembic/versions/"
        "20261007_frdo_po_document_type.py"
    ).read_text(encoding="utf-8")

    assert (
        'revision: str = "20261007_frdo_po_document_type"'
        in migration
    )
    assert (
        'down_revision: str | None = "20261002_frdo_context"'
        in migration
    )
    assert '"po_document_type"' in migration
    assert '"frdo_registry_contexts"' in migration
