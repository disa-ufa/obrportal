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

    cors_origins_raw: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.cors_origins_raw.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()