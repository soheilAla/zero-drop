from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DropCreate(BaseModel):
    ciphertext: str = Field(min_length=1)
    content_iv: str
    kdf_salt: str | None = Field(default=None)
    crypto_version: int = Field(default=1, ge=1)
    expires_in_seconds: int = Field(ge=1)
    remaining_views: int | None = Field(default=None, ge=1)


class DropCreateResponse(BaseModel):
    id: str
    expires_at: datetime
    remaining_views: int | None = Field(default=None, ge=1)


class DropResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    ciphertext: str
    contetn_id: str
    kdf_salt: str | None
    crypto_version: int
    expires_at: datetime
    remaining_views: int | None
