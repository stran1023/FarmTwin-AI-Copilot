"""Live-found bug: Open-Meteo returned a 429 (Render's free-tier outbound IP
is shared across other tenants, so this can happen independent of our own
call volume) and /workflow/run 500'd outright, even though nothing else in
the route ever reads the weather value back. Confirms the route now degrades
gracefully -- weather ingestion is skipped, the rest of the tick (asset
loop -- here faked empty to avoid a real Snowflake/Cortex call, same
reasoning as test_demo_gate.py) still completes with a 200."""

import httpx
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app
from app.services import snowflake_client, weather_client

client = TestClient(app)


async def _boom(*_args, **_kwargs):
    raise httpx.HTTPStatusError(
        "429 Too Many Requests",
        request=httpx.Request("GET", "https://api.open-meteo.com/v1/forecast"),
        response=httpx.Response(429),
    )


def test_workflow_run_survives_weather_failure(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "")  # gate disabled, same as local dev/every other test
    monkeypatch.setattr(weather_client, "get_today_reading", _boom)
    monkeypatch.setattr(snowflake_client, "run_query", lambda *a, **k: [])  # no assets -> empty loop, no Cortex call
    monkeypatch.setattr(snowflake_client, "execute", lambda *a, **k: None)

    res = client.post("/workflow/run")

    assert res.status_code == 200
    body = res.json()
    assert body["assets_assessed"] == 0
    assert body["recommendations_created"] == []
