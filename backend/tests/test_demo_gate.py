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
from app.services import demo_auth

client = TestClient(app)


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
