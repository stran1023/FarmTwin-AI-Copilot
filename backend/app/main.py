import re
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.schemas import (
    ApprovalRequest,
    AssetDetail,
    AssetHistory,
    AssetOverview,
    AssetReading,
    AssetRisk,
    AssetStatusSummary,
    BriefingToday,
    CopilotAnswer,
    CopilotQuestion,
    DailyBriefing,
    DashboardSummary,
    DemoUnlockRequest,
    DemoUnlockResponse,
    HarvestPlan,
    Recommendation,
    ScenarioRequest,
    ScenarioResult,
    WeatherReading,
    YieldEstimate,
)
from app.services import (
    asset_simulator,
    cortex_agent_client,
    demo_auth,
    harvest_planner,
    recommendation_parser,
    risk_engine,
    scenario_engine,
    snowflake_client,
    weather_client,
    yield_estimator,
)

app = FastAPI(title="FarmTwin AI Copilot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


def require_demo_access(x_demo_token: str | None = Header(default=None)):
    """Depends()-guard for endpoints that trigger a real Cortex Agent call.

    No-op when DEMO_PASSCODE isn't configured (local dev, every test in this
    repo) -- only enforced once a deployment sets a real passcode."""
    if not demo_auth.is_enabled():
        return
    if not x_demo_token or not demo_auth.verify_token(x_demo_token):
        raise HTTPException(status_code=401, detail="Demo access required")


@app.post("/demo/unlock", response_model=DemoUnlockResponse)
def unlock_demo(body: DemoUnlockRequest):
    if not demo_auth.is_enabled():
        raise HTTPException(status_code=404, detail="Demo gate is not enabled")
    if not demo_auth.check_passcode(body.passcode):
        raise HTTPException(status_code=401, detail="Incorrect passcode")
    token, expires_at = demo_auth.create_token()
    return DemoUnlockResponse(token=token, expires_at=datetime.fromtimestamp(expires_at, tz=timezone.utc))


def _latest_reading(asset_id: str) -> dict | None:
    readings = _recent_readings(asset_id, 1)
    return readings[0] if readings else None


def _recent_readings(asset_id: str, limit: int) -> list[dict]:
    rows = snowflake_client.run_query(
        "SELECT * FROM ASSET_READINGS WHERE ASSET_ID = %s ORDER BY TS DESC LIMIT %s",
        (asset_id, limit),
    )
    return [
        {"ts": row["TS"], **{field: row[field.upper()] for field in asset_simulator.ALL_READING_FIELDS}}
        for row in rows
    ]


def _insert_reading(asset_id: str, ts: datetime, reading: dict) -> None:
    columns = ["asset_id", "ts"] + asset_simulator.ALL_READING_FIELDS
    placeholders = ", ".join(["%s"] * len(columns))
    values = (asset_id, ts, *(reading.get(field) for field in asset_simulator.ALL_READING_FIELDS))
    snowflake_client.execute(
        f"INSERT INTO ASSET_READINGS ({', '.join(columns)}) VALUES ({placeholders})",
        values,
    )


def _insert_risk(asset_id: str, ts: datetime, risk_type: str, risk_level: str, notes: str) -> None:
    snowflake_client.execute(
        "INSERT INTO ASSET_RISK_ASSESSMENTS (asset_id, ts, risk_type, risk_level, notes) "
        "VALUES (%s, %s, %s, %s, %s)",
        (asset_id, ts, risk_type, risk_level, notes),
    )


def _recommendation_id(asset_id: str, ts: datetime, idx: int) -> str:
    return f"{asset_id}-REC-{ts.strftime('%Y%m%dT%H%M%S')}-{idx}"


_MARKDOWN_HEADING_RE = re.compile(r"^#{1,6}\s", re.MULTILINE)
_SENTENCE_END_RE = re.compile(r"[.!?]")
# The agent's raw narration is sometimes glued directly onto the real answer
# with no separating whitespace at all (e.g. "...pull the driving
# risks.Today's recommendation activity..."). Real prose always has a space
# after sentence-ending punctuation, so punctuation immediately followed by
# a capital letter or a markdown bold marker -- no space -- is a reliable
# narration/answer seam, independent of whatever words the narration used.
# Requiring an uppercase/`*` follower (not a digit) also keeps this from
# ever firing on a decimal number like "3.5".
_GLUED_BOUNDARY_RE = re.compile(r"[.!?](?=[A-Z*])")


def _strip_glued_narration(text: str) -> str:
    """Cut at the LAST glued punctuation-to-capital seam, since narration
    itself can span multiple properly-spaced sentences before the final,
    space-less handoff into the real answer."""
    matches = list(_GLUED_BOUNDARY_RE.finditer(text))
    if not matches:
        return text
    return text[matches[-1].end():].lstrip()


# Some raw responses have no glued boundary anywhere -- the agent writes
# perfectly normal, evenly-spaced prose all the way from its opening
# narration into the real answer (e.g. "Only one recommendation matched
# today's date exactly. Let me broaden to recent recommendations..."),
# so there's no typographical seam left to cut at. The only remaining
# signal is content: narration talks about the agent's own process (first-
# person "I'll"/"let me", references to "the user"/"my filter"), or leaks a
# raw snake_case field name (e.g. "approved_at") that a genuine natural-
# language farm answer never uses. Match anywhere in the sentence, not just
# at position 0 -- a narration sentence can open with a plain-looking
# clause and only reveal itself later ("...but the user asked about
# \"today's\" decisions broadly, so I'll summarize...").
_NARRATION_SIGNAL_RE = re.compile(
    r"\bI'll\b|\bI will\b|\bI'm going to\b|\bLet me\b|\bLet's\b|\bI have\b|\bI've\b|"
    r"\bthe user\b|\bmy filter\b|\bmy query\b|\bfiltering to\b|\bfiltering for\b|\bquerying\b",
    re.IGNORECASE,
)
_FIELD_NAME_RE = re.compile(r"\b[a-z]+(?:_[a-z]+)+\b")


def _looks_like_narration(sentence: str) -> bool:
    return bool(_NARRATION_SIGNAL_RE.search(sentence) or _FIELD_NAME_RE.search(sentence))


def _split_sentences(text: str) -> list[str]:
    """Split into sentences, each retaining its own leading whitespace and
    trailing punctuation, using the same boundary as _SENTENCE_END_RE."""
    sentences = []
    start = 0
    for match in _SENTENCE_END_RE.finditer(text):
        sentences.append(text[start : match.end()])
        start = match.end()
    if start < len(text):
        sentences.append(text[start:])
    return sentences


# Narration is always a contiguous prefix in every shape observed so far --
# never interleaved with or following the real answer -- so it's safe to
# only scan the first few sentences rather than the whole response (which
# would risk a coincidental match deep inside a long, legitimate answer).
# 4 comfortably covers every observed case (at most 2 narration sentences).
_NARRATION_SCAN_WINDOW = 4


def _strip_narration_prefix(text: str) -> str:
    """Scans the first few sentences for ones that look like narration
    (see _looks_like_narration) and cuts everything up to and including
    the LAST such sentence in that window -- not just a leading run, since
    a narration sentence can sandwich a plain-looking one that doesn't
    itself trip any signal (e.g. "Only one recommendation matched today's
    filter." between two sentences that clearly do)."""
    sentences = _split_sentences(text)
    window = sentences[:_NARRATION_SCAN_WINDOW]

    last_narration_idx = -1
    for i, sentence in enumerate(window):
        if _looks_like_narration(sentence):
            last_narration_idx = i
    if last_narration_idx == -1:
        return text

    cut = sum(len(s) for s in sentences[: last_narration_idx + 1])
    return text[cut:].lstrip()


def _clean_agent_answer(text: str) -> str:
    """FARM_OPS_AGENT's response can include its own tool-call narration
    ahead of the real answer -- strip that narration so it doesn't leak
    into summaries. Observed shapes across calls: an explicit <answer>
    tag, narration running straight into the first markdown heading with
    no tag, or narration glued directly onto the answer with no marker and
    no separating whitespace at all -- handle all of them rather than
    assuming any one is guaranteed."""
    if "<answer>" in text:
        text = text.split("<answer>", 1)[1]
        if "</answer>" in text:
            text = text.split("</answer>", 1)[0]
    else:
        match = _MARKDOWN_HEADING_RE.search(text)
        if match:
            text = text[match.start():]
        else:
            text = _strip_glued_narration(text)
    return _strip_narration_prefix(text.strip())


_RISK_HEALTH_SCORE = {"low": 90, "medium": 60, "high": 35, "critical": 10}
_RISK_STATUS = {"low": "healthy", "medium": "needs_attention", "high": "critical", "critical": "critical"}
_PRIORITY_RANK = {"low": 0, "medium": 1, "high": 2}


def _health_score(risk_level: str) -> int:
    return _RISK_HEALTH_SCORE.get(risk_level, 50)


def _asset_status(risk_level: str) -> str:
    return _RISK_STATUS.get(risk_level, "needs_attention")


def _recommendation_from_row(row: dict) -> Recommendation:
    return Recommendation(
        recommendation_id=row["RECOMMENDATION_ID"],
        asset_id=row["ASSET_ID"],
        created_at=row["CREATED_AT"],
        recommendation=row["RECOMMENDATION"],
        reason=row["REASON"],
        evidence=row["EVIDENCE"],
        priority=row["PRIORITY"],
        expected_impact=row["EXPECTED_IMPACT"],
        confidence_pct=row["CONFIDENCE_PCT"],
        status=row["STATUS"],
        approved_by=row["APPROVED_BY"],
        approved_at=row["APPROVED_AT"],
        stock_availability=row.get("STOCK_AVAILABILITY"),
    )


def _asset_risk_from_row(row: dict) -> AssetRisk:
    return AssetRisk(
        asset_id=row["ASSET_ID"],
        ts=row["TS"],
        risk_type=row["RISK_TYPE"],
        risk_level=row["RISK_LEVEL"],
        notes=row["NOTES"],
    )


@app.post("/workflow/run", response_model=DailyBriefing, dependencies=[Depends(require_demo_access)])
async def run_daily_workflow():
    """
    The core demo endpoint, run once per asset per call: Observe (simulate
    + persist the next sensor reading) -> Understand (rule-based risk
    assessment) -> Recommend (real Cortex Agent call for at-risk assets,
    parsed into structured 6-field recommendations) -> Predict (trend
    projection vs. the previous reading, stored alongside the current risk
    assessment).
    """
    now = datetime.now(timezone.utc)

    # Observe: farm-wide weather (one location now, not per-asset)
    weather = await weather_client.get_today_reading(settings.farm_lat, settings.farm_lon)
    snowflake_client.execute(
        "INSERT INTO WEATHER_READINGS (ts, rainfall_mm, temp_c, humidity_pct, wind_speed_kmh, source) "
        "VALUES (%s, %s, %s, %s, %s, %s)",
        (
            weather["ts"],
            weather["rainfall_mm"],
            weather["temp_c"],
            weather["humidity_pct"],
            weather["wind_speed_kmh"],
            "open-meteo",
        ),
    )

    assets = snowflake_client.run_query("SELECT ASSET_ID, ASSET_TYPE, NAME FROM FARM_ASSETS ORDER BY ASSET_ID")

    high_risk_assets: list[str] = []
    recommendations_created: list[Recommendation] = []
    narrative_parts: list[str] = []

    for asset in assets:
        asset_id, asset_type, name = asset["ASSET_ID"], asset["ASSET_TYPE"], asset["NAME"]

        # Observe
        previous = _latest_reading(asset_id)
        reading = asset_simulator.next_reading(asset_type, previous)
        _insert_reading(asset_id, now, reading)

        # Understand
        risk_type, risk_level, notes = risk_engine.assess_risk(asset_type, reading)
        _insert_risk(asset_id, now, risk_type, risk_level, notes)

        if risk_level == "low":
            continue
        high_risk_assets.append(asset_id)

        # Predict
        prediction = risk_engine.predict_trend(risk_type, reading, previous)
        if prediction:
            _insert_risk(asset_id, now, f"{risk_type}_forecast_24h", risk_level, prediction)

        # Recommend -- real Cortex Agent call, grounded in this asset's current state
        prompt = (
            f"Assess {name} ({asset_id}, a {asset_type.replace('_', ' ')}) current condition "
            f"and give your recommendations in the required 6-field format."
        )
        agent_text = _clean_agent_answer(await cortex_agent_client.ask_agent(prompt))
        narrative_parts.append(f"{name}: {agent_text[:280]}")

        for idx, rec in enumerate(recommendation_parser.parse_recommendations(agent_text), start=1):
            rec_id = _recommendation_id(asset_id, now, idx)
            stock = rec.get("stock_availability")
            snowflake_client.execute(
                "INSERT INTO RECOMMENDATIONS (recommendation_id, asset_id, created_at, recommendation, "
                "reason, evidence, priority, expected_impact, confidence_pct, status, stock_availability) "
                "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
                (
                    rec_id,
                    asset_id,
                    now,
                    rec["recommendation"],
                    rec["reason"],
                    rec["evidence"],
                    rec["priority"],
                    rec["expected_impact"],
                    rec["confidence_pct"],
                    "pending_approval",
                    stock,
                ),
            )
            recommendations_created.append(
                Recommendation(
                    recommendation_id=rec_id,
                    asset_id=asset_id,
                    created_at=now,
                    recommendation=rec["recommendation"],
                    reason=rec["reason"],
                    evidence=rec["evidence"],
                    priority=rec["priority"],
                    expected_impact=rec["expected_impact"],
                    confidence_pct=rec["confidence_pct"],
                    status="pending_approval",
                    stock_availability=stock,
                )
            )

    summary = (
        f"Assessed {len(assets)} assets; {len(high_risk_assets)} flagged at medium+ risk "
        f"with {len(recommendations_created)} new recommendation(s) pending approval."
    )
    if narrative_parts:
        summary += " " + " ".join(narrative_parts)

    return DailyBriefing(
        date=now,
        assets_assessed=len(assets),
        high_risk_assets=high_risk_assets,
        recommendations_created=recommendations_created,
        summary=summary,
    )


@app.get("/briefing/today", response_model=BriefingToday)
async def get_briefing_today():
    rows = snowflake_client.run_query(
        "SELECT * FROM RECOMMENDATIONS "
        "WHERE STATUS IN ('approved', 'rejected') AND DATE(APPROVED_AT) = CURRENT_DATE() "
        "ORDER BY APPROVED_AT DESC"
    )
    approved = [_recommendation_from_row(r) for r in rows if r["STATUS"] == "approved"]
    rejected = [_recommendation_from_row(r) for r in rows if r["STATUS"] == "rejected"]

    if not rows:
        summary = "No recommendations were approved or rejected today."
    else:
        raw = await cortex_agent_client.ask_agent(
            "In 3-5 sentences, summarize today's approved and rejected recommendations "
            "and the risks driving them across all farm assets."
        )
        summary = _clean_agent_answer(raw)

    return BriefingToday(
        date=datetime.now(timezone.utc),
        approved_recommendations=approved,
        rejected_recommendations=rejected,
        summary=summary,
    )


@app.get("/assets", response_model=list[AssetOverview])
def get_assets():
    rows = snowflake_client.run_query(
        "WITH latest_risk AS ("
        "  SELECT ASSET_ID, RISK_LEVEL, NOTES FROM ASSET_RISK_ASSESSMENTS "
        "  WHERE RISK_TYPE NOT LIKE '%%_forecast_24h' "
        "  QUALIFY ROW_NUMBER() OVER (PARTITION BY ASSET_ID ORDER BY TS DESC) = 1"
        "), latest_reading AS ("
        "  SELECT ASSET_ID, GROWTH_STAGE, IRRIGATION_STATUS, HARVEST_READINESS_PCT FROM ASSET_READINGS "
        "  QUALIFY ROW_NUMBER() OVER (PARTITION BY ASSET_ID ORDER BY TS DESC) = 1"
        ") "
        "SELECT a.ASSET_ID, a.ASSET_TYPE, a.NAME, a.GRID_X, a.GRID_Y, r.RISK_LEVEL, r.NOTES, "
        "       rd.GROWTH_STAGE, rd.IRRIGATION_STATUS, rd.HARVEST_READINESS_PCT "
        "FROM FARM_ASSETS a "
        "LEFT JOIN latest_risk r ON r.ASSET_ID = a.ASSET_ID "
        "LEFT JOIN latest_reading rd ON rd.ASSET_ID = a.ASSET_ID "
        "ORDER BY a.ASSET_ID"
    )
    overviews = []
    for row in rows:
        risk_level = (row["RISK_LEVEL"] or "low").lower()
        overviews.append(
            AssetOverview(
                asset_id=row["ASSET_ID"],
                asset_type=row["ASSET_TYPE"],
                name=row["NAME"],
                grid_x=row["GRID_X"],
                grid_y=row["GRID_Y"],
                risk_level=risk_level,
                health_score=_health_score(risk_level),
                status=_asset_status(risk_level),
                latest_alert=row["NOTES"] if risk_level != "low" else None,
                growth_stage=row["GROWTH_STAGE"],
                irrigation_status=row["IRRIGATION_STATUS"],
                harvest_readiness_pct=row["HARVEST_READINESS_PCT"],
            )
        )
    return overviews


@app.get("/assets/{asset_id}", response_model=AssetDetail)
def get_asset_detail(asset_id: str):
    asset_rows = snowflake_client.run_query("SELECT * FROM FARM_ASSETS WHERE ASSET_ID = %s", (asset_id,))
    if not asset_rows:
        raise HTTPException(status_code=404, detail=f"No asset found with id {asset_id}")
    asset_row = asset_rows[0]

    reading_rows = snowflake_client.run_query(
        "SELECT * FROM ASSET_READINGS WHERE ASSET_ID = %s ORDER BY TS DESC LIMIT 1", (asset_id,)
    )
    latest_reading = None
    if reading_rows:
        r = reading_rows[0]
        latest_reading = AssetReading(
            asset_id=r["ASSET_ID"],
            ts=r["TS"],
            **{field: r[field.upper()] for field in asset_simulator.ALL_READING_FIELDS},
        )

    risk_rows = snowflake_client.run_query(
        "SELECT * FROM ASSET_RISK_ASSESSMENTS WHERE ASSET_ID = %s AND RISK_TYPE NOT LIKE '%%_forecast_24h' "
        "ORDER BY TS DESC LIMIT 1",
        (asset_id,),
    )
    latest_risk = _asset_risk_from_row(risk_rows[0]) if risk_rows else None

    prediction_rows = snowflake_client.run_query(
        "SELECT * FROM ASSET_RISK_ASSESSMENTS WHERE ASSET_ID = %s AND RISK_TYPE LIKE '%%_forecast_24h' "
        "ORDER BY TS DESC LIMIT 1",
        (asset_id,),
    )
    prediction = _asset_risk_from_row(prediction_rows[0]) if prediction_rows else None

    history_rows = snowflake_client.run_query(
        "SELECT * FROM ASSET_HISTORY WHERE ASSET_ID = %s ORDER BY PERIOD_LABEL", (asset_id,)
    )
    history = [
        AssetHistory(
            asset_id=h["ASSET_ID"],
            period_label=h["PERIOD_LABEL"],
            metric_name=h["METRIC_NAME"],
            metric_value=h["METRIC_VALUE"],
            notes=h["NOTES"],
        )
        for h in history_rows
    ]

    risk_level = latest_risk.risk_level if latest_risk else "low"
    overview = AssetOverview(
        asset_id=asset_row["ASSET_ID"],
        asset_type=asset_row["ASSET_TYPE"],
        name=asset_row["NAME"],
        grid_x=asset_row["GRID_X"],
        grid_y=asset_row["GRID_Y"],
        risk_level=risk_level,
        health_score=_health_score(risk_level),
        status=_asset_status(risk_level),
        latest_alert=latest_risk.notes if latest_risk and risk_level != "low" else None,
        growth_stage=latest_reading.growth_stage if latest_reading else None,
        irrigation_status=latest_reading.irrigation_status if latest_reading else None,
        harvest_readiness_pct=latest_reading.harvest_readiness_pct if latest_reading else None,
    )

    return AssetDetail(
        asset=overview,
        latest_reading=latest_reading,
        latest_risk=latest_risk,
        prediction=prediction,
        history=history,
    )


_HARVEST_PLANNER_ASSET_TYPES = {"rice_field", "fruit_orchard", "greenhouse"}


@app.get("/assets/{asset_id}/harvest-plan", response_model=HarvestPlan)
async def get_harvest_plan(asset_id: str):
    """Deterministic readiness ETA (see harvest_planner.py) narrated by the
    Cortex Agent -- the agent explains the already-computed numbers, it
    does not calculate them (feat-054; see that feature's notes for why)."""
    asset_rows = snowflake_client.run_query(
        "SELECT ASSET_ID, ASSET_TYPE, NAME FROM FARM_ASSETS WHERE ASSET_ID = %s", (asset_id,)
    )
    if not asset_rows:
        raise HTTPException(status_code=404, detail=f"No asset found with id {asset_id}")
    asset_type, name = asset_rows[0]["ASSET_TYPE"], asset_rows[0]["NAME"]
    if asset_type not in _HARVEST_PLANNER_ASSET_TYPES:
        raise HTTPException(status_code=400, detail=f"Harvest Planner does not apply to asset type {asset_type}")

    readings = _recent_readings(asset_id, 2)
    if not readings:
        raise HTTPException(status_code=404, detail=f"No sensor readings yet for {asset_id}")
    current, previous = readings[0], (readings[1] if len(readings) > 1 else None)

    rule_rows = snowflake_client.run_query("SELECT * FROM HARVEST_RULES WHERE ASSET_TYPE = %s", (asset_type,))
    if not rule_rows:
        raise HTTPException(status_code=404, detail=f"No harvest rule configured for asset type {asset_type}")
    min_readiness_pct = rule_rows[0]["MIN_READINESS_PCT"]
    rule = {
        "ready_growth_stage": rule_rows[0]["READY_GROWTH_STAGE"],
        # HARVEST_RULES.min_readiness_pct is NUMERIC(5,2) in Snowflake --
        # snowflake-connector-python decodes NUMERIC columns as
        # decimal.Decimal, which can't mix with the plain floats
        # ASSET_READINGS' harvest_readiness_pct (a FLOAT column) yields, so
        # this must be coerced at the boundary before it reaches
        # harvest_planner's arithmetic.
        "min_readiness_pct": float(min_readiness_pct) if min_readiness_pct is not None else None,
    }

    plan = harvest_planner.plan_harvest(asset_type, current, previous, rule)

    prompt = (
        f"For {name} ({asset_id}, a {asset_type.replace('_', ' ')}), a deterministic projection has "
        "already computed the following real harvest-readiness estimate -- do not recalculate or "
        "second-guess the numbers. In 3-5 plain sentences (no markdown headings, no bullet lists, no "
        "6-field recommendation format -- just short narrative prose, matching how you'd summarize a "
        "daily briefing), explain what this means and give one concrete recommendation grounded in it: "
        f"{plan['eta_description']}"
    )
    narrative = _clean_agent_answer(await cortex_agent_client.ask_agent(prompt))

    return HarvestPlan(
        asset_id=asset_id,
        asset_type=asset_type,
        is_ready=plan["is_ready"],
        eta_description=plan["eta_description"],
        basis=plan["basis"],
        narrative=narrative,
    )


@app.post("/assets/{asset_id}/simulate", response_model=ScenarioResult)
async def simulate_scenario(asset_id: str, body: ScenarioRequest = ScenarioRequest()):
    """Deterministic what-if projection (see scenario_engine.py) narrated
    by the Cortex Agent -- same "Python computes, agent explains" split as
    get_harvest_plan (feat-055; see that feature's notes for why). Called
    with no `action` to seed the frontend's picker with the current
    risk_type's real candidate actions and a silent baseline (no agent
    call, so the initial page load isn't gated on a live LLM round trip);
    called again with a chosen `action` to get the narrated comparison."""
    asset_rows = snowflake_client.run_query(
        "SELECT ASSET_ID, NAME FROM FARM_ASSETS WHERE ASSET_ID = %s", (asset_id,)
    )
    if not asset_rows:
        raise HTTPException(status_code=404, detail=f"No asset found with id {asset_id}")
    name = asset_rows[0]["NAME"]

    risk_rows = snowflake_client.run_query(
        "SELECT RISK_TYPE FROM ASSET_RISK_ASSESSMENTS WHERE ASSET_ID = %s AND RISK_TYPE NOT LIKE '%%_forecast_24h' "
        "ORDER BY TS DESC LIMIT 1",
        (asset_id,),
    )
    risk_type = risk_rows[0]["RISK_TYPE"] if risk_rows else "none"

    if risk_type == "none" or risk_engine.trend_metric(risk_type) is None:
        return ScenarioResult(
            asset_id=asset_id,
            risk_type=risk_type,
            is_available=False,
            reason="This asset has no active risk with a trackable trend to simulate right now.",
        )

    available_actions = scenario_engine.available_actions(risk_type)
    readings = _recent_readings(asset_id, 2)
    current = readings[0] if readings else {}
    previous = readings[1] if len(readings) > 1 else None

    action = body.action or scenario_engine.NO_ACTION
    sim = scenario_engine.simulate(risk_type, current, previous, action)

    if "error" in sim:
        return ScenarioResult(
            asset_id=asset_id,
            risk_type=risk_type,
            is_available=False,
            reason=sim["error"],
            available_actions=available_actions,
        )

    narrative = None
    if body.action:
        action_label = action.replace("_", " ")
        metric_label = sim["metric"].replace("_", " ")
        outcomes = "; ".join(
            f"in {p['horizon_hours']}h: without action ~{p['without_action']}, with {action_label} ~{p['with_action']}"
            for p in sim["projections"]
        )
        prompt = (
            f"For {name} ({asset_id}), a deterministic projection has already computed the following "
            f"real what-if comparison for {metric_label} -- do not recalculate or second-guess the "
            f"numbers. Currently {sim['current_value']}, trending {sim['baseline_delta_per_hour']}/hour "
            f"without intervention. Projected outcomes: {outcomes}. In 3-5 plain sentences (no markdown "
            "headings, no bullet lists, no 6-field recommendation format), explain what this comparison "
            f"means and give one clear recommendation on whether to take the '{action_label}' action now."
        )
        narrative = _clean_agent_answer(await cortex_agent_client.ask_agent(prompt))

    return ScenarioResult(
        asset_id=asset_id,
        risk_type=risk_type,
        is_available=True,
        metric=sim["metric"],
        current_value=sim["current_value"],
        baseline_delta_per_hour=sim["baseline_delta_per_hour"],
        available_actions=available_actions,
        action=action,
        projections=sim["projections"],
        narrative=narrative,
    )


@app.get("/assets/{asset_id}/yield-estimate", response_model=YieldEstimate)
async def get_yield_estimate(asset_id: str):
    """Deterministic yield estimate (see yield_estimator.py) narrated by
    the Cortex Agent -- same "Python computes, agent explains" split as
    get_harvest_plan and simulate_scenario (feat-056; see that feature's
    notes for why). Applies to all 5 asset types, unlike Harvest Planner
    (crop-only) -- every type has real ASSET_HISTORY yield records."""
    asset_rows = snowflake_client.run_query(
        "SELECT ASSET_ID, ASSET_TYPE, NAME FROM FARM_ASSETS WHERE ASSET_ID = %s", (asset_id,)
    )
    if not asset_rows:
        raise HTTPException(status_code=404, detail=f"No asset found with id {asset_id}")
    asset_type, name = asset_rows[0]["ASSET_TYPE"], asset_rows[0]["NAME"]

    metric_info = yield_estimator.yield_metric_for(asset_type)
    if metric_info is None:
        return YieldEstimate(
            asset_id=asset_id,
            asset_type=asset_type,
            is_available=False,
            reason=f"No yield metric is tracked for asset type {asset_type}.",
        )
    metric_name, _unit = metric_info

    history_rows = snowflake_client.run_query(
        "SELECT METRIC_VALUE FROM ASSET_HISTORY WHERE ASSET_ID = %s AND METRIC_NAME = %s "
        "ORDER BY PERIOD_LABEL",
        (asset_id, metric_name),
    )
    historical_values = [float(row["METRIC_VALUE"]) for row in history_rows]

    risk_rows = snowflake_client.run_query(
        "SELECT RISK_LEVEL FROM ASSET_RISK_ASSESSMENTS WHERE ASSET_ID = %s AND RISK_TYPE NOT LIKE '%%_forecast_24h' "
        "ORDER BY TS DESC LIMIT 1",
        (asset_id,),
    )
    risk_level = (risk_rows[0]["RISK_LEVEL"] if risk_rows else "low").lower()
    health_score = _health_score(risk_level)

    est = yield_estimator.estimate_yield(asset_type, historical_values, health_score)
    if "error" in est:
        return YieldEstimate(
            asset_id=asset_id,
            asset_type=asset_type,
            is_available=False,
            reason=est["error"],
        )

    prompt = (
        f"For {name} ({asset_id}, a {asset_type.replace('_', ' ')}), a deterministic projection has "
        "already computed the following real yield estimate -- do not recalculate or second-guess the "
        f"numbers. This asset's historical average {est['metric'].replace('_', ' ')} across "
        f"{est['sample_size']} past cycle(s) is {est['baseline']} {est['unit']}. Its current health "
        f"score is {est['health_score']}/100. Applying that health condition to the historical average "
        f"gives an estimated next-cycle yield of {est['estimated_yield']} {est['unit']} "
        f"(confidence {est['confidence_pct']}%). In 3-5 plain sentences (no markdown headings, no "
        "bullet lists, no 6-field recommendation format), explain what this estimate means and give one "
        "clear, concrete recommendation grounded in it."
    )
    narrative = _clean_agent_answer(await cortex_agent_client.ask_agent(prompt))

    return YieldEstimate(
        asset_id=asset_id,
        asset_type=asset_type,
        is_available=True,
        metric=est["metric"],
        unit=est["unit"],
        baseline=est["baseline"],
        health_score=est["health_score"],
        estimated_yield=est["estimated_yield"],
        confidence_pct=est["confidence_pct"],
        sample_size=est["sample_size"],
        narrative=narrative,
    )


@app.get("/assets/{asset_id}/recommendations", response_model=list[Recommendation])
def get_asset_recommendations(asset_id: str):
    asset_rows = snowflake_client.run_query("SELECT ASSET_ID FROM FARM_ASSETS WHERE ASSET_ID = %s", (asset_id,))
    if not asset_rows:
        raise HTTPException(status_code=404, detail=f"No asset found with id {asset_id}")
    rows = snowflake_client.run_query(
        "SELECT * FROM RECOMMENDATIONS WHERE ASSET_ID = %s AND STATUS = 'pending_approval' "
        "ORDER BY CREATED_AT DESC",
        (asset_id,),
    )
    return [_recommendation_from_row(r) for r in rows]


def _set_recommendation_status(recommendation_id: str, status: str, approved_by: str) -> Recommendation:
    rowcount = snowflake_client.execute(
        "UPDATE RECOMMENDATIONS SET STATUS = %s, APPROVED_BY = %s, APPROVED_AT = %s WHERE RECOMMENDATION_ID = %s",
        (status, approved_by, datetime.now(timezone.utc), recommendation_id),
    )
    if rowcount == 0:
        raise HTTPException(status_code=404, detail=f"No recommendation found with id {recommendation_id}")
    row = snowflake_client.run_query(
        "SELECT * FROM RECOMMENDATIONS WHERE RECOMMENDATION_ID = %s", (recommendation_id,)
    )[0]
    return _recommendation_from_row(row)


def _maybe_log_treatment(rec: Recommendation) -> None:
    """When an approved recommendation involves a regulated treatment (one
    that appears in WITHDRAWAL_RULES with withdrawal_days > 0), write a row
    to TREATMENTS so subsequent harvest/sale queries can surface the correct
    earliest-safe date (administered_at + withdrawal_days)."""
    rules = snowflake_client.run_query(
        "SELECT wr.TREATMENT_NAME FROM WITHDRAWAL_RULES wr "
        "JOIN FARM_ASSETS fa ON fa.ASSET_TYPE = wr.ASSET_TYPE "
        "WHERE fa.ASSET_ID = %s AND wr.WITHDRAWAL_DAYS > 0",
        (rec.asset_id,),
    )
    if not rules:
        return
    rec_text = (rec.recommendation or "").lower()
    for rule in rules:
        treatment = rule["TREATMENT_NAME"]
        # Match "antibiotic_treatment" or "antibiotic treatment" (space variant)
        if treatment.lower() in rec_text or treatment.lower().replace("_", " ") in rec_text:
            snowflake_client.execute(
                "INSERT INTO TREATMENTS (asset_id, treatment_name, administered_at) VALUES (%s, %s, %s)",
                (rec.asset_id, treatment, datetime.now(timezone.utc)),
            )
            break


@app.post("/recommendations/{recommendation_id}/approve", response_model=Recommendation)
def approve_recommendation(recommendation_id: str, body: ApprovalRequest = ApprovalRequest()):
    rec = _set_recommendation_status(recommendation_id, "approved", body.approved_by)
    _maybe_log_treatment(rec)
    return rec


@app.post("/recommendations/{recommendation_id}/reject", response_model=Recommendation)
def reject_recommendation(recommendation_id: str, body: ApprovalRequest = ApprovalRequest()):
    return _set_recommendation_status(recommendation_id, "rejected", body.approved_by)


@app.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary():
    asset_rows = snowflake_client.run_query(
        "SELECT a.ASSET_ID, a.ASSET_TYPE, a.NAME, r.RISK_LEVEL "
        "FROM FARM_ASSETS a "
        "LEFT JOIN ASSET_RISK_ASSESSMENTS r "
        "  ON r.ASSET_ID = a.ASSET_ID AND r.RISK_TYPE NOT LIKE '%%_forecast_24h' "
        "QUALIFY ROW_NUMBER() OVER (PARTITION BY a.ASSET_ID ORDER BY r.TS DESC) = 1 "
        "ORDER BY a.ASSET_ID"
    )
    assets: list[AssetStatusSummary] = []
    scores: list[int] = []
    for row in asset_rows:
        risk_level = (row["RISK_LEVEL"] or "low").lower()
        score = _health_score(risk_level)
        scores.append(score)
        assets.append(
            AssetStatusSummary(
                asset_id=row["ASSET_ID"],
                asset_type=row["ASSET_TYPE"],
                name=row["NAME"],
                health_score=score,
                status=_asset_status(risk_level),
            )
        )
    farm_health_score = round(sum(scores) / len(scores)) if scores else 0

    alert_rows = snowflake_client.run_query(
        "SELECT * FROM ASSET_RISK_ASSESSMENTS "
        "WHERE RISK_LEVEL IN ('high', 'critical') AND RISK_TYPE NOT LIKE '%%_forecast_24h' "
        "QUALIFY ROW_NUMBER() OVER (PARTITION BY ASSET_ID ORDER BY TS DESC) = 1 "
        "ORDER BY TS DESC"
    )
    active_alerts = [_asset_risk_from_row(r) for r in alert_rows]

    task_rows = snowflake_client.run_query(
        "SELECT * FROM RECOMMENDATIONS WHERE STATUS = 'pending_approval' ORDER BY CREATED_AT DESC"
    )
    tasks_due_today = [_recommendation_from_row(r) for r in task_rows]
    top_recommendations = sorted(
        tasks_due_today,
        key=lambda r: (_PRIORITY_RANK.get(r.priority, 0), r.confidence_pct),
        reverse=True,
    )[:5]

    weather_rows = snowflake_client.run_query("SELECT * FROM WEATHER_READINGS ORDER BY TS DESC LIMIT 1")
    weather = None
    if weather_rows:
        w = weather_rows[0]
        weather = WeatherReading(
            ts=w["TS"],
            rainfall_mm=w["RAINFALL_MM"],
            temp_c=w["TEMP_C"],
            humidity_pct=w["HUMIDITY_PCT"],
            wind_speed_kmh=w["WIND_SPEED_KMH"],
            source=w["SOURCE"],
        )

    return DashboardSummary(
        date=datetime.now(timezone.utc),
        farm_health_score=farm_health_score,
        active_alerts=active_alerts,
        tasks_due_today=tasks_due_today,
        asset_count=len(assets),
        weather=weather,
        top_recommendations=top_recommendations,
        assets=assets,
    )


@app.post("/copilot/ask", response_model=CopilotAnswer)
async def ask_copilot(body: CopilotQuestion):
    """Free-form Q&A, grounded in the farm's real current state via the
    same semantic view /workflow/run and /briefing/today use. Per
    docs/FarmTwin-AI-Copilot.md's decision-intelligence thesis, every
    answer should end with a concrete next step, not just an observation."""
    prompt = (
        f"{body.question}\n\n"
        "Ground your answer in this farm's actual current data (assets, sensor readings, "
        "risk assessments, recommendations, and history) via the semantic view -- never give "
        "generic agricultural advice that isn't tied to this farm's real state. End your answer "
        "with a concrete, actionable next step. Write in plain prose sentences (bold for emphasis "
        "is fine) -- no markdown headings, no bullet lists, no 6-field recommendation format -- "
        "this answer renders in a chat bubble, not a structured card."
    )
    raw = await cortex_agent_client.ask_agent(prompt)
    return CopilotAnswer(question=body.question, answer=_clean_agent_answer(raw))
