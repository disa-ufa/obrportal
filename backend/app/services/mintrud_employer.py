from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass

from app.models.mintrud_registry_context import (
    MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING,
    MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER,
)
from app.services.compliance_registry_contract import (
    REGISTRY_MINTRUD,
)


MINTRUD_EMPLOYER_SOURCE_CONTEXT = (
    "mintrud_context"
)

MINTRUD_EMPLOYER_SOURCE_REPORTING_ORGANIZATION = (
    "mintrud_reporting_organization"
)


class MintrudEmployerResolutionError(
    ValueError
):
    pass


@dataclass(frozen=True)
class MintrudEmployer:
    title: str
    inn: str
    source: str


def _normalize_text(
    value: object | None,
) -> str:
    return str(
        value
        or ""
    ).strip()


def _require_mapping(
    value: object,
    *,
    field: str,
) -> Mapping:
    if not isinstance(
        value,
        Mapping,
    ):
        raise MintrudEmployerResolutionError(
            field
            + " must be present in the "
            "approved Mintrud snapshot"
        )

    return value


def resolve_mintrud_employer_from_approval_snapshot(
    snapshot: Mapping,
) -> MintrudEmployer:
    if not isinstance(
        snapshot,
        Mapping,
    ):
        raise MintrudEmployerResolutionError(
            "Approved registry snapshot must be a mapping"
        )

    registry = _normalize_text(
        snapshot.get(
            "registry"
        )
    )

    if registry != REGISTRY_MINTRUD:
        raise MintrudEmployerResolutionError(
            "Approved snapshot is not a Mintrud snapshot"
        )

    context = _require_mapping(
        snapshot.get(
            "mintrud_context"
        ),
        field="mintrud_context",
    )

    scenario = _normalize_text(
        context.get(
            "reporting_scenario"
        )
    )

    if (
        scenario
        == MINTRUD_REPORTING_SCENARIO_EXTERNAL_TRAINING_PROVIDER
    ):
        source = context
        title_field = "employer_name"
        inn_field = "employer_inn"
        source_name = (
            MINTRUD_EMPLOYER_SOURCE_CONTEXT
        )

    elif (
        scenario
        == MINTRUD_REPORTING_SCENARIO_EMPLOYER_SELF_TRAINING
    ):
        source = _require_mapping(
            snapshot.get(
                "mintrud_reporting_organization"
            ),
            field=(
                "mintrud_reporting_organization"
            ),
        )

        title_field = "name"
        inn_field = "inn"
        source_name = (
            MINTRUD_EMPLOYER_SOURCE_REPORTING_ORGANIZATION
        )

    else:
        raise MintrudEmployerResolutionError(
            "Approved Mintrud snapshot has an "
            "unsupported reporting scenario: "
            + repr(
                scenario
            )
        )

    title = _normalize_text(
        source.get(
            title_field
        )
    )

    inn = _normalize_text(
        source.get(
            inn_field
        )
    )

    if not title:
        raise MintrudEmployerResolutionError(
            "Resolved Mintrud employer title is required"
        )

    if not inn:
        raise MintrudEmployerResolutionError(
            "Resolved Mintrud employer INN is required"
        )

    return MintrudEmployer(
        title=title,
        inn=inn,
        source=source_name,
    )