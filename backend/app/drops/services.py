import base64
import binascii
import secrets
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.drops.models import Drop
from app.drops.schemas import DropCreateRequest


def decode_base64url(value: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(value + "=" * (-len(value % 4)))
    except (ValueError, binascii.Error):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid Base64 URL",
        )


async def create_drop(db: AsyncSession, data: DropCreateRequest):
    ciphertext = decode_base64url(data.ciphertext)
    content_iv = decode_base64url(data.content_iv)
    kdf_salt = decode_base64url(data.kdf_salt) if data.kdf_salt else None

    if len(ciphertext) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Drop cannot be empty",
        )

    if len(ciphertext) > settings.max_drop_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail="Drop is too large"
        )

    if len(content_iv) != 12:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Invalid Initialization Vector",
        )

    if data.crypto_version != 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Unsupported encryption protocol version",
        )

    if kdf_salt and len(kdf_salt) < 16:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Invalid KDF salt"
        )

    if data.expiration_seconds < settings.min_expiration_seconds:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Expiration time is too short",
        )

    if data.expiration_seconds > settings.max_expiration_seconds:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="Expiration time exceeds maximum allowed",
        )

    expires_at = datetime.now(UTC) + timedelta(seconds=data.expiration_seconds)

    drop = Drop(
        id=secrets.token_urlsafe(16),
        ciphertext=ciphertext,
        content_iv=content_iv,
        kdf_salt=kdf_salt,
        crypto_version=data.crypto_version,
        expires_at=expires_at,
        remaining_views=data.remaining_views,
        size_bytes=len(ciphertext),
    )

    db.add(drop)
    await db.commit()
    await db.refresh(drop)

    return drop
