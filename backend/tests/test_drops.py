import base64
import hashlib
from datetime import UTC, datetime, timedelta

import pytest

from app.core.config import settings
from app.drops.exceptions import DropTooLargeError, DropValidationError
from app.drops.schemas import DropCreateRequest
from app.drops.services import consume_drop, create_drop, get_drop


def encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).rstrip(b"=").decode("ascii")


def make_create_request(
    *,
    ciphertext: bytes = b"ciphertext",
    content_iv: bytes = b"s" * 12,
    kdf_salt: bytes | None = None,
    consume_token: bytes = b"s" * 32,
    expiration_seconds: int = 3600,
    remaining_views: int | None = 5,
    crypto_version: int = 1,
) -> DropCreateRequest:
    return DropCreateRequest(
        ciphertext=encode(ciphertext),
        content_iv=encode(content_iv),
        kdf_salt=encode(kdf_salt) if kdf_salt is not None else None,
        consume_token_hash=encode(hashlib.sha256(consume_token).digest()),
        crypto_version=crypto_version,
        expiration_seconds=expiration_seconds,
        remaining_views=remaining_views,
    )


@pytest.mark.asyncio
async def test_create_drop(db):
    token = b"s" * 32

    drop = await create_drop(
        db,
        make_create_request(consume_token=token),
    )

    assert drop.id
    assert drop.ciphertext == b"ciphertext"
    assert drop.content_iv == b"s" * 12
    assert drop.consume_token_hash == hashlib.sha256(token).digest()
    assert drop.remaining_views == 5
    assert drop.size_bytes == len(drop.ciphertext)
    assert drop.expires_at > datetime.now(UTC)


@pytest.mark.asyncio
async def test_create_drop_accepts_16_byte_kdf_salt(db):
    drop = await create_drop(
        db,
        make_create_request(kdf_salt=b"s" * 16),
    )

    assert drop.kdf_salt == b"s" * 16


@pytest.mark.asyncio
async def test_create_drop_rejects_invalid_kdf_salt(db):
    with pytest.raises(DropValidationError, match="Invalid KDF salt"):
        await create_drop(
            db,
            make_create_request(kdf_salt=b"s" * 15),
        )


@pytest.mark.asyncio
async def test_create_drop_rejects_invalid_iv(db):
    with pytest.raises(
        DropValidationError,
        match="Invalid Initialization Vector",
    ):
        await create_drop(
            db,
            make_create_request(content_iv=b"short"),
        )


@pytest.mark.asyncio
async def test_create_drop_rejects_invalid_consume_token_hash(db):
    data = DropCreateRequest(
        ciphertext=encode(b"ciphertext"),
        content_iv=encode(b"s" * 12),
        consume_token_hash=encode(b"short"),
        expiration_seconds=3600,
        remaining_views=5,
    )

    with pytest.raises(DropValidationError, match="Invalid consume token"):
        await create_drop(db, data)


@pytest.mark.asyncio
async def test_create_drop_rejects_unsupported_crypto_version(db):
    with pytest.raises(
        DropValidationError,
        match="Unsupported encryption protocol version",
    ):
        await create_drop(
            db,
            make_create_request(crypto_version=10),
        )


@pytest.mark.asyncio
async def test_create_drop_rejects_oversized_drop(db, monkeypatch):
    monkeypatch.setattr(settings, "max_drop_size_bytes", 10)

    with pytest.raises(DropTooLargeError, match="Drop is too large"):
        await create_drop(
            db,
            make_create_request(ciphertext=b"s" * 11),
        )


@pytest.mark.asyncio
async def test_get_drop_returns_active_drop(db):
    created = await create_drop(
        db,
        make_create_request(),
    )

    drop = await get_drop(db, created.id)

    assert drop is not None
    assert drop.id == created.id


@pytest.mark.asyncio
async def test_get_drop_returns_none_for_expired_drop(db):
    created = await create_drop(
        db,
        make_create_request(),
    )

    created.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()

    assert await get_drop(db, created.id) is None


@pytest.mark.asyncio
async def test_get_drop_returns_none_for_consumed_drop(db):
    created = await create_drop(
        db,
        make_create_request(remaining_views=1),
    )

    created.remaining_views = 0
    await db.commit()

    assert await get_drop(db, created.id) is None


@pytest.mark.asyncio
async def test_consume_drop_decrements_remaining_views(db):
    token = b"s" * 32

    created = await create_drop(
        db,
        make_create_request(
            consume_token=token,
            remaining_views=3,
        ),
    )

    consumed = await consume_drop(
        db,
        created.id,
        encode(token),
    )

    assert consumed is not None
    assert consumed.remaining_views == 2


@pytest.mark.asyncio
async def test_consume_drop_rejects_invalid_token_without_decrementing(db):
    valid_token = b"v" * 32
    invalid_token = b"i" * 32

    created = await create_drop(
        db,
        make_create_request(
            consume_token=valid_token,
            remaining_views=3,
        ),
    )

    consumed = await consume_drop(
        db,
        created.id,
        encode(invalid_token),
    )

    assert consumed is None

    drop = await get_drop(db, created.id)
    assert drop is not None
    assert drop.remaining_views == 3


@pytest.mark.asyncio
async def test_consume_last_view_makes_drop_unavailable(db):
    token = b"s" * 32

    created = await create_drop(
        db,
        make_create_request(
            consume_token=token,
            remaining_views=1,
        ),
    )

    consumed = await consume_drop(
        db,
        created.id,
        encode(token),
    )

    assert consumed is not None
    assert consumed.remaining_views == 0
    assert await get_drop(db, created.id) is None


@pytest.mark.asyncio
async def test_consume_unlimited_drop_keeps_remaining_views_unlimited(db):
    token = b"s" * 32

    created = await create_drop(
        db,
        make_create_request(
            consume_token=token,
            remaining_views=None,
        ),
    )

    consumed = await consume_drop(
        db,
        created.id,
        encode(token),
    )

    assert consumed is not None
    assert consumed.remaining_views is None

    drop = await get_drop(db, created.id)
    assert drop is not None
    assert drop.remaining_views is None


@pytest.mark.asyncio
async def test_consume_expired_drop_returns_none(db):
    token = b"s" * 32

    created = await create_drop(
        db,
        make_create_request(
            consume_token=token,
        ),
    )

    created.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    await db.commit()

    assert (
        await consume_drop(
            db,
            created.id,
            encode(token),
        )
        is None
    )
