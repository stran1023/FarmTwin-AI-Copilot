"""Simulates realistic, evolving per-asset sensor readings.

No physical IoT exists for this build (see docs/FarmTwin-AI-Copilot.md's
"Simulated Data" section). Each call to next_reading() nudges every metric
from its *previous* value by a small bounded step rather than drawing a
fresh random value from scratch -- this is what makes readings look like a
continuous sensor stream (values drift, don't teleport) across repeated
/workflow/run calls, per the vision doc's "simulated data should behave
realistically over time."

dissolved_oxygen_mg_l gets one extra rule beyond the generic random walk:
a directional drift while the value is in a stressed or recovering range.
This isn't a scripted one-off -- it's a general "trend continues until it
crosses back into a stable band" rule -- but it's only wired up for DO
because that's the one asset-risk story the seed data (and demo narrative)
is built around; adding the same rule to every metric would be
over-engineering for a hackathon build.
"""

import random

GROWTH_STAGES = ["seedling", "vegetative", "reproductive", "ripening", "harvest_ready"]

ALL_READING_FIELDS = [
    "water_temp_c", "ph", "dissolved_oxygen_mg_l", "feed_level_pct", "biomass_kg",
    "air_temp_c", "humidity_pct", "water_l", "egg_count",
    "growth_stage", "soil_moisture_pct", "nitrogen_ppm", "irrigation_status",
    "disease_risk_pct", "harvest_readiness_pct", "co2_ppm",
]

# metric -> (min, max, step, drift). drift is a constant per-tick bias
# added before the random step; 0.0 means a pure bounded random walk.
_NUMERIC_METRICS: dict[str, dict[str, tuple[float, float, float, float]]] = {
    "fish_pond": {
        "water_temp_c": (24.0, 34.0, 0.4, 0.0),
        "ph": (6.5, 8.0, 0.1, 0.0),
        "dissolved_oxygen_mg_l": (2.0, 8.0, 0.25, 0.0),  # drift overridden below
        "feed_level_pct": (0.0, 100.0, 3.0, -1.5),
        "biomass_kg": (0.0, 1000.0, 4.0, 1.0),
    },
    "chicken_coop": {
        "air_temp_c": (18.0, 35.0, 0.5, 0.0),
        "humidity_pct": (40.0, 90.0, 2.0, 0.0),
        "feed_level_pct": (0.0, 100.0, 3.0, -2.0),
        "water_l": (0.0, 50.0, 1.5, -1.0),
    },
    "rice_field": {
        "soil_moisture_pct": (20.0, 100.0, 3.0, 0.0),
        "nitrogen_ppm": (0.0, 100.0, 2.0, -0.5),
    },
    "fruit_orchard": {
        "soil_moisture_pct": (20.0, 100.0, 3.0, 0.0),
        "disease_risk_pct": (0.0, 100.0, 2.0, 0.0),
        "harvest_readiness_pct": (0.0, 100.0, 1.5, 0.8),
    },
    "greenhouse": {
        "air_temp_c": (10.0, 40.0, 0.5, 0.0),
        "humidity_pct": (30.0, 95.0, 2.0, 0.0),
        "soil_moisture_pct": (20.0, 100.0, 3.0, 0.0),
        "co2_ppm": (200.0, 1000.0, 20.0, 0.0),
        "disease_risk_pct": (0.0, 100.0, 2.0, 0.0),
        "harvest_readiness_pct": (0.0, 100.0, 1.5, 0.8),
    },
}

_DEFAULT_SEEDS: dict[str, dict[str, float]] = {
    "fish_pond": {
        "water_temp_c": 27.0, "ph": 7.2, "dissolved_oxygen_mg_l": 6.0,
        "feed_level_pct": 70.0, "biomass_kg": 250.0,
    },
    "chicken_coop": {
        "air_temp_c": 26.0, "humidity_pct": 60.0,
        "feed_level_pct": 70.0, "water_l": 25.0, "egg_count": 38,
    },
    "rice_field": {"soil_moisture_pct": 65.0, "nitrogen_ppm": 45.0},
    "fruit_orchard": {"soil_moisture_pct": 55.0, "disease_risk_pct": 10.0, "harvest_readiness_pct": 20.0},
    "greenhouse": {
        "air_temp_c": 23.0, "humidity_pct": 60.0, "soil_moisture_pct": 55.0,
        "co2_ppm": 750.0, "disease_risk_pct": 10.0, "harvest_readiness_pct": 20.0,
    },
}


def _walk(value: float, low: float, high: float, step: float, drift: float) -> float:
    value += drift + random.uniform(-step, step)
    return round(max(low, min(high, value)), 2)


def _dissolved_oxygen_drift(current: float) -> float:
    """Trend continues while stressed or recovering; near-zero once stable."""
    if current < 4.0:
        return -0.15  # still declining under stress -- matches the seeded crisis
    if current > 6.0:
        return 0.1  # gentle pull back toward a healthy baseline
    return 0.0


def _next_growth_stage(current: str | None) -> str:
    if current not in GROWTH_STAGES:
        return GROWTH_STAGES[0]
    idx = GROWTH_STAGES.index(current)
    if idx < len(GROWTH_STAGES) - 1 and random.random() < 0.15:
        return GROWTH_STAGES[idx + 1]
    return current


def _next_irrigation_status(soil_moisture_pct: float) -> str:
    return "active" if soil_moisture_pct < 40.0 else "inactive"


def next_reading(asset_type: str, previous: dict | None) -> dict:
    """Generate the next tick's ASSET_READINGS row for one asset.

    `previous` is the asset's most recent ASSET_READINGS row (lowercase
    keys matching AssetReading's field names), or None if no prior reading
    exists. Fields not relevant to `asset_type` come back None, matching
    ASSET_READINGS' wide-nullable-column shape.
    """
    previous = previous or {}
    seeds = _DEFAULT_SEEDS.get(asset_type, {})
    row: dict = dict.fromkeys(ALL_READING_FIELDS)

    for metric, (low, high, step, drift) in _NUMERIC_METRICS.get(asset_type, {}).items():
        base = previous.get(metric)
        if base is None:
            base = seeds.get(metric, (low + high) / 2)
        base = float(base)
        if metric == "dissolved_oxygen_mg_l":
            drift = _dissolved_oxygen_drift(base)
        row[metric] = _walk(base, low, high, step, drift)

    if asset_type == "chicken_coop":
        base_eggs = previous.get("egg_count")
        base_eggs = seeds.get("egg_count", 35) if base_eggs is None else base_eggs
        row["egg_count"] = max(0, int(round(base_eggs)) + random.randint(-4, 4))

    if asset_type in ("rice_field", "fruit_orchard", "greenhouse"):
        row["growth_stage"] = _next_growth_stage(previous.get("growth_stage"))

    if asset_type in ("rice_field", "greenhouse"):
        row["irrigation_status"] = _next_irrigation_status(row["soil_moisture_pct"])

    return row
