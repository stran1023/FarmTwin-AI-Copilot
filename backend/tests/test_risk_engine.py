"""Regression tests for the rule-based Understand/Predict stage
(app/services/risk_engine.py). Thresholds mirror what FARM_OPS_AGENT was
itself instructed to use (snowflake/coco-prompts.md Part 2 prompt 4) --
these tests pin that contract in code so a future edit can't silently
drift the two apart.
"""

from app.services.risk_engine import assess_risk, predict_trend


class TestAssessRiskFishPond:
    def test_dissolved_oxygen_critical_below_3_5(self):
        risk_type, level, notes = assess_risk("fish_pond", {"dissolved_oxygen_mg_l": 3.4})
        assert risk_type == "dissolved_oxygen"
        assert level == "critical"
        assert "3.4" in notes

    def test_dissolved_oxygen_high_between_3_5_and_5_0(self):
        _, level, _ = assess_risk("fish_pond", {"dissolved_oxygen_mg_l": 4.2})
        assert level == "high"

    def test_dissolved_oxygen_medium_between_5_0_and_6_0(self):
        _, level, _ = assess_risk("fish_pond", {"dissolved_oxygen_mg_l": 5.8})
        assert level == "medium"

    def test_dissolved_oxygen_healthy_at_or_above_6_0(self):
        risk_type, level, _ = assess_risk("fish_pond", {"dissolved_oxygen_mg_l": 6.0})
        assert risk_type == "none"
        assert level == "low"

    def test_water_temperature_high_above_32(self):
        risk_type, level, _ = assess_risk("fish_pond", {"water_temp_c": 33.1})
        assert risk_type == "water_temperature"
        assert level == "high"

    def test_water_temperature_not_flagged_at_32(self):
        risk_type, _, _ = assess_risk("fish_pond", {"water_temp_c": 32.0})
        assert risk_type == "none"

    def test_most_severe_candidate_wins(self):
        # critical DO should outrank a simultaneous high water-temperature reading.
        risk_type, level, _ = assess_risk(
            "fish_pond", {"dissolved_oxygen_mg_l": 3.0, "water_temp_c": 33.0}
        )
        assert risk_type == "dissolved_oxygen"
        assert level == "critical"

    def test_missing_fields_do_not_crash(self):
        risk_type, level, _ = assess_risk("fish_pond", {})
        assert risk_type == "none"
        assert level == "low"


class TestAssessRiskChickenCoop:
    def test_heat_stress_above_32(self):
        risk_type, level, _ = assess_risk("chicken_coop", {"air_temp_c": 32.5})
        assert risk_type == "heat_stress"
        assert level == "high"

    def test_feed_shortage_below_15_pct(self):
        risk_type, level, _ = assess_risk("chicken_coop", {"feed_level_pct": 10.0})
        assert risk_type == "feed_shortage"
        assert level == "high"

    def test_healthy_reading_flags_nothing(self):
        risk_type, _, _ = assess_risk(
            "chicken_coop", {"air_temp_c": 26.0, "feed_level_pct": 70.0}
        )
        assert risk_type == "none"


class TestAssessRiskRiceField:
    def test_drought_below_30_pct_moisture(self):
        risk_type, level, _ = assess_risk("rice_field", {"soil_moisture_pct": 25.0})
        assert risk_type == "drought"
        assert level == "high"

    def test_flood_above_90_pct_moisture(self):
        risk_type, level, _ = assess_risk("rice_field", {"soil_moisture_pct": 95.0})
        assert risk_type == "flood"
        assert level == "high"

    def test_nutrient_deficiency_below_10_ppm(self):
        risk_type, level, _ = assess_risk("rice_field", {"nitrogen_ppm": 5.0})
        assert risk_type == "nutrient_deficiency"
        assert level == "medium"

    def test_drought_outranks_nutrient_deficiency(self):
        risk_type, _, _ = assess_risk(
            "rice_field", {"soil_moisture_pct": 20.0, "nitrogen_ppm": 5.0}
        )
        assert risk_type == "drought"


