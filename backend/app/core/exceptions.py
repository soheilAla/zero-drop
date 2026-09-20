from fastapi import Request, status
from fastapi.responses import JSONResponse

from app.drops.exceptions import DropError, DropTooLargeError


async def drop_error_handler(request, exc) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, content={"detail": str(exc)}
    )


async def drop_too_large_error_handler(request, exc) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_413_CONTENT_TOO_LARGE, content={"detail": str(exc)}
    )
