import base64
import binascii
import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import case, delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.drops.exceptions import DropTooLargeError, DropValidationError
from app.drops.models import Drop
from app.drops.schemas import DropCreateRequest


def encode_base64url(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def decode_base64url(value: str) -> bytes:
    try:
        return base64.urlsafe_b64decode(value + "=" * (-len(value) % 4))
    except ValueError, binascii.Error:
        raise DropValidationError("Invalid Base64 URL")


async def create_drop(db: AsyncSession, data: DropCreateRequest) -> Drop:
    ciphertext = decode_base64url(data.ciphertext)
    content_iv = decode_base64url(data.content_iv)
    kdf_salt = decode_base64url(data.kdf_salt) if data.kdf_salt else None
    consume_token_hash = decode_base64url(data.consume_token_hash)

    if len(consume_token_hash) != 32:
        raise DropValidationError("Invalid consume token")

    if len(ciphertext) == 0:
        raise DropValidationError("Drop cannot be empty")

    if len(ciphertext) > settings.max_drop_size_bytes:
        raise DropTooLargeError("Drop is too large")

    if len(content_iv) != 12:
        raise DropValidationError("Invalid Initialization Vector")

    if data.crypto_version != 1:
        raise DropValidationError("Unsupported encryption protocol version")

    if kdf_salt is not None and len(kdf_salt) != 16:
        raise DropValidationError("Invalid KDF salt")

    if data.expiration_seconds < settings.min_expiration_seconds:
        raise DropValidationError("Expiration time is too short")

    if data.expiration_seconds > settings.max_expiration_seconds:
        raise DropValidationError("Expiration time is too long")

    expires_at = datetime.now(UTC) + timedelta(seconds=data.expiration_seconds)

    drop = Drop(
        id=secrets.token_urlsafe(16),
        ciphertext=ciphertext,
        content_iv=content_iv,
        kdf_salt=kdf_salt,
        consume_token_hash=consume_token_hash,
        crypto_version=data.crypto_version,
        expires_at=expires_at,
        remaining_views=data.remaining_views,
        size_bytes=len(ciphertext),
    )

    db.add(drop)
    await db.commit()
    await db.refresh(drop)

    return drop


async def get_drop(db: AsyncSession, drop_id: str) -> Drop | None:
    stmt = select(Drop).where(
        Drop.id == drop_id,
        Drop.expires_at > datetime.now(UTC),
        or_(Drop.remaining_views.is_(None), Drop.remaining_views > 0),
    )

    return await db.scalar(stmt)


async def consume_drop(
    db: AsyncSession, drop_id: str, consume_token: str
) -> Drop | None:
    token = decode_base64url(consume_token)
    consume_token_hash = hashlib.sha256(token).digest()

    stmt = (
        update(Drop)
        .where(
            Drop.id == drop_id,
            Drop.consume_token_hash == consume_token_hash,
            Drop.expires_at > datetime.now(UTC),
            or_(Drop.remaining_views.is_(None), Drop.remaining_views > 0),
        )
        .values(
            remaining_views=case(
                (Drop.remaining_views.is_(None), None),
                else_=Drop.remaining_views - 1,
            )
        )
        .returning(Drop)
    )

    result = await db.execute(stmt)
    drop = result.scalar_one_or_none()

    if not drop:
        return None

    await db.commit()

    return drop


async def cleanup_expired_drops(db: AsyncSession) -> None:
    stmt = delete(Drop).where(Drop.expires_at <= datetime.now(UTC))

    await db.execute(stmt)
    await db.commit()
