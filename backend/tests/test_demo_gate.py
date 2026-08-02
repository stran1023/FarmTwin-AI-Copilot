"""Verifies /workflow/run's require_demo_access dependency actually blocks
unauthenticated requests before touching Snowflake -- a 401 here proves the
gate short-circuits inside FastAPI's dependency resolution.

The "gate passes a valid/disabled request through" side is tested by calling
require_demo_access directly rather than via TestClient/the full endpoint --
/workflow/run's handler makes a real Snowflake + Open-Meteo call with no
timeout configured, which hangs indefinitely without live credentials/network
(the same reason this repo's other pytest tests never touch real Snowflake;
that's what the Playwright e2e suite is for)."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.config import settings
from app.main import app, require_demo_access
from app.services import demo_auth, snowflake_client

client = TestClient(app)


def _boom(*_args, **_kwargs):
    raise RuntimeError("no live Snowflake in tests")


def test_workflow_run_blocked_without_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.post("/workflow/run")
    assert res.status_code == 401


def test_workflow_run_blocked_with_wrong_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.post("/workflow/run", headers={"X-Demo-Token": "bogus"})
    assert res.status_code == 401


def test_demo_unlock_returns_404_when_gate_disabled(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "")
    res = client.post("/demo/unlock", json={"passcode": "anything"})
    assert res.status_code == 404


def test_demo_unlock_rejects_wrong_passcode(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.post("/demo/unlock", json={"passcode": "wrong"})
    assert res.status_code == 401


def test_demo_unlock_issues_a_token_require_demo_access_accepts(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    unlock = client.post("/demo/unlock", json={"passcode": "letmein"})
    assert unlock.status_code == 200
    token = unlock.json()["token"]

    require_demo_access(x_demo_token=token)  # no exception raised = pass


def test_require_demo_access_is_noop_when_gate_disabled(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "")
    require_demo_access(x_demo_token=None)  # no exception raised = pass


def test_require_demo_access_rejects_missing_token_when_enabled(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    with pytest.raises(HTTPException) as exc_info:
        require_demo_access(x_demo_token=None)
    assert exc_info.value.status_code == 401


def test_require_demo_access_accepts_freshly_created_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    token, _ = demo_auth.create_token()
    require_demo_access(x_demo_token=token)  # no exception raised = pass


# The 5 other routes extended to require the gate this session. Each of
# these blocked-without-token checks is safe under TestClient because
# require_demo_access (route-level dependency, or the manual call at the
# top of simulate_scenario) raises before any Snowflake query runs -- same
# reasoning as the /workflow/run tests above.


def test_harvest_plan_blocked_without_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.get("/assets/FP-001/harvest-plan")
    assert res.status_code == 401


def test_yield_estimate_blocked_without_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.get("/assets/FP-001/yield-estimate")
    assert res.status_code == 401


def test_copilot_ask_blocked_without_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.post("/copilot/ask", json={"question": "what's happening?"})
    assert res.status_code == 401


def test_briefing_today_blocked_without_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.get("/briefing/today")
    assert res.status_code == 401


def test_simulate_with_action_blocked_without_token(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    res = client.post("/assets/FP-001/simulate", json={"action": "emergency_aeration"})
    assert res.status_code == 401


def test_simulate_without_action_is_not_gated(monkeypatch):
    """The free baseline call (no `action`) must reach the handler even
    with no token -- it never calls the Cortex Agent, so it's deliberately
    excluded from the gate. snowflake_client.run_query is monkeypatched to
    fail fast instead of actually reaching live Snowflake; any status other
    than 401 proves the request got past require_demo_access. Uses a
    non-raising TestClient since the injected failure would otherwise
    propagate as a real Python exception instead of a 500 response."""
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    monkeypatch.setattr(snowflake_client, "run_query", _boom)
    lenient_client = TestClient(app, raise_server_exceptions=False)
    res = lenient_client.post("/assets/FP-001/simulate", json={})
    assert res.status_code != 401