class TestAssessRiskFruitOrchard:
    def test_disease_critical_above_40_pct(self):
        risk_type, level, _ = assess_risk("fruit_orchard", {"disease_risk_pct": 45.0})
        assert risk_type == "disease"
        assert level == "critical"

    def test_disease_high_between_20_and_40_pct(self):
        _, level, _ = assess_risk("fruit_orchard", {"disease_risk_pct": 25.0})
        assert level == "high"

    def test_disease_not_flagged_at_or_below_20_pct(self):
        risk_type, _, _ = assess_risk("fruit_orchard", {"disease_risk_pct": 20.0})
        assert risk_type == "none"


class TestAssessRiskGreenhouse:
    def test_disease_critical_above_40_pct(self):
        risk_type, level, _ = assess_risk("greenhouse", {"disease_risk_pct": 45.0})
        assert risk_type == "disease"
        assert level == "critical"

    def test_disease_medium_when_humid_and_elevated(self):
        risk_type, level, _ = assess_risk(
            "greenhouse", {"disease_risk_pct": 34.0, "humidity_pct": 90.0}
        )
        assert risk_type == "disease"
        assert level == "medium"

    def test_disease_not_flagged_when_humidity_normal(self):
        risk_type, _, _ = assess_risk(
            "greenhouse", {"disease_risk_pct": 25.0, "humidity_pct": 60.0}
        )
        assert risk_type == "none"

    def test_co2_depletion_below_400(self):
        risk_type, level, notes = assess_risk("greenhouse", {"co2_ppm": 260.0})
        assert risk_type == "co2_depletion"
        assert level == "medium"
        assert "260" in notes

    def test_co2_not_flagged_at_or_above_400(self):
        risk_type, _, _ = assess_risk("greenhouse", {"co2_ppm": 400.0})
        assert risk_type == "none"

    def test_critical_disease_outranks_co2_depletion(self):
        risk_type, level, _ = assess_risk(
            "greenhouse", {"disease_risk_pct": 45.0, "co2_ppm": 260.0}
        )
        assert risk_type == "disease"
        assert level == "critical"

    def test_seeded_gh001_compound_stress_reading(self):
        # Real seeded GH-001 values from snowflake/coco-prompts.md Part 3
        # (humidity 90%, co2 260ppm, disease 34%) should land at "medium"
        # (needs_attention), not critical -- the whole point of the story.
        risk_type, level, _ = assess_risk(
            "greenhouse",
            {"humidity_pct": 90.0, "co2_ppm": 260.0, "disease_risk_pct": 34.0},
        )
        assert level == "medium"
        assert risk_type in ("disease", "co2_depletion")


class TestPredictTrend:
    def test_no_previous_reading_returns_none(self):
        assert predict_trend("dissolved_oxygen", {"dissolved_oxygen_mg_l": 3.0}, None) is None

    def test_unrelated_risk_type_returns_none(self):
        assert (
            predict_trend("none", {"dissolved_oxygen_mg_l": 3.0}, {"dissolved_oxygen_mg_l": 4.0})
            is None
        )

    def test_worsening_lower_worse_metric_predicts(self):
        text = predict_trend(
            "dissolved_oxygen",
            {"dissolved_oxygen_mg_l": 3.0},
            {"dissolved_oxygen_mg_l": 3.5},
        )
        assert text is not None
        assert "3.5 to 3.0" in text
        # linear projection: delta -0.5, next = 3.0 + (-0.5) = 2.5
        assert "2.5" in text

    def test_improving_lower_worse_metric_returns_none(self):
        assert (
            predict_trend(
                "dissolved_oxygen",
                {"dissolved_oxygen_mg_l": 4.0},
                {"dissolved_oxygen_mg_l": 3.5},
            )
            is None
        )

    def test_worsening_higher_worse_metric_predicts(self):
        text = predict_trend(
            "disease", {"disease_risk_pct": 45.0}, {"disease_risk_pct": 40.0}
        )
        assert text is not None
        assert "40.0 to 45.0" in text

    def test_stable_metric_returns_none(self):
        assert (
            predict_trend(
                "dissolved_oxygen",
                {"dissolved_oxygen_mg_l": 3.5},
                {"dissolved_oxygen_mg_l": 3.5},
            )
            is None
        )

    def test_missing_field_in_either_reading_returns_none(self):
        assert predict_trend("dissolved_oxygen", {}, {"dissolved_oxygen_mg_l": 3.5}) is None
        assert predict_trend("dissolved_oxygen", {"dissolved_oxygen_mg_l": 3.0}, {}) is None
