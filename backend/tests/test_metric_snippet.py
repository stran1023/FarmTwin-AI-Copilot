"""Pure unit tests for app/main.py's _metric_snippet() -- the live progress
panel's per-asset headline metric, keyed off the same risk_engine.trend_metric()
mapping risk_engine itself uses (not an invented display)."""

from app.main import _metric_snippet
from app.services import risk_engine


def test_known_risk_type_with_value_present():
    assert _metric_snippet("dissolved_oxygen", {"dissolved_oxygen_mg_l": 2.0}) == "DO: 2.0 mg/L"


def test_known_risk_type_missing_value_returns_none():
    assert _metric_snippet("dissolved_oxygen", {}) is None


def test_risk_type_with_no_trend_mapping_returns_none():
    assert _metric_snippet("none", {"dissolved_oxygen_mg_l": 6.5}) is None


def test_field_without_a_display_label_falls_back_to_title_case(monkeypatch):
    # Every real risk_type's field is covered in _METRIC_LABELS today -- this
    # exercises the defensive fallback branch directly, so a future new
    # risk_type/field pair added to risk_engine without a matching label
    # degrades to a readable title-cased name instead of a KeyError.
    monkeypatch.setattr(risk_engine, "trend_metric", lambda risk_type: ("made_up_field", "lower_worse"))
    assert _metric_snippet("anything", {"made_up_field": 42}) == "Made Up Field: 42"
