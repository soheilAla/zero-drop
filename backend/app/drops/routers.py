from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.drops.schemas import (
    DropConsumeRequest,
    DropCreateRequest,
    DropCreateResponse,
    DropResponse,
)
from app.drops.services import consume_drop, create_drop, encode_base64url, get_drop

router = APIRouter(prefix="/drops", tags=["drops"])


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    response_model=DropCreateResponse,
    description="Store an encrypted drop with an expiration time and optional view limit.",
)
async def create_drop_router(
    data: DropCreateRequest, db: AsyncSession = Depends(get_db)
):
    drop = await create_drop(db, data)

    return DropCreateResponse(
        id=drop.id, expires_at=drop.expires_at, remaining_views=drop.remaining_views
    )


@router.get(
    "/{drop_id}",
    response_model=DropResponse,
    description="Retrieve an active drop without consuming a view.",
)
async def get_drop_router(drop_id: str, db: AsyncSession = Depends(get_db)):
    drop = await get_drop(db, drop_id)

    if not drop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Drop not found"
        )

    return DropResponse(
        id=drop.id,
        ciphertext=encode_base64url(drop.ciphertext),
        content_iv=encode_base64url(drop.content_iv),
        kdf_salt=encode_base64url(drop.kdf_salt) if drop.kdf_salt else None,
        crypto_version=drop.crypto_version,
        expires_at=drop.expires_at,
        remaining_views=drop.remaining_views,
    )


@router.post(
    "/{drop_id}/consume",
    status_code=status.HTTP_204_NO_CONTENT,
    description="Consume one view of a drop after successful decryption.",
)
async def consume_drop_router(
    drop_id: str, data: DropConsumeRequest, db: AsyncSession = Depends(get_db)
):
    drop = await consume_drop(db, drop_id, data.consume_token)

    if not drop:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Drop not found"
        )
