"""Release gate; opening requires explicit environment authorization."""

import asyncio
from contextlib import contextmanager
from hmac import compare_digest
from uuid import UUID

from asyncpg import InterfaceError as AsyncpgInterfaceError, PostgresError
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings


_LOCAL_MINTRUD_DB_HOST = "obr-m4p9-20261111-pg"
_LOCAL_MINTRUD_DB_NAME = "obrportal_m4p9_workspace_20261111"
_READ_LOCAL_IDENTITY = text(
    "SELECT pg_catalog.current_database(), marker::pg_catalog.text, current_user, "
    "NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls "
    "OR has_table_privilege(current_user, 'obrportal_local_guard.mintrud_identity', 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER')) "
    "FROM obrportal_local_guard.mintrud_identity CROSS JOIN pg_catalog.pg_roles "
    "WHERE singleton IS TRUE AND rolname=current_user"
)


def require_registry_batch_exports_enabled() -> None:
    if not settings.production_exports_enabled:
        raise HTTPException(status_code=409, detail={
            "code": "registry.batch_export.disabled",
            "message": "Пакетная выгрузка отключена в этой среде.",
        })


def _local_mintrud_requested() -> bool:
    return (
        not settings.production_exports_enabled
        and settings.environment == "local"
        and settings.local_mintrud_xml_export_enabled
    )


@contextmanager
def mintrud_local_database_errors_as_conflict():
    """Map database failures to a closed gate for the local exception."""
    try:
        yield
    except (SQLAlchemyError, PostgresError, AsyncpgInterfaceError, OSError):
        if _local_mintrud_requested():
            require_registry_batch_exports_enabled()
        raise


async def require_mintrud_batch_exports_enabled(session: AsyncSession) -> None:
    """Allow the local exception only for the database bound to this request."""
    if settings.production_exports_enabled:
        return
    if not _local_mintrud_requested() or settings.local_mintrud_db_marker is None:
        require_registry_batch_exports_enabled()

    expected = settings.local_mintrud_db_marker.get_secret_value()
    try:
        marker = UUID(expected)
    except ValueError:
        require_registry_batch_exports_enabled()
    if marker.version != 4 or str(marker) != expected:
        require_registry_batch_exports_enabled()

    with mintrud_local_database_errors_as_conflict():
        bind = session.get_bind()
        if not isinstance(bind, Engine):
            require_registry_batch_exports_enabled()
        url = bind.url
        if (
            url.drivername != "postgresql+asyncpg"
            or url.username != "obrportal_m4p9_login"
            or url.host != _LOCAL_MINTRUD_DB_HOST
            or url.port != 5432
            or url.database != _LOCAL_MINTRUD_DB_NAME
            or url.query
        ):
            require_registry_batch_exports_enabled()

        async with asyncio.timeout(3):
            with session.no_autoflush:
                result = await session.execute(_READ_LOCAL_IDENTITY)
        identity = result.one_or_none()

    if (
        identity is None
        or len(identity) != 4
        or identity[2] != "obrportal_m4p9_login"
        or identity[3] is not True
        or identity[0] != _LOCAL_MINTRUD_DB_NAME
        or not isinstance(identity[1], str)
        or not compare_digest(identity[1].encode("utf-8"), expected.encode("ascii"))
    ):
        require_registry_batch_exports_enabled()
