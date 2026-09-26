from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.config import settings


class DropCreateRequest(BaseModel):
    ciphertext: str = Field(min_length=1)
    content_iv: str
    kdf_salt: str | None = Field(default=None)
    consume_token_hash: str
    crypto_version: int = Field(default=1, ge=1)
    expiration_seconds: int = Field(ge=60)
    remaining_views: int | None = Field(
        default=None, ge=1, le=settings.max_remaining_views
    )


class DropConsumeRequest(BaseModel):
    consume_token: str


class DropCreateResponse(BaseModel):
    id: str
    expires_at: datetime
    remaining_views: int | None


class DropResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ciphertext: str
    content_iv: str
    kdf_salt: str | None
    crypto_version: int
    expires_at: datetime
    remaining_views: int | None
