"""Regression tests for app/services/recommendation_parser.py -- parses
FARM_OPS_AGENT's structured markdown into recommendation dicts. Shapes
below mirror real captured agent output (see feat-009/feat-012 evidence in
feature_list.json) rather than an idealized format.
"""

from app.services.recommendation_parser import parse_recommendations

SINGLE_BLOCK = """
**Recommendation**: Stop feeding at once and resume only after DO is sustained above 5.0 mg/L.
**Reason**: Dissolved oxygen has crashed to 2.0 mg/L, well below the 3.5 mg/L critical threshold.
**Evidence**: DO readings declined from 3.1 to 2.0 mg/L over the last 3 ticks; Q4-2024 history shows a similar crash preceded a 40% stock loss.
**Priority**: High
**Expected Impact**: Prevents further oxygen depletion from digestion, buying time for aeration to recover levels.
**Confidence**: 92%
"""

TWO_BLOCKS = SINGLE_BLOCK + """
**Recommendation**: Perform a 20-30% partial water exchange today with cooler, well-oxygenated source water.
**Reason**: Direct water replacement is the fastest way to raise DO without waiting on aerators alone.
**Evidence**: Aerators alone have not reversed the decline over the last 2 ticks.
**Priority**: high
**Expected Impact**: Immediate DO increase, reducing acute mortality risk within hours.
**Confidence**: 85 percent
"""


class TestParseRecommendations:
    def test_single_block_extracts_all_six_fields(self):
        recs = parse_recommendations(SINGLE_BLOCK)
        assert len(recs) == 1
        rec = recs[0]
        assert rec["recommendation"].startswith("Stop feeding at once")
        assert "2.0 mg/L" in rec["reason"]
        assert "Q4-2024" in rec["evidence"]
        assert rec["priority"] == "high"
        assert "aeration" in rec["expected_impact"]
        assert rec["confidence_pct"] == 92.0

    def test_confidence_percent_extracted_from_prose(self):
        recs = parse_recommendations(TWO_BLOCKS)
        assert recs[1]["confidence_pct"] == 85.0

    def test_two_blocks_split_on_repeated_recommendation_label(self):
        recs = parse_recommendations(TWO_BLOCKS)
        assert len(recs) == 2
        assert "Stop feeding" in recs[0]["recommendation"]
        assert "water exchange" in recs[1]["recommendation"]

    def test_priority_lowercased(self):
        recs = parse_recommendations(TWO_BLOCKS)
        assert recs[0]["priority"] == "high"
        assert recs[1]["priority"] == "high"

    def test_unrecognized_priority_falls_back_to_medium(self):
        text = SINGLE_BLOCK.replace("**Priority**: High", "**Priority**: Urgent!!")
        recs = parse_recommendations(text)
        assert recs[0]["priority"] == "medium"

    def test_incomplete_trailing_block_is_skipped(self):
        text = SINGLE_BLOCK + "\n**Recommendation**: Monitor overnight.\n**Reason**: Ongoing risk.\n"
        recs = parse_recommendations(text)
        # the trailing block is missing Evidence/Priority/Expected Impact/Confidence
        assert len(recs) == 1

    def test_no_recommendations_in_plain_prose_returns_empty(self):
        assert parse_recommendations("Everything on the farm looks healthy today.") == []

    def test_tolerant_of_missing_colon_after_label(self):
        text = SINGLE_BLOCK.replace("**Recommendation**:", "**Recommendation**")
        recs = parse_recommendations(text)
        assert len(recs) == 1
        assert recs[0]["recommendation"].startswith("Stop feeding at once")

    def test_confidence_without_digits_defaults_to_zero(self):
        text = SINGLE_BLOCK.replace("**Confidence**: 92%", "**Confidence**: very high")
        recs = parse_recommendations(text)
        assert recs[0]["confidence_pct"] == 0.0
