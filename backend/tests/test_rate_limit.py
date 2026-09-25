from app.middleware.rate_limit import RateLimiter


def test_allows_requests_within_limit():
    limiter = RateLimiter(max_requests=2, window_seconds=60)

    assert limiter.is_allowed("client") is True
    assert limiter.is_allowed("client") is True


def test_rejects_requests_over_limit():
    limiter = RateLimiter(max_requests=2, window_seconds=60)

    assert limiter.is_allowed("client") is True
    assert limiter.is_allowed("client") is True
    assert limiter.is_allowed("client") is False


def test_allows_request_after_window_expires(monkeypatch):
    limiter = RateLimiter(max_requests=1, window_seconds=60)

    current_time = 1000.0
    monkeypatch.setattr(
        "app.middleware.rate_limit.time.monotonic",
        lambda: current_time,
    )

    assert limiter.is_allowed("client") is True
    assert limiter.is_allowed("client") is False

    current_time += 60

    assert limiter.is_allowed("client") is True
