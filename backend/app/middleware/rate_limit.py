import time
from collections import defaultdict

from fastapi import Request, Response, status
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from app.core.config import settings


class RateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    def is_allowed(self, key: str) -> bool:
        now = time.monotonic()

        timestamps = self.requests[key]

        timestamps[:] = [
            timestamp
            for timestamp in timestamps
            if now - timestamp < self.window_seconds
        ]

        if len(timestamps) >= self.max_requests:
            return False

        timestamps.append(now)
        return True


rate_limiter = RateLimiter(
    settings.rate_limit_max_requests, settings.rate_limit_window_seconds
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:

        if not rate_limiter.is_allowed:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": "Too many requests",
                },
            )

        return await super().dispatch(request, call_next)
