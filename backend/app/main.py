from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models.schemas import (
    ApprovalRequest,
    BriefingToday,
    DailyBriefing,
    Plot,
    PlotRisk,
    WorkOrder,
)
from app.services import cortex_agent_client, snowflake_client, weather_client

RISK_SEVERITY = {"LOW": 0, "MEDIUM": 1, "HIGH": 2, "CRITICAL": 3}


def _overall_risk_level(row: dict) -> str:
    levels = [row.get("FLOOD_RISK"), row.get("DROUGHT_RISK"), row.get("DISEASE_RISK")]
    levels = [lvl for lvl in levels if lvl]
    if not levels:
        return "unknown"
    return max(levels, key=lambda lvl: RISK_SEVERITY.get(lvl, -1))


def _work_order_from_row(row: dict) -> WorkOrder:
    return WorkOrder(
        work_order_id=str(row["WORK_ORDER_ID"]),
        farm_id=str(row["FARM_ID"]),
        created_at=row["CREATED_AT"],
        action=row["ACTION"],
        status=row["STATUS"],
        approved_by=row["APPROVED_BY"],
        approved_at=row["APPROVED_AT"],
    )

app = FastAPI(title="Climate-Adaptive Agriculture Copilot")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/workflow/run", response_model=DailyBriefing)
async def run_daily_workflow():
    """
    The core demo endpoint. Chains:
    ingest weather -> write to Snowflake -> ask Cortex Agent for risk +
    recommendations -> create work orders -> return briefing.
    """
    # 1. ingest weather for each farm
    farms = snowflake_client.run_query(
        "SELECT FARM_ID, NAME, LAT, LON FROM FARMS"
    )
    readings = []
    for farm in farms:
        reading = await weather_client.get_today_reading(farm["LAT"], farm["LON"])
        readings.append((farm["FARM_ID"], reading))

    # 2. write readings to Snowflake
    if readings:
        snowflake_client.execute_many(
            "INSERT INTO WEATHER_READINGS "
            "(farm_id, ts, rainfall_mm, temp_c, humidity_pct, source) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            [
                (
                    farm_id,
                    reading["ts"],
                    reading["rainfall_mm"],
                    reading["temp_c"],
                    reading["humidity_pct"],
                    "open-meteo",
                )
                for farm_id, reading in readings
            ],
        )

    # 3. ask FARM_OPS_AGENT to assess risk + recommend actions
    narrative = await cortex_agent_client.ask_agent(
        "Which farms are currently at high or critical flood, drought, or "
        "disease risk, and what actions do you recommend? List each "
        "at-risk farm by name."
    )
    high_risk_farms = [
        str(farm["FARM_ID"]) for farm in farms if farm["NAME"] in narrative
    ]

    # 4. create work orders in Snowflake for high-risk farms
    work_orders_created: list[WorkOrder] = []
    if high_risk_farms:
        next_id_row = snowflake_client.run_query(
            "SELECT COALESCE(MAX(WORK_ORDER_ID), 0) AS MAX_ID FROM WORK_ORDERS"
        )
        next_id = next_id_row[0]["MAX_ID"] + 1
        created_at = datetime.now(timezone.utc)
        rows = []
        for farm_id in high_risk_farms:
            work_order_id = next_id
            next_id += 1
            rows.append((work_order_id, int(farm_id), created_at, narrative, "pending_approval"))
            work_orders_created.append(
                WorkOrder(
                    work_order_id=str(work_order_id),
                    farm_id=farm_id,
                    created_at=created_at,
                    action=narrative,
                    status="pending_approval",
                )
            )
        snowflake_client.execute_many(
            "INSERT INTO WORK_ORDERS (work_order_id, farm_id, created_at, action, status) "
            "VALUES (%s, %s, %s, %s, %s)",
            rows,
        )

    # 5. assemble + return briefing
    summary = (
        f"Assessed {len(farms)} farms; {len(high_risk_farms)} flagged high-risk "
        f"with {len(work_orders_created)} new work order(s) pending approval. {narrative}"
    )
    return DailyBriefing(
        date=datetime.now(timezone.utc),
        farms_assessed=len(farms),
        high_risk_farms=high_risk_farms,
        work_orders_created=work_orders_created,
        summary=summary,
    )


