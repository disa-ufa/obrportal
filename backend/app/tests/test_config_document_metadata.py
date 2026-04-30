from __future__ import annotations

from app.core.config import Settings


DOCUMENT_METADATA_ENV_KEYS = [
    "DOCUMENT_ORG_NAME",
    "DOCUMENT_ORG_SHORT_NAME",
    "DOCUMENT_ORG_ADDRESS",
    "DOCUMENT_ORG_LICENSE",
    "DOCUMENT_ORG_INN",
    "DOCUMENT_ORG_KPP",
    "DOCUMENT_ORG_OGRN",
    "DOCUMENT_SIGNER_POSITION",
    "DOCUMENT_SIGNER_FULL_NAME",
    "OBRPORTAL_ORG_NAME",
    "OBRPORTAL_ORG_SHORT_NAME",
    "OBRPORTAL_ORG_ADDRESS",
    "OBRPORTAL_ORG_LICENSE",
    "OBRPORTAL_ORG_INN",
    "OBRPORTAL_ORG_KPP",
    "OBRPORTAL_ORG_OGRN",
    "OBRPORTAL_SIGNER_POSITION",
    "OBRPORTAL_SIGNER_FULL_NAME",
]


def clear_document_metadata_env(monkeypatch) -> None:
    for key in DOCUMENT_METADATA_ENV_KEYS:
        monkeypatch.delenv(key, raising=False)


def test_document_metadata_defaults_are_clean_russian(monkeypatch) -> None:
    clear_document_metadata_env(monkeypatch)

    settings = Settings(_env_file=None)

    assert settings.document_org_name == "\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e"
    assert settings.document_org_short_name == "\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e"
    assert settings.document_org_address == "\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u0411\u0430\u0448\u043a\u043e\u0440\u0442\u043e\u0441\u0442\u0430\u043d, \u0433. \u0423\u0444\u0430"
    assert settings.document_org_license == "\u041b\u0438\u0446\u0435\u043d\u0437\u0438\u044f \u043d\u0430 \u043e\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u0434\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u0438"
    assert settings.document_org_inn == ""
    assert settings.document_org_kpp == ""
    assert settings.document_org_ogrn == ""
    assert settings.document_signer_position == "\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440"
    assert settings.document_signer_full_name == "\u041e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0435 \u043b\u0438\u0446\u043e"

    combined = "\n".join(
        [
            settings.document_org_name,
            settings.document_org_short_name,
            settings.document_org_address,
            settings.document_org_license,
            settings.document_signer_position,
            settings.document_signer_full_name,
        ]
    )

    assert "????" not in combined
    assert "\ufffd" not in combined


def test_document_metadata_supports_document_env_aliases(monkeypatch) -> None:
    clear_document_metadata_env(monkeypatch)

    monkeypatch.setenv("DOCUMENT_ORG_NAME", "Document Org Name")
    monkeypatch.setenv("DOCUMENT_ORG_SHORT_NAME", "Document Org")
    monkeypatch.setenv("DOCUMENT_ORG_ADDRESS", "Document Address")
    monkeypatch.setenv("DOCUMENT_ORG_LICENSE", "Document License")
    monkeypatch.setenv("DOCUMENT_ORG_INN", "0278000001")
    monkeypatch.setenv("DOCUMENT_ORG_KPP", "027801001")
    monkeypatch.setenv("DOCUMENT_ORG_OGRN", "1020200000001")
    monkeypatch.setenv("DOCUMENT_SIGNER_POSITION", "Document Signer Position")
    monkeypatch.setenv("DOCUMENT_SIGNER_FULL_NAME", "Document Signer Name")

    settings = Settings(_env_file=None)

    assert settings.document_org_name == "Document Org Name"
    assert settings.document_org_short_name == "Document Org"
    assert settings.document_org_address == "Document Address"
    assert settings.document_org_license == "Document License"
    assert settings.document_org_inn == "0278000001"
    assert settings.document_org_kpp == "027801001"
    assert settings.document_org_ogrn == "1020200000001"
    assert settings.document_signer_position == "Document Signer Position"
    assert settings.document_signer_full_name == "Document Signer Name"


def test_document_metadata_supports_legacy_obrportal_env_aliases(monkeypatch) -> None:
    clear_document_metadata_env(monkeypatch)

    monkeypatch.setenv("OBRPORTAL_ORG_NAME", "Legacy Org Name")
    monkeypatch.setenv("OBRPORTAL_ORG_SHORT_NAME", "Legacy Org")
    monkeypatch.setenv("OBRPORTAL_ORG_ADDRESS", "Legacy Address")
    monkeypatch.setenv("OBRPORTAL_ORG_LICENSE", "Legacy License")
    monkeypatch.setenv("OBRPORTAL_ORG_INN", "1111111111")
    monkeypatch.setenv("OBRPORTAL_ORG_KPP", "222222222")
    monkeypatch.setenv("OBRPORTAL_ORG_OGRN", "3333333333333")
    monkeypatch.setenv("OBRPORTAL_SIGNER_POSITION", "Legacy Signer Position")
    monkeypatch.setenv("OBRPORTAL_SIGNER_FULL_NAME", "Legacy Signer Name")

    settings = Settings(_env_file=None)

    assert settings.document_org_name == "Legacy Org Name"
    assert settings.document_org_short_name == "Legacy Org"
    assert settings.document_org_address == "Legacy Address"
    assert settings.document_org_license == "Legacy License"
    assert settings.document_org_inn == "1111111111"
    assert settings.document_org_kpp == "222222222"
    assert settings.document_org_ogrn == "3333333333333"
    assert settings.document_signer_position == "Legacy Signer Position"
    assert settings.document_signer_full_name == "Legacy Signer Name"


def test_document_metadata_document_alias_has_priority_over_legacy_alias(monkeypatch) -> None:
    clear_document_metadata_env(monkeypatch)

    monkeypatch.setenv("DOCUMENT_ORG_NAME", "Preferred Document Org")
    monkeypatch.setenv("OBRPORTAL_ORG_NAME", "Legacy Org")
    monkeypatch.setenv("DOCUMENT_SIGNER_FULL_NAME", "Preferred Signer")
    monkeypatch.setenv("OBRPORTAL_SIGNER_FULL_NAME", "Legacy Signer")

    settings = Settings(_env_file=None)

    assert settings.document_org_name == "Preferred Document Org"
    assert settings.document_signer_full_name == "Preferred Signer"
