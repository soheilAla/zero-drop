from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.drops.schemas import DropCreateRequest, DropCreateResponse
from app.drops.services import create_drop

router = APIRouter(prefix="/drops", tags=["drops"])


@router.post(
    "/", status_code=status.HTTP_201_CREATED, response_model=DropCreateResponse
)
async def create_drop_router(
    data: DropCreateRequest, db: AsyncSession = Depends(get_db)
):
    drop = await create_drop(db, data)

    return DropCreateResponse(
        id=drop.id, expires_at=drop.expires_at, remaining_views=drop.remaining_views
    )
