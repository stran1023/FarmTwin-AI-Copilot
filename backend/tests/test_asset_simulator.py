"""Regression tests for app/services/asset_simulator.py -- the bounded
random-walk simulator standing in for real IoT (no physical sensors exist
for this build). Uses a fixed random seed per test so results are
reproducible, mirroring the seeded-RNG approach from feat-011's original
verification (see progress.md Session 011).
"""

import random

import pytest

from app.services.asset_simulator import (
    ALL_READING_FIELDS,
    GROWTH_STAGES,
    next_reading,
)


@pytest.fixture(autouse=True)
def _seed():
    random.seed(42)


class TestNextReadingBounds:
    @pytest.mark.parametrize(
        "asset_type,metric,low,high",
        [
            ("fish_pond", "water_temp_c", 24.0, 34.0),
            ("fish_pond", "ph", 6.5, 8.0),
            ("fish_pond", "dissolved_oxygen_mg_l", 2.0, 8.0),
            ("fish_pond", "feed_level_pct", 0.0, 100.0),
            ("fish_pond", "biomass_kg", 0.0, 1000.0),
            ("chicken_coop", "air_temp_c", 18.0, 35.0),
            ("chicken_coop", "humidity_pct", 40.0, 90.0),
            ("rice_field", "soil_moisture_pct", 20.0, 100.0),
            ("rice_field", "nitrogen_ppm", 0.0, 100.0),
            ("fruit_orchard", "disease_risk_pct", 0.0, 100.0),
            ("fruit_orchard", "harvest_readiness_pct", 0.0, 100.0),
        ],
    )
    def test_metric_stays_within_bounds_over_many_ticks(self, asset_type, metric, low, high):
        reading = None
        for _ in range(200):
            reading = next_reading(asset_type, reading)
            assert low <= reading[metric] <= high

    def test_irrelevant_fields_stay_null_per_asset_type(self):
        reading = next_reading("fish_pond", None)
        for field in ("air_temp_c", "egg_count", "growth_stage", "disease_risk_pct"):
            assert reading[field] is None
        assert set(ALL_READING_FIELDS) == set(reading.keys())


class TestDissolvedOxygenDrift:
    def test_stressed_do_trends_downward_not_randomly(self):
        reading = {"dissolved_oxygen_mg_l": 3.5}
        deltas = []
        for _ in range(20):
            nxt = next_reading("fish_pond", reading)
            deltas.append(nxt["dissolved_oxygen_mg_l"] - reading["dissolved_oxygen_mg_l"])
            reading = nxt
        # net drift should be negative on average while under the 4.0 stress line
        # (individual ticks can still bounce due to the random step).
        assert sum(deltas) < 0
        assert reading["dissolved_oxygen_mg_l"] <= 3.5

    def test_healthy_do_recovers_gently_toward_baseline(self):
        reading = {"dissolved_oxygen_mg_l": 7.0}
        for _ in range(10):
            reading = next_reading("fish_pond", reading)
        # should stay in a healthy band, not crash toward the floor.
        assert reading["dissolved_oxygen_mg_l"] >= 6.0


class TestGrowthStage:
    def test_growth_stage_never_skips_or_reverses(self):
        reading = None
        seen_indices = []
        for _ in range(200):
            reading = next_reading("rice_field", reading)
            idx = GROWTH_STAGES.index(reading["growth_stage"])
            if seen_indices:
                assert idx - seen_indices[-1] in (0, 1)
            seen_indices.append(idx)

    def test_unset_previous_starts_at_seedling(self):
        reading = next_reading("rice_field", None)
        assert reading["growth_stage"] == GROWTH_STAGES[0]

    def test_growth_stage_caps_at_harvest_ready(self):
        reading = {"growth_stage": GROWTH_STAGES[-1]}
        for _ in range(50):
            reading = next_reading("rice_field", reading)
            assert reading["growth_stage"] == GROWTH_STAGES[-1]


class TestIrrigationStatus:
    def test_active_when_soil_moisture_below_40(self):
        reading = next_reading("rice_field", {"soil_moisture_pct": 25.0})
        if reading["soil_moisture_pct"] < 40.0:
            assert reading["irrigation_status"] == "active"

    def test_inactive_when_soil_moisture_at_or_above_40(self):
        reading = next_reading("rice_field", {"soil_moisture_pct": 80.0})
        if reading["soil_moisture_pct"] >= 40.0:
            assert reading["irrigation_status"] == "inactive"


class TestEggCount:
    def test_egg_count_never_negative(self):
        reading = {"egg_count": 2}
        for _ in range(100):
            reading = next_reading("chicken_coop", reading)
            assert reading["egg_count"] >= 0

    def test_egg_count_seeds_from_default_when_missing(self):
        reading = next_reading("chicken_coop", None)
        assert reading["egg_count"] is not None
        assert reading["egg_count"] >= 0
