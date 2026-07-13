from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class WeatherReading(BaseModel):
    farm_id: str
    ts: datetime
    rainfall_mm: float
    temp_c: float
    humidity_pct: float
    source: str = "open-meteo"


class RiskAssessment(BaseModel):
    farm_id: str
    ts: datetime
    flood_risk: Literal["low", "medium", "high"]
    drought_risk: Literal["low", "medium", "high"]
    disease_risk: Literal["low", "medium", "high"]
    notes: str


class WorkOrder(BaseModel):
    work_order_id: str
    farm_id: str
    created_at: datetime
    action: str
    status: Literal["pending_approval", "approved", "rejected", "completed"] = (
        "pending_approval"
    )
    approved_by: str | None = None
    approved_at: datetime | None = None


class DailyBriefing(BaseModel):
    date: datetime
    farms_assessed: int
    high_risk_farms: list[str]
    work_orders_created: list[WorkOrder]
    summary: str


class Plot(BaseModel):
    plot_id: str
    name: str
    lat: float
    lon: float
    risk_level: str
    crop_type: str
    area_hectares: float
    planting_date: date


class PlotRisk(BaseModel):
    plot_id: str
    narrative: str
    work_order: WorkOrder | None = None


class ApprovalRequest(BaseModel):
    approved_by: str = "coop_manager"


class BriefingToday(BaseModel):
    date: datetime
    approved_work_orders: list[WorkOrder]
    rejected_work_orders: list[WorkOrder]
    summary: str
