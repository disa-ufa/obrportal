from app.db.base import LearnerProfile as ImportedLearnerProfile
from app.models.base import Base
from app.models.learner_profile import LearnerProfile


def test_learner_profile_model_is_registered_for_alembic_metadata() -> None:
    assert ImportedLearnerProfile is LearnerProfile
    assert "learner_profiles" in Base.metadata.tables


def test_learner_profile_model_columns_contract() -> None:
    columns = LearnerProfile.__table__.columns

    expected_columns = {
        "id",
        "user_id",
        "last_name",
        "first_name",
        "middle_name",
        "birth_date",
        "snils",
        "phone",
        "email",
        "identity_document_type",
        "identity_document_series",
        "identity_document_number",
        "identity_document_issued_by",
        "identity_document_issued_at",
        "identity_document_department_code",
        "identity_document_status",
        "education_document_status",
        "personal_data_basis",
        "personal_data_consent_at",
        "source",
        "notes",
        "created_at",
        "updated_at",
    }

    assert expected_columns.issubset(set(columns.keys()))
    assert columns["user_id"].nullable is False
    assert columns["user_id"].unique is True
    assert columns["snils"].unique is True
    assert columns["identity_document_status"].nullable is False
    assert columns["education_document_status"].nullable is False
    assert columns["source"].nullable is False
