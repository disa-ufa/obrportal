from functools import lru_cache

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ObrPortal"
    app_version: str = Field(
        default="0.1.0-stage64-dev",
        validation_alias=AliasChoices("APP_VERSION", "OBRPORTAL_APP_VERSION"),
    )
    environment: str = "local"
    secret_key: str = Field(default="change-me-local-only")
    access_token_expire_minutes: int = 60

    database_url: str = "postgresql+asyncpg://obrportal:obrportal_password@postgres:5432/obrportal"
    redis_url: str = "redis://redis:6379/0"

    s3_endpoint_url: str = "http://minio:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_private: str = "obrportal-private"
    s3_bucket_public: str = "obrportal-public"

    document_storage_dir: str = "/app/storage/private"

    public_base_url: str = Field(
        default="http://localhost:5173",
        validation_alias=AliasChoices(
            "PUBLIC_BASE_URL",
            "FRONTEND_PUBLIC_URL",
            "FRONTEND_URL",
            "APP_PUBLIC_URL",
            "OBRPORTAL_PUBLIC_BASE_URL",
        ),
    )

    document_org_name: str = Field(
        default="\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e",
        validation_alias=AliasChoices("DOCUMENT_ORG_NAME", "OBRPORTAL_ORG_NAME"),
    )
    document_org_short_name: str = Field(
        default="\u0413\u0411\u041e\u0423 \u0420\u0426\u0414\u041e",
        validation_alias=AliasChoices("DOCUMENT_ORG_SHORT_NAME", "OBRPORTAL_ORG_SHORT_NAME"),
    )
    document_org_address: str = Field(
        default="\u0420\u0435\u0441\u043f\u0443\u0431\u043b\u0438\u043a\u0430 \u0411\u0430\u0448\u043a\u043e\u0440\u0442\u043e\u0441\u0442\u0430\u043d, \u0433. \u0423\u0444\u0430",
        validation_alias=AliasChoices("DOCUMENT_ORG_ADDRESS", "OBRPORTAL_ORG_ADDRESS"),
    )
    document_org_license: str = Field(
        default="\u041b\u0438\u0446\u0435\u043d\u0437\u0438\u044f \u043d\u0430 \u043e\u0441\u0443\u0449\u0435\u0441\u0442\u0432\u043b\u0435\u043d\u0438\u0435 \u043e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044c\u043d\u043e\u0439 \u0434\u0435\u044f\u0442\u0435\u043b\u044c\u043d\u043e\u0441\u0442\u0438",
        validation_alias=AliasChoices("DOCUMENT_ORG_LICENSE", "OBRPORTAL_ORG_LICENSE"),
    )
    document_org_inn: str = Field(
        default="",
        validation_alias=AliasChoices("DOCUMENT_ORG_INN", "OBRPORTAL_ORG_INN"),
    )
    document_org_kpp: str = Field(
        default="",
        validation_alias=AliasChoices("DOCUMENT_ORG_KPP", "OBRPORTAL_ORG_KPP"),
    )
    document_org_ogrn: str = Field(
        default="",
        validation_alias=AliasChoices("DOCUMENT_ORG_OGRN", "OBRPORTAL_ORG_OGRN"),
    )
    document_signer_position: str = Field(
        default="\u0414\u0438\u0440\u0435\u043a\u0442\u043e\u0440",
        validation_alias=AliasChoices("DOCUMENT_SIGNER_POSITION", "OBRPORTAL_SIGNER_POSITION"),
    )
    document_signer_full_name: str = Field(
        default="\u041e\u0442\u0432\u0435\u0442\u0441\u0442\u0432\u0435\u043d\u043d\u043e\u0435 \u043b\u0438\u0446\u043e",
        validation_alias=AliasChoices("DOCUMENT_SIGNER_FULL_NAME", "OBRPORTAL_SIGNER_FULL_NAME"),
    )

    cors_origins_raw: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
