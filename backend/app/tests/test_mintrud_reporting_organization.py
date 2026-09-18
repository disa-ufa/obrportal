from __future__ import annotations

from datetime import date, datetime, timezone
from types import SimpleNamespace

from app.core.config import settings
from app.services.compliance_registry_contract import (
    REGISTRY_MINTRUD,
)
from app.services.compliance_registry_readiness import (
    evaluate_registry_readiness,
)
from app.services.mintrud_reporting_organization import (
    MintrudReportingOrganization,
    resolve_mintrud_reporting_organization,
)


def evaluate_with_reporting_org(
    reporting_organization,
):
    return evaluate_registry_readiness(
        registry=REGISTRY_MINTRUD,
        enrollment=SimpleNamespace(
            status="completed",
            completed_at=datetime(
                2026,
                9,
                18,
                tzinfo=timezone.utc,
            ),
        ),
        course=SimpleNamespace(
            title="Occupational safety",
        ),
        learner=SimpleNamespace(
            id="learner-1",
        ),
        learner_profile=SimpleNamespace(
            last_name="Ivanov",
            first_name="Ivan",
            snils="000-000-000 00",
        ),
        mintrud_context=SimpleNamespace(
            reporting_scenario=(
                "employer_self_training"
            ),
            profession_or_position="Engineer",
            employer_name=None,
            employer_inn=None,
            knowledge_check_result="satisfactory",
            knowledge_check_date=date(
                2026,
                9,
                18,
            ),
            protocol_number="OT-001",
        ),
        mintrud_learn_programs=(
            SimpleNamespace(
                learn_program_id=1,
                schema_version="1.0.9",
                is_active=True,
            ),
        ),
        mintrud_reporting_organization=(
            reporting_organization
        ),
    )


def codes(result):
    return {
        issue.code
        for issue in result.issues
    }


def test_resolver_reads_central_document_org_settings(
    monkeypatch,
):
    monkeypatch.setattr(
        settings,
        "document_org_name",
        "  Test Reporting Org  ",
    )

    monkeypatch.setattr(
        settings,
        "document_org_inn",
        "  0274000000  ",
    )

    assert (
        resolve_mintrud_reporting_organization()
        == MintrudReportingOrganization(
            name="Test Reporting Org",
            inn="0274000000",
        )
    )


def test_readiness_fails_closed_without_reporting_org_name():
    result = evaluate_with_reporting_org(
        MintrudReportingOrganization(
            name="",
            inn="0274000000",
        )
    )

    assert (
        "mintrud.reporting_organization_name_missing"
        in codes(result)
    )


def test_readiness_fails_closed_without_reporting_org_inn():
    result = evaluate_with_reporting_org(
        MintrudReportingOrganization(
            name="Test Reporting Org",
            inn="",
        )
    )

    assert (
        "mintrud.reporting_organization_inn_missing"
        in codes(result)
    )


def test_valid_reporting_org_has_no_reporting_org_errors():
    result = evaluate_with_reporting_org(
        MintrudReportingOrganization(
            name="Test Reporting Org",
            inn="0274000000",
        )
    )

    result_codes = codes(result)

    assert (
        "mintrud.reporting_organization_name_missing"
        not in result_codes
    )

    assert (
        "mintrud.reporting_organization_inn_missing"
        not in result_codes
    )
