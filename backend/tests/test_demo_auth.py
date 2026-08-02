from app.config import settings
from app.services import demo_auth


def test_disabled_when_passcode_unset(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "")
    assert demo_auth.is_enabled() is False


def test_enabled_when_passcode_set(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    assert demo_auth.is_enabled() is True


def test_check_passcode(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    assert demo_auth.check_passcode("letmein") is True
    assert demo_auth.check_passcode("wrong") is False


def test_token_roundtrip(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    token, expires_at = demo_auth.create_token()
    assert expires_at > 0
    assert demo_auth.verify_token(token) is True


def test_token_rejected_after_passcode_changes(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    token, _ = demo_auth.create_token()
    monkeypatch.setattr(settings, "demo_passcode", "different")
    assert demo_auth.verify_token(token) is False


def test_token_rejected_when_malformed(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    assert demo_auth.verify_token("not-a-real-token") is False
    assert demo_auth.verify_token("") is False


def test_token_rejected_when_expired(monkeypatch):
    monkeypatch.setattr(settings, "demo_passcode", "letmein")
    expired_token = "1.deadbeef"
    assert demo_auth.verify_token(expired_token) is False
