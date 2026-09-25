from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    test_database_url: str
    max_drop_size_bytes: int
    min_expiration_seconds: int = 60
    max_expiration_seconds: int = 604800  # 7 days
    frontend_origin: str
    rate_limit_max_requests: int
    rate_limit_window_seconds: int
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf8", extra="ignore"
    )


settings = Settings()
