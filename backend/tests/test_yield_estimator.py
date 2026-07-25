"""Regression tests for yield_estimator.py's deterministic yield-estimate
math (feat-056): baseline = mean(historical yield records) * (health_score
/ 100), plus the sample-size confidence heuristic.
"""

from app.services.yield_estimator import estimate_yield, yield_metric_for


class TestYieldMetricFor:
    def test_all_five_asset_types_have_a_metric(self):
        for asset_type in ("fish_pond", "chicken_coop", "rice_field", "fruit_orchard", "greenhouse"):
            assert yield_metric_for(asset_type) is not None

    def test_unknown_asset_type_has_no_metric(self):
        assert yield_metric_for("not_a_real_type") is None


class TestEstimateYield:
    def test_unknown_asset_type_errors(self):
        result = estimate_yield("not_a_real_type", [100.0], 90)
        assert "error" in result

    def test_no_history_errors(self):
        result = estimate_yield("fish_pond", [], 90)
        assert "error" in result

    def test_full_health_estimate_equals_baseline(self):
        # health_score 100 -> no discount, estimate == mean(history).
        result = estimate_yield("fish_pond", [285.0, 310.0, 145.0], 100)
        assert result["baseline"] == 246.67
        assert result["estimated_yield"] == 246.67
        assert result["metric"] == "biomass_kg_harvested"
        assert result["unit"] == "kg"

    def test_degraded_health_discounts_the_estimate(self):
        # health_score 60 -> 60% of the historical baseline.
        result = estimate_yield("fish_pond", [285.0, 310.0, 145.0], 60)
        assert result["estimated_yield"] == round(246.67 * 0.6, 2)
        assert result["estimated_yield"] < result["baseline"]

    def test_single_historical_record_is_the_baseline(self):
        result = estimate_yield("greenhouse", [320.0], 90)
        assert result["baseline"] == 320.0
        assert result["sample_size"] == 1

    def test_confidence_increases_with_sample_size(self):
        one = estimate_yield("chicken_coop", [3780.0], 90)
        two = estimate_yield("chicken_coop", [3780.0, 3650.0], 90)
        three = estimate_yield("chicken_coop", [3780.0, 3650.0, 3820.0], 90)
        assert one["confidence_pct"] < two["confidence_pct"] < three["confidence_pct"]

    def test_confidence_caps_at_three_or_more_records(self):
        three = estimate_yield("rice_field", [4.8, 3.9, 5.1], 90)
        four = estimate_yield("rice_field", [4.8, 3.9, 5.1, 4.5], 90)
        assert three["confidence_pct"] == four["confidence_pct"]

    def test_all_five_asset_types_produce_a_metric_and_unit(self):
        expected = {
            "fish_pond": ("biomass_kg_harvested", "kg"),
            "chicken_coop": ("eggs_produced", "eggs"),
            "rice_field": ("yield_tons_per_ha", "tons/ha"),
            "fruit_orchard": ("fruit_production_tons", "tons"),
            "greenhouse": ("vegetable_yield_kg", "kg"),
        }
        for asset_type, (metric, unit) in expected.items():
            result = estimate_yield(asset_type, [10.0], 90)
            assert result["metric"] == metric
            assert result["unit"] == unit
