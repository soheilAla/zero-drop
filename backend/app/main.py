import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.drops.exceptions import DropTooLargeError, DropValidationError
from app.drops.handlers import drop_error_handler, drop_too_large_error_handler
from app.drops.routers import router as drops_router
from app.drops.services import cleanup_expired_drops
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.security_headers import security_headers


async def cleanup_drops_loop():
    while True:
        async with AsyncSessionLocal() as db:
            await cleanup_expired_drops(db)

        await asyncio.sleep(3600)


@asynccontextmanager
async def lifespan(app: FastAPI):
    task = asyncio.create_task(cleanup_drops_loop())

    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Zero Drop", lifespan=lifespan)

app.add_middleware(RateLimitMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.middleware("http")(security_headers)

app.add_exception_handler(DropValidationError, drop_error_handler)
app.add_exception_handler(DropTooLargeError, drop_too_large_error_handler)

app.include_router(drops_router)
