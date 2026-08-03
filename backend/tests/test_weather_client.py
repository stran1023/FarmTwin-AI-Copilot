import asyncio

import httpx

from app.services import weather_client

_RealAsyncClient = httpx.AsyncClient

_FORECAST_BODY = {
    "daily": {
        "precipitation_sum": [12.3],
        "temperature_2m_max": [30.0],
        "temperature_2m_min": [24.0],
        "wind_speed_10m_max": [15.0],
    },
    "hourly": {"relative_humidity_2m": [80.0] * 24},
}


async def _no_op_sleep(_seconds):
    return None


def _patch_responses(monkeypatch, responses):
    """Make weather_client's httpx.AsyncClient() return `responses` in order
    (the last response repeats once exhausted), and skip real retry delays."""
    call_count = {"n": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        idx = min(call_count["n"], len(responses) - 1)
        call_count["n"] += 1
        return responses[idx]

    transport = httpx.MockTransport(handler)
    monkeypatch.setattr(weather_client.httpx, "AsyncClient", lambda: _RealAsyncClient(transport=transport))
    monkeypatch.setattr(weather_client.asyncio, "sleep", _no_op_sleep)
    return call_count


def test_fetch_forecast_succeeds_first_try(monkeypatch):
    call_count = _patch_responses(monkeypatch, [httpx.Response(200, json=_FORECAST_BODY)])
    result = asyncio.run(weather_client.fetch_forecast(10.0, 105.0))
    assert result == _FORECAST_BODY
    assert call_count["n"] == 1


def test_fetch_forecast_retries_after_429_then_succeeds(monkeypatch):
    call_count = _patch_responses(
        monkeypatch,
        [httpx.Response(429, text="Too Many Requests"), httpx.Response(200, json=_FORECAST_BODY)],
    )
    result = asyncio.run(weather_client.fetch_forecast(10.0, 105.0))
    assert result == _FORECAST_BODY
    assert call_count["n"] == 2


def test_fetch_forecast_gives_up_after_max_retries_all_429(monkeypatch):
    call_count = _patch_responses(monkeypatch, [httpx.Response(429, text="Too Many Requests")])
    try:
        asyncio.run(weather_client.fetch_forecast(10.0, 105.0))
        raise AssertionError("expected httpx.HTTPStatusError to be raised")
    except httpx.HTTPStatusError as exc:
        assert exc.response.status_code == 429
    assert call_count["n"] == weather_client._MAX_ATTEMPTS


def test_fetch_forecast_does_not_retry_non_429_errors(monkeypatch):
    call_count = _patch_responses(monkeypatch, [httpx.Response(500, text="Server Error")])
    try:
        asyncio.run(weather_client.fetch_forecast(10.0, 105.0))
        raise AssertionError("expected httpx.HTTPStatusError to be raised")
    except httpx.HTTPStatusError as exc:
        assert exc.response.status_code == 500
    assert call_count["n"] == 1
