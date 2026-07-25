"""Shared linear-projection math for "if this trend continues" estimates.

risk_engine.predict_trend, harvest_planner.plan_harvest, and
scenario_engine.simulate all project a metric forward from its recent
per-reading delta -- kept in one place so this repo's three call sites
don't each compute the same arithmetic slightly differently.
"""


def delta(current: float, previous: float) -> float:
    """Change since the previous reading (positive = increasing)."""
    return current - previous


def project_forward(current: float, delta_per_reading: float, steps: float) -> float:
    """Project a metric `steps` reading-intervals ahead, assuming the same
    per-reading delta continues linearly."""
    return current + delta_per_reading * steps


def steps_until_threshold(current: float, delta_per_reading: float, threshold: float) -> float | None:
    """How many reading-intervals until `current` reaches `threshold`,
    assuming `delta_per_reading` continues linearly. Returns None if the
    trend is flat or moving away from the threshold (no ETA to project)."""
    if delta_per_reading == 0:
        return None
    steps = (threshold - current) / delta_per_reading
    return steps if steps > 0 else None
