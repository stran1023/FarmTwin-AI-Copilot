"""Regression tests for harvest_planner.py's deterministic readiness-ETA
math (feat-054). Pins the two distinct projection shapes: continuous
harvest_readiness_pct trend (fruit_orchard/greenhouse) vs. discrete
growth_stage expected-value (rice_field) -- see harvest_planner.py's
module docstring for why they differ.
"""

from app.services.harvest_planner import plan_harvest


class TestReadinessPctBasis:
    def test_ready_now_when_at_threshold(self):
        plan = plan_harvest(
            "fruit_orchard",
            {"harvest_readiness_pct": 85.0},
            {"harvest_readiness_pct": 83.0},
            {"min_readiness_pct": 85.0},
        )
        assert plan["is_ready"] is True
        assert plan["basis"] == "readiness_pct"
        assert "85.0%" in plan["eta_description"]

    def test_ready_now_when_above_threshold(self):
        plan = plan_harvest(
            "greenhouse",
            {"harvest_readiness_pct": 92.0},
            {"harvest_readiness_pct": 90.0},
            {"min_readiness_pct": 80.0},
        )
        assert plan["is_ready"] is True

    def test_projects_eta_when_below_threshold_and_rising(self):
        plan = plan_harvest(
            "fruit_orchard",
            {"harvest_readiness_pct": 60.0},
            {"harvest_readiness_pct": 58.0},
            {"min_readiness_pct": 85.0},
        )
        assert plan["is_ready"] is False
        assert plan["basis"] == "readiness_pct"
        # (85 - 60) / 2 = 12.5 days
        assert "12.5" in plan["eta_description"]

    def test_no_eta_when_flat_or_falling(self):
        plan = plan_harvest(
            "fruit_orchard",
            {"harvest_readiness_pct": 60.0},
            {"harvest_readiness_pct": 62.0},
            {"min_readiness_pct": 85.0},
        )
        assert plan["is_ready"] is False
        assert "isn't trending upward" in plan["eta_description"]

    def test_no_eta_without_previous_reading(self):
        plan = plan_harvest(
            "greenhouse",
            {"harvest_readiness_pct": 40.0},
            None,
            {"min_readiness_pct": 80.0},
        )
        assert plan["is_ready"] is False
        assert "not enough history" in plan["eta_description"]

    def test_missing_current_reading_is_insufficient_data(self):
        plan = plan_harvest("greenhouse", {}, None, {"min_readiness_pct": 80.0})
        assert plan["basis"] == "insufficient_data"


class TestGrowthStageBasis:
    def test_ready_now_at_ready_stage(self):
        plan = plan_harvest(
            "rice_field",
            {"growth_stage": "harvest_ready"},
            None,
            {"ready_growth_stage": "harvest_ready"},
        )
        assert plan["is_ready"] is True
        assert plan["basis"] == "growth_stage"

    def test_projects_expected_days_for_remaining_stages(self):
        # seedling -> vegetative -> reproductive -> ripening -> harvest_ready = 4 remaining
        plan = plan_harvest(
            "rice_field",
            {"growth_stage": "seedling"},
            None,
            {"ready_growth_stage": "harvest_ready"},
        )
        assert plan["is_ready"] is False
        assert plan["basis"] == "growth_stage"
        # 4 stages / 0.15 probability = 26.7 days
        assert "26.7" in plan["eta_description"]

    def test_one_stage_remaining(self):
        plan = plan_harvest(
            "rice_field",
            {"growth_stage": "ripening"},
            None,
            {"ready_growth_stage": "harvest_ready"},
        )
        assert plan["is_ready"] is False
        # 1 / 0.15 = 6.7 days
        assert "6.7" in plan["eta_description"]

    def test_unknown_current_stage_is_insufficient_data(self):
        plan = plan_harvest(
            "rice_field",
            {"growth_stage": None},
            None,
            {"ready_growth_stage": "harvest_ready"},
        )
        assert plan["is_ready"] is False
        assert "Not enough growth-stage data" in plan["eta_description"]

    def test_missing_rule_is_insufficient_data(self):
        plan = plan_harvest("rice_field", {"growth_stage": "seedling"}, None, {})
        assert plan["basis"] == "insufficient_data"
