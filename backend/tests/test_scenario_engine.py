"""Regression tests for scenario_engine.py's deterministic what-if
projection math (feat-055). Pins the hourly-rate computation (derived
from real reading timestamps, not an assumed cadence) and the with/vs-
without-action branching.
"""

from datetime import datetime

from app.services.scenario_engine import NO_ACTION, available_actions, simulate


def _reading(ts: datetime, **fields) -> dict:
    return {"ts": ts, **fields}


class TestAvailableActions:
    def test_known_risk_type_includes_no_action_plus_real_actions(self):
        actions = available_actions("dissolved_oxygen")
        assert actions[0] == NO_ACTION
        assert "emergency_aeration" in actions

    def test_unknown_risk_type_only_offers_no_action(self):
        assert available_actions("something_unmapped") == [NO_ACTION]


class TestSimulate:
    def test_unknown_risk_type_errors(self):
        result = simulate("not_a_real_risk_type", {}, None, NO_ACTION)
        assert "error" in result

    def test_missing_previous_reading_errors(self):
        now = datetime(2026, 7, 24, 12, 0, 0)
        result = simulate("dissolved_oxygen", _reading(now, dissolved_oxygen_mg_l=4.0), None, NO_ACTION)
        assert "error" in result

    def test_hourly_rate_computed_from_real_elapsed_time(self):
        # 2.0 mg/L drop over 5 hours -> -0.4/hr, not an assumed daily cadence.
        prev = _reading(datetime(2026, 7, 24, 7, 0, 0), dissolved_oxygen_mg_l=6.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=4.0)
        result = simulate("dissolved_oxygen", curr, prev, NO_ACTION)
        assert result["baseline_delta_per_hour"] == -0.4

    def test_no_action_projection_matches_baseline_trend(self):
        prev = _reading(datetime(2026, 7, 24, 6, 0, 0), dissolved_oxygen_mg_l=6.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=4.8)
        result = simulate("dissolved_oxygen", curr, prev, NO_ACTION)
        # -0.2/hr baseline; at 6h: 4.8 - 1.2 = 3.6; with_action == without_action for no_action.
        six_hour = next(p for p in result["projections"] if p["horizon_hours"] == 6)
        assert six_hour["without_action"] == 3.6
        assert six_hour["with_action"] == six_hour["without_action"]

    def test_named_action_improves_projection_in_the_right_direction(self):
        prev = _reading(datetime(2026, 7, 24, 6, 0, 0), dissolved_oxygen_mg_l=6.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=4.8)
        result = simulate("dissolved_oxygen", curr, prev, "emergency_aeration")
        six_hour = next(p for p in result["projections"] if p["horizon_hours"] == 6)
        # -0.2/hr baseline + 0.8/hr aeration effect = +0.6/hr net -> rising, not falling.
        assert six_hour["with_action"] > six_hour["without_action"]
        assert six_hour["with_action"] > curr["dissolved_oxygen_mg_l"]

    def test_long_horizon_projection_is_clamped_to_realistic_bounds(self):
        # 2.0 mg/L flat + 0.8/hr aeration effect over 24h would be a
        # physically impossible ~21.2 mg/L -- must clamp to the simulator's
        # own dissolved_oxygen_mg_l ceiling (8.0), same as real live data
        # surfaced (2026-07-25 live verification).
        prev = _reading(datetime(2026, 7, 24, 6, 0, 0), dissolved_oxygen_mg_l=2.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=2.0)
        result = simulate("dissolved_oxygen", curr, prev, "emergency_aeration")
        twenty_four_hour = next(p for p in result["projections"] if p["horizon_hours"] == 24)
        assert twenty_four_hour["with_action"] == 8.0

    def test_falling_no_action_projection_is_clamped_to_realistic_floor(self):
        prev = _reading(datetime(2026, 7, 24, 0, 0, 0), dissolved_oxygen_mg_l=6.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=2.0)
        result = simulate("dissolved_oxygen", curr, prev, NO_ACTION)
        twenty_four_hour = next(p for p in result["projections"] if p["horizon_hours"] == 24)
        # -0.33/hr * 24h from 2.0 would go well below the simulator's own
        # 2.0 mg/L floor -- must clamp there, not report a negative reading.
        assert twenty_four_hour["without_action"] == 2.0

    def test_unrecognized_action_has_zero_effect(self):
        prev = _reading(datetime(2026, 7, 24, 6, 0, 0), dissolved_oxygen_mg_l=6.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=4.8)
        result = simulate("dissolved_oxygen", curr, prev, "not_a_real_action")
        six_hour = next(p for p in result["projections"] if p["horizon_hours"] == 6)
        assert six_hour["with_action"] == six_hour["without_action"]

    def test_non_positive_elapsed_time_errors(self):
        same_ts = datetime(2026, 7, 24, 12, 0, 0)
        result = simulate(
            "dissolved_oxygen",
            _reading(same_ts, dissolved_oxygen_mg_l=4.0),
            _reading(same_ts, dissolved_oxygen_mg_l=6.0),
            NO_ACTION,
        )
        assert "error" in result

    def test_both_horizons_present(self):
        prev = _reading(datetime(2026, 7, 24, 6, 0, 0), dissolved_oxygen_mg_l=6.0)
        curr = _reading(datetime(2026, 7, 24, 12, 0, 0), dissolved_oxygen_mg_l=4.8)
        result = simulate("dissolved_oxygen", curr, prev, NO_ACTION)
        horizons = {p["horizon_hours"] for p in result["projections"]}
        assert horizons == {6, 24}
