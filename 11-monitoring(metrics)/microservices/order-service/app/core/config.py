from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = Field("order-service", alias="APP_NAME")
    environment: str = Field("development", alias="APP_ENV")
    port: int = 8000
    log_level: str = "INFO"
    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")
    user_service_url: str = Field(..., alias="USER_SERVICE_URL")
    request_timeout_seconds: float = 2.0
    cache_ttl_seconds: int = 120


settings = Settings()
