from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

AssetType = Literal["fish_pond", "chicken_coop", "rice_field", "fruit_orchard", "greenhouse"]
RiskLevel = Literal["low", "medium", "high", "critical"]
Priority = Literal["low", "medium", "high"]
RecommendationStatus = Literal["pending_approval", "approved", "rejected"]
AssetStatus = Literal["healthy", "needs_attention", "critical"]


class WeatherReading(BaseModel):
    ts: datetime
    rainfall_mm: float
    temp_c: float
    humidity_pct: float
    wind_speed_kmh: float
    source: str = "open-meteo"


class FarmAsset(BaseModel):
    asset_id: str
    asset_type: AssetType
    name: str
    grid_x: int
    grid_y: int
    install_date: date
    risk_level: RiskLevel | str = "unknown"


class AssetReading(BaseModel):
    asset_id: str
    ts: datetime
    water_temp_c: float | None = None
    ph: float | None = None
    dissolved_oxygen_mg_l: float | None = None
    feed_level_pct: float | None = None
    biomass_kg: float | None = None
    air_temp_c: float | None = None
    humidity_pct: float | None = None
    water_l: float | None = None
    egg_count: int | None = None
    growth_stage: str | None = None
    soil_moisture_pct: float | None = None
    nitrogen_ppm: float | None = None
    irrigation_status: str | None = None
    disease_risk_pct: float | None = None
    harvest_readiness_pct: float | None = None
    co2_ppm: float | None = None


class AssetRisk(BaseModel):
    asset_id: str
    ts: datetime
    risk_type: str
    risk_level: RiskLevel
    notes: str


class AssetHistory(BaseModel):
    asset_id: str
    period_label: str
    metric_name: str
    metric_value: float
    notes: str | None = None


StockAvailability = Literal["in_stock", "low_stock", "out_of_stock"]


class Recommendation(BaseModel):
    recommendation_id: str
    asset_id: str
    created_at: datetime
    recommendation: str
    reason: str
    evidence: str
    priority: Priority
    expected_impact: str
    confidence_pct: float
    status: RecommendationStatus = "pending_approval"
    approved_by: str | None = None
    approved_at: datetime | None = None
    stock_availability: StockAvailability | None = None


class ApprovalRequest(BaseModel):
    approved_by: str = "farm_manager"


class DailyBriefing(BaseModel):
    date: datetime
    assets_assessed: int
    high_risk_assets: list[str]
    recommendations_created: list[Recommendation]
    summary: str


WorkflowStep = Literal["queued", "observing", "assessing", "consulting_agent", "done"]


class AssetProgress(BaseModel):
    asset_id: str
    name: str
    step: WorkflowStep
    risk_level: RiskLevel | None = None
    metric_snippet: str | None = None
    recommendations_count: int = 0


class WorkflowJobStatus(BaseModel):
    job_id: str
    status: Literal["running", "complete", "error"]
    started_at: datetime
    assets: dict[str, AssetProgress]
    result: DailyBriefing | None = None
    error: str | None = None


class WorkflowStartResponse(BaseModel):
    job_id: str


class BriefingToday(BaseModel):
    date: datetime
    approved_recommendations: list[Recommendation]
    rejected_recommendations: list[Recommendation]
    summary: str


class AssetOverview(BaseModel):
    asset_id: str
    asset_type: AssetType
    name: str
    grid_x: int
    grid_y: int
    risk_level: RiskLevel | str
    health_score: int
    status: AssetStatus
    latest_alert: str | None = None
    # Latest-reading fields the digital twin map's per-type marker
    # graphics (feat-026/feat-027) drive visuals from, so the map
    # doesn't need a separate per-asset fetch just for decoration.
    growth_stage: str | None = None
    irrigation_status: str | None = None
    harvest_readiness_pct: float | None = None


class AssetDetail(BaseModel):
    asset: AssetOverview
    latest_reading: AssetReading | None = None
    latest_risk: AssetRisk | None = None
    prediction: AssetRisk | None = None
    history: list[AssetHistory] = []


class AssetStatusSummary(BaseModel):
    asset_id: str
    asset_type: AssetType
    name: str
    health_score: int
    status: AssetStatus


class DashboardSummary(BaseModel):
    date: datetime
    farm_health_score: int
    active_alerts: list[AssetRisk]
    tasks_due_today: list[Recommendation]
    asset_count: int
    weather: WeatherReading | None = None
    top_recommendations: list[Recommendation]
    assets: list[AssetStatusSummary]


class DemoUnlockRequest(BaseModel):
    passcode: str


class DemoUnlockResponse(BaseModel):
    token: str
    expires_at: datetime


class CopilotQuestion(BaseModel):
    question: str


class CopilotAnswer(BaseModel):
    question: str
    answer: str


class HarvestPlan(BaseModel):
    asset_id: str
    asset_type: AssetType
    is_ready: bool
    eta_description: str
    basis: str
    narrative: str


class ScenarioProjection(BaseModel):
    horizon_hours: int
    without_action: float
    with_action: float


class ScenarioRequest(BaseModel):
    action: str | None = None


class ScenarioResult(BaseModel):
    asset_id: str
    risk_type: str
    is_available: bool
    reason: str | None = None
    metric: str | None = None
    current_value: float | None = None
    baseline_delta_per_hour: float | None = None
    available_actions: list[str] = []
    action: str | None = None
    projections: list[ScenarioProjection] = []
    narrative: str | None = None


class YieldEstimate(BaseModel):
    asset_id: str
    asset_type: AssetType
    is_available: bool
    reason: str | None = None
    metric: str | None = None
    unit: str | None = None
    baseline: float | None = None
    health_score: int | None = None
    estimated_yield: float | None = None
    confidence_pct: float | None = None
    sample_size: int | None = None
    narrative: str | None = None
