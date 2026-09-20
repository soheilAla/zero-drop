from fastapi import FastAPI

from app.core.exceptions import drop_error_handler, drop_too_large_error_handler
from app.drops.exceptions import DropError, DropTooLargeError
from app.drops.routers import router as drops_router

app = FastAPI(title="Zero Drop")

app.add_exception_handler(DropError, drop_error_handler)
app.add_exception_handler(DropTooLargeError, drop_too_large_error_handler)

app.include_router(drops_router)