@app.get("/plots", response_model=list[Plot])
def get_plots():
    rows = snowflake_client.run_query(
        "SELECT f.FARM_ID, f.NAME, f.LAT, f.LON, f.CROP_TYPE, f.AREA_HECTARES, f.PLANTING_DATE, "
        "r.FLOOD_RISK, r.DROUGHT_RISK, r.DISEASE_RISK "
        "FROM FARMS f "
        "LEFT JOIN RISK_ASSESSMENTS r ON r.FARM_ID = f.FARM_ID "
        "QUALIFY ROW_NUMBER() OVER (PARTITION BY f.FARM_ID ORDER BY r.TS DESC) = 1 "
        "ORDER BY f.FARM_ID"
    )
    return [
        Plot(
            plot_id=str(row["FARM_ID"]),
            name=row["NAME"],
            lat=row["LAT"],
            lon=row["LON"],
            risk_level=_overall_risk_level(row).lower(),
            crop_type=row["CROP_TYPE"],
            area_hectares=row["AREA_HECTARES"],
            planting_date=row["PLANTING_DATE"],
        )
        for row in rows
    ]


@app.get("/plots/{plot_id}/risk", response_model=PlotRisk)
def get_plot_risk(plot_id: str):
    risk_rows = snowflake_client.run_query(
        "SELECT NOTES FROM RISK_ASSESSMENTS WHERE FARM_ID = %s ORDER BY TS DESC LIMIT 1",
        (plot_id,),
    )
    if not risk_rows:
        raise HTTPException(status_code=404, detail=f"No risk assessment found for plot {plot_id}")

    work_order_rows = snowflake_client.run_query(
        "SELECT * FROM WORK_ORDERS WHERE FARM_ID = %s ORDER BY CREATED_AT DESC LIMIT 1",
        (plot_id,),
    )
    work_order = _work_order_from_row(work_order_rows[0]) if work_order_rows else None

    return PlotRisk(plot_id=plot_id, narrative=risk_rows[0]["NOTES"], work_order=work_order)


def _set_work_order_status(work_order_id: str, status: str, approved_by: str) -> WorkOrder:
    rowcount = snowflake_client.execute(
        "UPDATE WORK_ORDERS SET STATUS = %s, APPROVED_BY = %s, APPROVED_AT = %s "
        "WHERE WORK_ORDER_ID = %s",
        (status, approved_by, datetime.now(timezone.utc), work_order_id),
    )
    if rowcount == 0:
        raise HTTPException(status_code=404, detail=f"No work order found with id {work_order_id}")
    row = snowflake_client.run_query(
        "SELECT * FROM WORK_ORDERS WHERE WORK_ORDER_ID = %s", (work_order_id,)
    )[0]
    return _work_order_from_row(row)


@app.post("/workorders/{work_order_id}/approve", response_model=WorkOrder)
def approve_work_order(work_order_id: str, body: ApprovalRequest = ApprovalRequest()):
    return _set_work_order_status(work_order_id, "approved", body.approved_by)


@app.post("/workorders/{work_order_id}/reject", response_model=WorkOrder)
def reject_work_order(work_order_id: str, body: ApprovalRequest = ApprovalRequest()):
    return _set_work_order_status(work_order_id, "rejected", body.approved_by)


@app.get("/briefing/today", response_model=BriefingToday)
async def get_briefing_today():
    rows = snowflake_client.run_query(
        "SELECT * FROM WORK_ORDERS "
        "WHERE STATUS IN ('approved', 'rejected') AND DATE(APPROVED_AT) = CURRENT_DATE() "
        "ORDER BY APPROVED_AT DESC"
    )
    approved = [_work_order_from_row(row) for row in rows if row["STATUS"] == "approved"]
    rejected = [_work_order_from_row(row) for row in rows if row["STATUS"] == "rejected"]

    if not rows:
        summary = "No work orders were approved or rejected today."
    else:
        summary = await cortex_agent_client.ask_agent(
            "In 3-5 sentences, summarize today's approved and rejected work "
            "orders and the risks driving them across all farms."
        )

    return BriefingToday(
        date=datetime.now(timezone.utc),
        approved_work_orders=approved,
        rejected_work_orders=rejected,
        summary=summary,
    )
