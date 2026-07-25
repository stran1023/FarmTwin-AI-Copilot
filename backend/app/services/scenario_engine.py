"""Scenario Simulator ("what if"): projects a risk metric forward at 6h/
24h horizons, with vs without a named intervention, both computed
deterministically in Python and only handed to the Cortex Agent to
narrate -- same reasoning as harvest_planner.py's ETA math (see
feature_list.json feat-055's notes: multi-step numeric extrapolation is
a weaker spot for LLM reasoning than a single-value comparison).

Keyed by risk_type rather than asset_type, reusing risk_engine.trend_metric()
(the same risk_type -> (field, direction) mapping predict_trend already
uses), so an intervention's target metric always matches what this app's
own trend forecasting already tracks for that risk_type -- no separate
asset-type-to-metric table to keep in sync.

Effect rates are plain Python constants, not a Snowflake table, per the
2026-07-25 design decision: they mirror risk_engine.py's own existing
threshold-as-Python-constant precedent, and only backend Python ever
consumes them (the agent only narrates the already-computed numbers), so
there's no need for them to be Snowflake-editable.

Unlike harvest_planner.py (which treats one /workflow/run tick as one
day, fine for a multi-day readiness ETA), this module computes an actual
hourly rate from the real elapsed time between the two most recent
ASSET_READINGS rows -- ticks are demo-triggered, not a strict daily
cadence, and an hourly what-if ("skip aeration tonight") needs a real
hourly rate, not an assumed one.
"""

from app.services import asset_simulator, projection, risk_engine

NO_ACTION = "no_action"

_HORIZONS_HOURS = (6, 24)

# field -> (low, high), from asset_simulator.metric_bounds() -- the same
# bounds the simulator itself never lets a reading cross. Unbounded linear
# extrapolation over a 24h horizon can otherwise project a physically
# impossible value (e.g. dissolved oxygen past its ~8 mg/L saturation
# ceiling) that would render straight into the UI's projection table, not
# just get glossed over by the agent's phrasing -- every risk_type this
# module maps an intervention for happens to draw its field from exactly
# one asset_type in practice, so a flat field->bounds lookup (not
# asset_type-keyed) is safe here.
_METRIC_BOUNDS = asset_simulator.metric_bounds()


def _clamp(value: float, field: str) -> float:
    bounds = _METRIC_BOUNDS.get(field)
    if bounds is None:
        return value
    low, high = bounds
    return max(low, min(high, value))

# risk_type -> {action_name: effect_per_hour on the same metric
# risk_engine.trend_metric(risk_type) tracks}. Sign matches that metric's
# own "worse" direction (e.g. a cooling action's effect on air_temp_c is
# negative; aeration's effect on dissolved_oxygen_mg_l is positive).
_INTERVENTION_EFFECTS: dict[str, dict[str, float]] = {
    "dissolved_oxygen": {"emergency_aeration": 0.8},
    "water_temperature": {"partial_water_exchange": -0.6},
    "heat_stress": {"activate_cooling_fans": -1.5},
    "feed_shortage": {"restock_feed": 8.0},
    "drought": {"irrigate": 5.0},
    "flood": {"drain_field": -6.0},
    "nutrient_deficiency": {"apply_nitrogen_fertilizer": 3.0},
    "disease": {"apply_fungicide": -4.0},
    "co2_depletion": {"open_vents_forced_air": 40.0},
}


def available_actions(risk_type: str) -> list[str]:
    """Real candidate interventions for this risk_type, plus the always-
    available 'do nothing' baseline."""
    return [NO_ACTION, *_INTERVENTION_EFFECTS.get(risk_type, {}).keys()]


def simulate(risk_type: str, current: dict, previous: dict | None, action: str) -> dict:
    """Returns {metric, current_value, baseline_delta_per_hour, action,
    action_effect_per_hour, projections: [{horizon_hours, without_action,
    with_action}]}, or {"error": ...} if this risk_type has no trend
    metric or there isn't enough reading history to compute a rate."""
    trend = risk_engine.trend_metric(risk_type)
    if trend is None:
        return {"error": f"No trend metric is tracked for risk_type '{risk_type}'."}
    field, _direction = trend

    curr_val, prev_val = current.get(field), (previous or {}).get(field)
    curr_ts, prev_ts = current.get("ts"), (previous or {}).get("ts")
    if curr_val is None or prev_val is None or curr_ts is None or prev_ts is None:
        return {"error": "Not enough reading history yet to project a trend."}

    elapsed_hours = (curr_ts - prev_ts).total_seconds() / 3600
    if elapsed_hours <= 0:
        return {"error": "The two most recent readings aren't far enough apart to compute a trend."}

    delta_per_hour = projection.delta(curr_val, prev_val) / elapsed_hours
    action_effect = 0.0 if action == NO_ACTION else _INTERVENTION_EFFECTS.get(risk_type, {}).get(action, 0.0)

    projections = []
    for hours in _HORIZONS_HOURS:
        without_action = _clamp(projection.project_forward(curr_val, delta_per_hour, hours), field)
        with_action = _clamp(projection.project_forward(curr_val, delta_per_hour + action_effect, hours), field)
        projections.append(
            {"horizon_hours": hours, "without_action": round(without_action, 2), "with_action": round(with_action, 2)}
        )

    return {
        "metric": field,
        "current_value": curr_val,
        "baseline_delta_per_hour": round(delta_per_hour, 3),
        "action": action,
        "action_effect_per_hour": action_effect,
        "projections": projections,
    }
