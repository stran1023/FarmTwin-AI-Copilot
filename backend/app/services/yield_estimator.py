"""Yield Estimation: projects this cycle's expected harvest output from an
asset's own real historical yield record, adjusted for its current health
condition -- same deterministic-Python-then-agent-narrates split as
harvest_planner.py and scenario_engine.py (see feature_list.json
feat-056's notes for why: this app never lets the Cortex Agent compute a
number, only explain one).

Unlike Harvest Planner (crop assets only, gated on a HARVEST_RULES
threshold) or Scenario Simulator (only assets with an active risk),
Yield Estimation applies to all 5 asset types -- every one already has
real per-cycle yield history in ASSET_HISTORY (fish harvest weight, egg
production, rice/orchard/greenhouse yield), seeded via CoCo and confirmed
live (2026-07-27): FP-001 (3 records), CC-001 (3), RF-001 (3), FO-001
(3), GH-001 (3).

The estimate is deliberately simple and explainable, not a fitted model:
    estimate = mean(this asset's own historical yield records)
               * (current health_score / 100)
A fancier model (weighted-recent, regression) would be overfitting on the
2-3 historical records this demo data actually has. Confidence is a
sample-size heuristic, not a statistical one, for the same reason.
"""

# asset_type -> (ASSET_HISTORY.metric_name, unit label)
_YIELD_METRIC_BY_TYPE: dict[str, tuple[str, str]] = {
    "fish_pond": ("biomass_kg_harvested", "kg"),
    "chicken_coop": ("eggs_produced", "eggs"),
    "rice_field": ("yield_tons_per_ha", "tons/ha"),
    "fruit_orchard": ("fruit_production_tons", "tons"),
    "greenhouse": ("vegetable_yield_kg", "kg"),
}

# Sample-size confidence heuristic -- deliberately coarse (see module
# docstring): more historical cycles to average over is more trustworthy,
# but this is not claiming statistical rigor.
_CONFIDENCE_BY_SAMPLE_SIZE = {1: 60.0, 2: 70.0}
_CONFIDENCE_AT_OR_ABOVE_3 = 80.0


def yield_metric_for(asset_type: str) -> tuple[str, str] | None:
    """Public accessor: (ASSET_HISTORY.metric_name, unit) for this asset
    type, or None if yield estimation doesn't apply."""
    return _YIELD_METRIC_BY_TYPE.get(asset_type)


def _confidence_for_sample_size(n: int) -> float:
    if n >= 3:
        return _CONFIDENCE_AT_OR_ABOVE_3
    return _CONFIDENCE_BY_SAMPLE_SIZE.get(n, 0.0)


def estimate_yield(asset_type: str, historical_values: list[float], health_score: int) -> dict:
    """Returns {metric, unit, baseline, health_score, estimated_yield,
    confidence_pct, sample_size}, or {"error": ...} if this asset_type
    has no yield metric or there's no historical data yet."""
    metric = _YIELD_METRIC_BY_TYPE.get(asset_type)
    if metric is None:
        return {"error": f"No yield metric is tracked for asset_type '{asset_type}'."}
    metric_name, unit = metric

    if not historical_values:
        return {"error": "No historical yield data recorded yet for this asset."}

    baseline = sum(historical_values) / len(historical_values)
    estimated_yield = round(baseline * (health_score / 100), 2)

    return {
        "metric": metric_name,
        "unit": unit,
        "baseline": round(baseline, 2),
        "health_score": health_score,
        "estimated_yield": estimated_yield,
        "confidence_pct": _confidence_for_sample_size(len(historical_values)),
        "sample_size": len(historical_values),
    }
