"""Regression tests for app/main.py's _clean_agent_answer() and its
helpers -- FARM_OPS_AGENT's raw responses sometimes carry the agent's own
tool-call narration ahead of the real answer, in shapes discovered and
fixed one at a time across Sessions 011-014, feat-040, and feat-042 (see
progress.md), but never before pinned down as a committed, repeatable
test. Every case here reconstructs a documented shape from that history so
a future prompt/parsing change can't silently regress a previously-fixed
leak.
"""

from app.main import _clean_agent_answer


class TestExplicitAnswerTag:
    def test_strips_everything_before_answer_tag(self):
        # No closing </answer> tag: real captured samples never included one
        # (see app/main.py's _clean_agent_answer -- only the opening tag is
        # ever matched), so this fixture matches the shape the function was
        # actually built to handle rather than a hypothetical one.
        raw = (
            "I'll query the semantic view for FP-001's latest readings.\n"
            "<answer>Dissolved oxygen has crashed to 2.0 mg/L, well below "
            "the 3.5 mg/L critical threshold."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned == (
            "Dissolved oxygen has crashed to 2.0 mg/L, well below "
            "the 3.5 mg/L critical threshold."
        )
        assert "I'll query" not in cleaned


class TestMarkdownHeadingShape:
    def test_strips_narration_running_into_a_heading(self):
        raw = (
            "Let me pull the current risk assessments for every asset."
            "\n## Today's Farm Summary\nAll four assets have been reviewed."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned.startswith("## Today's Farm Summary")
        assert "Let me pull" not in cleaned


class TestGluedBoundaryShape:
    """feat-040: narration glued directly onto the real answer with zero
    separating whitespace, e.g. '...pull the driving risks.Today's
    recommendation activity...'."""

    def test_strips_narration_glued_to_capitalized_answer(self):
        raw = (
            "Only one recommendation matched today's date exactly. Let me "
            "broaden to recent recommendations to capture the full picture "
            "of active risks.Today's recommendation activity is entirely "
            "concentrated on Tilapia Pond A."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned == (
            "Today's recommendation activity is entirely concentrated on "
            "Tilapia Pond A."
        )

    def test_glued_boundary_does_not_fire_on_a_decimal_number(self):
        raw = "Dissolved oxygen is at 3.5mg/L, a real reading, not narration."
        cleaned = _clean_agent_answer(raw)
        assert cleaned == raw

    def test_glued_boundary_requires_uppercase_or_bold_follower(self):
        # lowercase-follows-period should never be treated as a seam.
        raw = "the pond is stable.this stays untouched because it's lowercase"
        cleaned = _clean_agent_answer(raw)
        assert cleaned == raw


class TestContentBasedNarrationShape:
    """feat-042: narration spread across multiple normally-spaced sentences
    with no glued boundary and no lead-in phrase in the very first
    sentence -- only a later sentence in the block reveals it, or it leaks
    a raw snake_case Snowflake field name."""

    def test_strips_multi_sentence_narration_with_no_glued_seam(self):
        raw = (
            "Every decided recommendation belongs to Tilapia Pond A "
            "(FP-001). Filtering to items actually approved or rejected "
            "today (approved_at on 2026-07-15) yields the single approved "
            "item; but the user asked about today's decisions broadly, so "
            "I'll summarize the decisions made in this active FP-001 "
            "crisis window. All approved and rejected recommendations "
            "today concern Tilapia Pond A's dissolved oxygen crisis."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned == (
            "All approved and rejected recommendations today concern "
            "Tilapia Pond A's dissolved oxygen crisis."
        )

    def test_first_sentence_alone_has_no_signal_only_second_does(self):
        # a bare "stop at first non-matching sentence" strategy would fail
        # this case -- the window must scan to the LAST match, not the first.
        raw = (
            "Only one recommendation matched today's date exactly. Let me "
            "broaden to recent days to ensure I capture the full context. "
            "Today's overview covers every asset currently at elevated risk."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned == "Today's overview covers every asset currently at elevated risk."

    def test_field_name_leak_alone_is_enough_signal(self):
        raw = (
            "Checking the approved_at column for today's date range. "
            "Tilapia Pond A remains the farm's only critical asset."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned == "Tilapia Pond A remains the farm's only critical asset."


class TestNegativeCases:
    def test_already_clean_answer_passes_through_unchanged(self):
        raw = (
            "Today's activity is dominated entirely by Tilapia Pond A "
            "(FP-001), whose dissolved oxygen fell to 2.0 mg/L overnight."
        )
        assert _clean_agent_answer(raw) == raw

    def test_filtration_is_not_confused_with_filtering_to_for(self):
        raw = "Improved water filtration reduced ammonia buildup this week."
        assert _clean_agent_answer(raw) == raw

    def test_idempotent_on_its_own_output(self):
        raw = (
            "Only one recommendation matched today's date exactly. Let me "
            "broaden.Today's summary covers the whole farm."
        )
        once = _clean_agent_answer(raw)
        twice = _clean_agent_answer(once)
        assert once == twice


class TestScanWindowBound:
    def test_narration_signal_deep_in_a_long_legitimate_answer_is_not_stripped(self):
        # the scan window is capped at 4 sentences specifically so a long,
        # legitimate multi-asset answer can't have a later sentence
        # mis-stripped just because it happens to contain a signal word.
        raw = (
            "Tilapia Pond A is critical. Layer House North is healthy. "
            "Mango Grove West is healthy. Paddy Block East is healthy. "
            "As a next step, let me know if you want a deeper look at any "
            "single asset."
        )
        cleaned = _clean_agent_answer(raw)
        assert cleaned == raw
