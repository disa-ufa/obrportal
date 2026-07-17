from app.db.base import ImportBatch as ImportedImportBatch
from app.db.base import ImportRow as ImportedImportRow
from app.models.base import Base
from app.models.import_batch import ImportBatch, ImportRow


def test_import_models_are_registered_for_alembic_metadata() -> None:
    assert ImportedImportBatch is ImportBatch
    assert ImportedImportRow is ImportRow
    assert "import_batches" in Base.metadata.tables
    assert "import_rows" in Base.metadata.tables


def test_import_batch_model_columns_contract() -> None:
    columns = ImportBatch.__table__.columns

    expected_columns = {
        "id",
        "import_type",
        "source_filename",
        "source_content_type",
        "source_digest",
        "deduplication_key",
        "status",
        "organization_id",
        "learning_group_id",
        "course_id",
        "total_rows",
        "valid_rows",
        "invalid_rows",
        "created_users_count",
        "updated_users_count",
        "created_profiles_count",
        "updated_profiles_count",
        "created_enrollments_count",
        "uploaded_by_user_id",
        "notes",
        "created_at",
        "updated_at",
    }

    assert expected_columns.issubset(set(columns.keys()))
    assert columns["import_type"].nullable is False
    assert columns["status"].nullable is False
    assert columns["total_rows"].nullable is False
    assert columns["source_digest"].nullable is True
    assert columns["deduplication_key"].nullable is True

    indexes = {
        index.name: index
        for index in ImportBatch.__table__.indexes
    }

    assert (
        indexes[
            "ix_import_batches_source_digest"
        ].unique
        is False
    )
    assert (
        indexes[
            "ix_import_batches_deduplication_key"
        ].unique
        is True
    )


def test_import_row_model_columns_contract() -> None:
    columns = ImportRow.__table__.columns

    expected_columns = {
        "id",
        "batch_id",
        "row_number",
        "status",
        "raw_data_json",
        "normalized_data_json",
        "validation_errors_json",
        "user_id",
        "learner_profile_id",
        "enrollment_id",
        "error_summary",
        "created_at",
        "updated_at",
    }

    assert expected_columns.issubset(set(columns.keys()))
    assert columns["batch_id"].nullable is False
    assert columns["row_number"].nullable is False
    assert columns["status"].nullable is False
    assert columns["raw_data_json"].nullable is False
    assert columns["normalized_data_json"].nullable is False
    assert columns["validation_errors_json"].nullable is False
