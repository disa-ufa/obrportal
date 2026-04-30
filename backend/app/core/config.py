from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "ObrPortal"
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

    document_org_name: str = Field(default="???? ????", validation_alias="OBRPORTAL_ORG_NAME")
    document_org_short_name: str = Field(default="???? ????", validation_alias="OBRPORTAL_ORG_SHORT_NAME")
    document_org_address: str = Field(default="?????????? ????????????, ?. ???", validation_alias="OBRPORTAL_ORG_ADDRESS")
    document_org_license: str = Field(default="???????? ?? ????????????? ??????????????? ????????????", validation_alias="OBRPORTAL_ORG_LICENSE")
    document_org_inn: str = Field(default="")
    document_org_kpp: str = Field(default="")
    document_org_ogrn: str = Field(default="")
    document_signer_position: str = Field(default="????????", validation_alias="OBRPORTAL_SIGNER_POSITION")
    document_signer_full_name: str = Field(default="????????????? ????", validation_alias="OBRPORTAL_SIGNER_FULL_NAME")

    cors_origins_raw: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
