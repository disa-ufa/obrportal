from app.models.role import UserRole


def test_user_role_global_unique_index_metadata() -> None:
    index = next(
        item
        for item in UserRole.__table__.indexes
        if item.name == "uq_user_role_global"
    )

    assert index.unique is True
    assert [
        column.name
        for column in index.columns
    ] == [
        "user_id",
        "role_id",
    ]

    postgresql_where = (
        index.dialect_options[
            "postgresql"
        ]["where"]
    )
    sqlite_where = (
        index.dialect_options[
            "sqlite"
        ]["where"]
    )

    assert str(postgresql_where) == (
        "organization_id IS NULL"
    )
    assert str(sqlite_where) == (
        "organization_id IS NULL"
    )
