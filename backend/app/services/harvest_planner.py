"""Harvest Planner ("Predict" stage for crop readiness): projects when a
rice_field/fruit_orchard/greenhouse asset will cross its HARVEST_RULES
readiness threshold, using the same deterministic-Python-then-agent-
narrates split as risk_engine.predict_trend. Per feature_list.json
feat-054's notes, this ETA math is deliberately kept out of the Cortex
Agent's own reasoning -- multi-step numeric extrapolation is a weaker
spot for LLM reasoning than the single-value comparisons feat-044 (the
withdrawal-period date check) relies on.

Two distinct cases, driven by asset_simulator.py's real per-type fields:
  - fruit_orchard / greenhouse: harvest_readiness_pct is a continuous
    metric that climbs each tick (see asset_simulator._NUMERIC_METRICS),
    so its ETA is a linear rate-of-change projection against
    HARVEST_RULES.min_readiness_pct.
  - rice_field: has no harvest_readiness_pct column at all (omitted from
    asset_simulator._NUMERIC_METRICS for that type) -- only a discrete
    5-stage growth_stage that advances with a fixed 15% probability per
    tick (asset_simulator._next_growth_stage), so its ETA is an
    expected-value estimate over remaining stage transitions, not a
    linear projection.

One /workflow/run tick is treated as one day, matching this app's own
"daily workflow" / DailyBriefing framing elsewhere in the codebase.
"""

from app.services import asset_simulator, projection

# Mirrors asset_simulator._next_growth_stage's fixed per-tick advance
# probability -- if that constant ever changes, this estimate should too.
_GROWTH_STAGE_ADVANCE_PROBABILITY = 0.15

_READINESS_METRIC_BY_TYPE = {
    "fruit_orchard": "harvest_readiness_pct",
    "greenhouse": "harvest_readiness_pct",
}


def _remaining_growth_stages(current_stage: str | None, ready_stage: str) -> int | None:
    stages = asset_simulator.GROWTH_STAGES
    if current_stage not in stages or ready_stage not in stages:
        return None
    return max(0, stages.index(ready_stage) - stages.index(current_stage))


def plan_harvest(asset_type: str, current: dict, previous: dict | None, rule: dict) -> dict:
    """Returns {is_ready, eta_description, basis}. `rule` is the asset
    type's HARVEST_RULES row (ready_growth_stage, min_readiness_pct,
    description)."""
    metric = _READINESS_METRIC_BY_TYPE.get(asset_type)
    if metric:
        return _plan_by_readiness_pct(current, previous, metric, rule.get("min_readiness_pct"))
    return _plan_by_growth_stage(current, rule.get("ready_growth_stage"))


def _plan_by_readiness_pct(current: dict, previous: dict | None, metric: str, threshold: float | None) -> dict:
    current_val = current.get(metric)
    if current_val is None or threshold is None:
        return {"is_ready": False, "eta_description": "Not enough data yet.", "basis": "insufficient_data"}

    if current_val >= threshold:
        return {
            "is_ready": True,
            "eta_description": f"Ready now -- {current_val}% readiness meets the {threshold}% threshold.",
            "basis": "readiness_pct",
        }

    previous_val = (previous or {}).get(metric)
    if previous_val is None:
        return {
            "is_ready": False,
            "eta_description": (
                f"Currently {current_val}% readiness (threshold {threshold}%); "
                "not enough history yet to project an ETA."
            ),
            "basis": "readiness_pct",
        }

    trend = projection.delta(current_val, previous_val)
    days = projection.steps_until_threshold(current_val, trend, threshold)
    if days is None:
        return {
            "is_ready": False,
            "eta_description": (
                f"Currently {current_val}% readiness (threshold {threshold}%); "
                "readiness isn't trending upward, so no reliable ETA can be projected."
            ),
            "basis": "readiness_pct",
        }
    return {
        "is_ready": False,
        "eta_description": (
            f"Currently {current_val}% readiness, rising ~{round(trend, 2)}%/day. "
            f"At that rate, approximately {round(days, 1)} day(s) until the {threshold}% threshold."
        ),
        "basis": "readiness_pct",
    }


def _plan_by_growth_stage(current: dict, ready_stage: str | None) -> dict:
    current_stage = current.get("growth_stage")
    if not ready_stage:
        return {"is_ready": False, "eta_description": "Not enough data yet.", "basis": "insufficient_data"}

    if current_stage == ready_stage:
        return {
            "is_ready": True,
            "eta_description": f"Ready now -- already at the '{ready_stage}' growth stage.",
            "basis": "growth_stage",
        }

    remaining = _remaining_growth_stages(current_stage, ready_stage)
    if not remaining:
        return {"is_ready": False, "eta_description": "Not enough growth-stage data yet to project an ETA.", "basis": "growth_stage"}

    expected_days = round(remaining / _GROWTH_STAGE_ADVANCE_PROBABILITY, 1)
    return {
        "is_ready": False,
        "eta_description": (
            f"Currently at '{current_stage}', {remaining} stage(s) before '{ready_stage}'. "
            f"At this asset type's typical advancement rate, approximately {expected_days} day(s) expected."
        ),
        "basis": "growth_stage",
    }
