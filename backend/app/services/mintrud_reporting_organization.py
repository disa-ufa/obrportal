from __future__ import annotations

from dataclasses import dataclass

from app.core.config import settings


@dataclass(frozen=True)
class MintrudReportingOrganization:
    name: str
    inn: str


def _normalize_setting(
    value: object | None,
) -> str:
    return str(
        value
        or ""
    ).strip()


def resolve_mintrud_reporting_organization(
) -> MintrudReportingOrganization:
    return MintrudReportingOrganization(
        name=_normalize_setting(
            settings.document_org_name
        ),
        inn=_normalize_setting(
            settings.document_org_inn
        ),
    )
