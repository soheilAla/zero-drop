from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    max_drop_size_bytes: int
    min_expiration_seconds: int = 60
    max_expiration_seconds: int = 604800  # 7 days
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf8", extra="ignore"
    )


settings = Settings()
