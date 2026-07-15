import type {
  Asset,
  AssetDetail,
  AssetStatus,
  AssetType,
  Alert,
  DashboardSummary,
  Priority,
  Reading,
  Recommendation,
  RecommendationStatus,
  Briefing,
  CopilotAnswer,
  Task,
  HistoryEvent,
  Weather,
} from "./types"

/**
 * Typed wrappers for every backend endpoint, talking to the real FastAPI
 * backend (backend/app/main.py) and mapping its Snowflake-backed response
 * shapes (backend/app/models/schemas.py) onto this frontend's own
 * lib/types.ts contract. This replaces the in-memory lib/mockData.ts this
 * project shipped with.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 500) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...init?.headers },
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    throw new ApiError(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${detail}`, res.status)
  }
  return res.json() as Promise<T>
}

// ---------------------------------------------------------------------------
// Raw backend shapes (mirrors backend/app/models/schemas.py exactly)
// ---------------------------------------------------------------------------

type BackendRiskLevel = "low" | "medium" | "high" | "critical"

interface BackendAssetOverview {
  asset_id: string
  asset_type: AssetType
  name: string
  grid_x: number
  grid_y: number
  risk_level: BackendRiskLevel
  health_score: number
  status: AssetStatus
  latest_alert: string | null
  growth_stage: string | null
  irrigation_status: string | null
  harvest_readiness_pct: number | null
}

interface BackendAssetReading {
  asset_id: string
  ts: string
  water_temp_c: number | null
  ph: number | null
  dissolved_oxygen_mg_l: number | null
  feed_level_pct: number | null
  biomass_kg: number | null
  air_temp_c: number | null
  humidity_pct: number | null
  water_l: number | null
  egg_count: number | null
  growth_stage: string | null
  soil_moisture_pct: number | null
  nitrogen_ppm: number | null
  irrigation_status: string | null
  disease_risk_pct: number | null
  harvest_readiness_pct: number | null
}

interface BackendAssetRisk {
  asset_id: string
  ts: string
  risk_type: string
  risk_level: BackendRiskLevel
  notes: string
}

interface BackendAssetHistory {
  asset_id: string
  period_label: string
  metric_name: string
  metric_value: number
  notes: string | null
}

interface BackendAssetDetail {
  asset: BackendAssetOverview
  latest_reading: BackendAssetReading | null
  latest_risk: BackendAssetRisk | null
  prediction: BackendAssetRisk | null
  history: BackendAssetHistory[]
}

interface BackendRecommendation {
  recommendation_id: string
  asset_id: string
  created_at: string
  recommendation: string
  reason: string
  evidence: string
  priority: Priority
  expected_impact: string
  confidence_pct: number
  status: "pending_approval" | "approved" | "rejected"
  approved_by: string | null
  approved_at: string | null
}

interface BackendWeatherReading {
  ts: string
  rainfall_mm: number
  temp_c: number
  humidity_pct: number
  wind_speed_kmh: number
  source: string
}

interface BackendAssetStatusSummary {
  asset_id: string
  asset_type: AssetType
  name: string
  health_score: number
  status: AssetStatus
}

interface BackendDashboardSummary {
  date: string
  farm_health_score: number
  active_alerts: BackendAssetRisk[]
  tasks_due_today: BackendRecommendation[]
  asset_count: number
  weather: BackendWeatherReading | null
  top_recommendations: BackendRecommendation[]
  assets: BackendAssetStatusSummary[]
}

interface BackendBriefingToday {
  date: string
  approved_recommendations: BackendRecommendation[]
  rejected_recommendations: BackendRecommendation[]
  summary: string
}

interface BackendCopilotAnswer {
  question: string
  answer: string
}

// ---------------------------------------------------------------------------
// Cross-request lookup: several backend endpoints return a recommendation or
// alert keyed only by asset_id, with no asset name attached. Names get
// primed here whenever an asset list/detail response is mapped, so later
// mapping of recommendations/alerts in the same response is a cache hit.
// ---------------------------------------------------------------------------

const assetNameCache = new Map<string, string>()

async function ensureAssetName(assetId: string): Promise<string> {
  const cached = assetNameCache.get(assetId)
  if (cached) return cached
  try {
    const detail = await apiFetch<BackendAssetDetail>(`/assets/${assetId}`)
    assetNameCache.set(assetId, detail.asset.name)
    return detail.asset.name
  } catch {
    return assetId
  }
}

// ---------------------------------------------------------------------------
// Mapping helpers
// ---------------------------------------------------------------------------

// backend/app/services/asset_simulator.py GROWTH_STAGES, in order.
const GROWTH_STAGES = ["seedling", "vegetative", "reproductive", "ripening", "harvest_ready"]

function growthStageIndex(stage: string | null): number | undefined {
  if (!stage) return undefined
  const idx = GROWTH_STAGES.indexOf(stage)
  return idx >= 0 ? idx : undefined
}

// No direct "clarity" reading exists on the pond -- derived from the asset's
// own status, same murky/clear-by-status logic the prior frontend build used.
function waterClarityFromStatus(status: AssetStatus): number {
  if (status === "critical") return 0.15
  if (status === "needs_attention") return 0.5
  return 0.85
}

function mapRecStatus(status: BackendRecommendation["status"]): RecommendationStatus {
  return status === "pending_approval" ? "pending" : status
}

function mapAsset(a: BackendAssetOverview): Asset {
  assetNameCache.set(a.asset_id, a.name)
  return {
    id: a.asset_id,
    name: a.name,
    type: a.asset_type,
    grid_x: a.grid_x,
    grid_y: a.grid_y,
    status: a.status,
    health_score: a.health_score,
    visual: {
      growth_stage: growthStageIndex(a.growth_stage),
      harvest_readiness_pct: a.harvest_readiness_pct ?? undefined,
      water_clarity: a.asset_type === "fish_pond" ? waterClarityFromStatus(a.status) : undefined,
    },
  }
}

async function mapRecommendation(r: BackendRecommendation): Promise<Recommendation> {
  return {
    id: r.recommendation_id,
    asset_id: r.asset_id,
    asset_name: await ensureAssetName(r.asset_id),
    recommendation: r.recommendation,
    reason: r.reason,
    evidence: r.evidence,
    priority: r.priority,
    expected_impact: r.expected_impact,
    confidence: r.confidence_pct / 100,
    status: mapRecStatus(r.status),
    decided_by: r.approved_by ?? undefined,
    decided_at: r.approved_at ?? undefined,
  }
}

// active_alerts only ever surfaces high/critical rows (see backend/app/main.py
// dashboard_summary), so this only has to distinguish those two from a
// hypothetical medium/low leaking through.
function severityFromRiskLevel(level: BackendRiskLevel): AssetStatus {
  if (level === "critical") return "critical"
  if (level === "low") return "healthy"
  return "needs_attention"
}

async function mapAlert(a: BackendAssetRisk): Promise<Alert> {
  return {
    id: `${a.asset_id}-${a.ts}`,
    asset_id: a.asset_id,
    asset_name: await ensureAssetName(a.asset_id),
    severity: severityFromRiskLevel(a.risk_level),
    message: a.notes,
  }
}

// backend/app/services/risk_engine.py's own thresholds, mirrored here so a
// reading's color reflects the same rule the risk engine itself uses --
// not an invented judgment call.
function toneFor(key: keyof BackendAssetReading, value: number): Reading["tone"] | undefined {
  switch (key) {
    case "dissolved_oxygen_mg_l":
      if (value < 3.5) return "bad"
      if (value < 6.0) return "warn"
      return "good"
    case "water_temp_c":
      return value > 32 ? "warn" : "good"
    case "air_temp_c":
      return value > 32 ? "warn" : "good"
    case "feed_level_pct":
      return value < 15 ? "bad" : "good"
    case "soil_moisture_pct":
      if (value < 30 || value > 90) return "bad"
      return "good"
    case "nitrogen_ppm":
      return value < 10 ? "warn" : "good"
    case "disease_risk_pct":
      if (value > 40) return "bad"
      if (value > 20) return "warn"
      return "good"
    default:
      return undefined
  }
}

type ReadingField = { key: keyof BackendAssetReading; label: string; unit?: string }

// Matches backend/app/services/asset_simulator.py's per-type fields exactly
// (carried over from the prior frontend build's verified READING_FIELDS_BY_TYPE).
const READING_FIELDS_BY_TYPE: Record<AssetType, ReadingField[]> = {
  fish_pond: [
    { key: "water_temp_c", label: "Water temp", unit: "°C" },
    { key: "ph", label: "pH" },
    { key: "dissolved_oxygen_mg_l", label: "Dissolved O₂", unit: "mg/L" },
    { key: "feed_level_pct", label: "Feed level", unit: "%" },
    { key: "biomass_kg", label: "Biomass", unit: "kg" },
  ],
  chicken_coop: [
    { key: "egg_count", label: "Eggs today" },
    { key: "feed_level_pct", label: "Feed level", unit: "%" },
    { key: "air_temp_c", label: "Air temp", unit: "°C" },
    { key: "humidity_pct", label: "Humidity", unit: "%" },
    { key: "water_l", label: "Water volume", unit: "L" },
  ],
  rice_field: [
    { key: "growth_stage", label: "Growth stage" },
    { key: "soil_moisture_pct", label: "Soil moisture", unit: "%" },
    { key: "nitrogen_ppm", label: "Nitrogen", unit: "ppm" },
    { key: "irrigation_status", label: "Irrigation" },
  ],
  fruit_orchard: [
    { key: "growth_stage", label: "Growth stage" },
    { key: "soil_moisture_pct", label: "Soil moisture", unit: "%" },
    { key: "disease_risk_pct", label: "Disease risk", unit: "%" },
    { key: "harvest_readiness_pct", label: "Harvest readiness", unit: "%" },
  ],
}

function formatReadingValue(value: unknown, unit?: string): string {
  if (value === null || value === undefined || value === "") return "—"
  if (typeof value === "number") return unit ? `${value} ${unit}` : `${value}`
  return String(value).replace(/_/g, " ")
}

function mapReadings(type: AssetType, reading: BackendAssetReading | null): Reading[] {
  const fields = READING_FIELDS_BY_TYPE[type] ?? []
  return fields.map(({ key, label, unit }) => {
    const raw = reading?.[key] ?? null
    return {
      label,
      value: formatReadingValue(raw, unit),
      tone: typeof raw === "number" ? toneFor(key, raw) : undefined,
    }
  })
}

function mapHistory(history: BackendAssetHistory[]): HistoryEvent[] {
  return history.map((h) => ({
    id: `${h.period_label}-${h.metric_name}`,
    at: h.period_label,
    text: `${h.metric_name.replace(/_/g, " ")}: ${h.metric_value}${h.notes ? ` — ${h.notes}` : ""}`,
  }))
}

function mapWeather(w: BackendWeatherReading | null): Weather {
  if (!w) {
    return { temp_c: 0, humidity_pct: 0, rainfall_mm: 0, wind_kph: 0, condition: "No weather data" }
  }
  const condition = w.rainfall_mm > 2 ? "Rain" : w.rainfall_mm > 0.5 ? "Light showers" : "Clear"
  return {
    temp_c: w.temp_c,
    humidity_pct: w.humidity_pct,
    rainfall_mm: w.rainfall_mm,
    wind_kph: w.wind_speed_kmh,
    condition,
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getAssets(): Promise<Asset[]> {
  const rows = await apiFetch<BackendAssetOverview[]>("/assets")
  return rows.map(mapAsset)
}

export async function getAsset(id: string): Promise<AssetDetail> {
  const [detail, recs] = await Promise.all([
    apiFetch<BackendAssetDetail>(`/assets/${id}`),
    apiFetch<BackendRecommendation[]>(`/assets/${id}/recommendations`),
  ])
  const base = mapAsset(detail.asset)
  // /assets/{id}/recommendations only ever returns pending_approval rows
  // (backend/app/main.py), so every one of these is genuinely still due --
  // "today's tasks" framed as this asset's pending recommendations, per
  // docs/ui-build-plan.md Screen 3.
  const tasks: Task[] = recs.map((r) => ({
    id: r.recommendation_id,
    asset_id: r.asset_id,
    label: r.recommendation,
    done: false,
  }))
  return {
    ...base,
    risk_level: detail.asset.status,
    readings: mapReadings(detail.asset.asset_type, detail.latest_reading),
    prediction: detail.prediction?.notes ?? "No prediction available yet.",
    tasks,
    history: mapHistory(detail.history),
  }
}

export async function getAssetRecommendations(assetId: string): Promise<Recommendation[]> {
  const rows = await apiFetch<BackendRecommendation[]>(`/assets/${assetId}/recommendations`)
  return Promise.all(rows.map(mapRecommendation))
}

export async function approveRecommendation(id: string, approvedBy = "farm_manager"): Promise<Recommendation> {
  const row = await apiFetch<BackendRecommendation>(`/recommendations/${id}/approve`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  })
  return mapRecommendation(row)
}

export async function rejectRecommendation(id: string, approvedBy = "farm_manager"): Promise<Recommendation> {
  const row = await apiFetch<BackendRecommendation>(`/recommendations/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ approved_by: approvedBy }),
  })
  return mapRecommendation(row)
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const s = await apiFetch<BackendDashboardSummary>("/dashboard/summary")

  // Prime the name cache from the farm-wide asset list before mapping
  // alerts/recommendations below, so those lookups never need an extra
  // network round-trip.
  s.assets.forEach((a) => assetNameCache.set(a.asset_id, a.name))

  const statusOrder: AssetStatus[] = ["critical", "needs_attention", "healthy"]
  const status_overview = statusOrder.map((status) => ({
    status,
    count: s.assets.filter((a) => a.status === status).length,
  }))

  const [active_alerts, tasks_today, recommendations] = await Promise.all([
    Promise.all(s.active_alerts.map(mapAlert)),
    Promise.all(
      s.tasks_due_today.map(async (r) => ({
        id: r.recommendation_id,
        asset_id: r.asset_id,
        label: r.recommendation,
        done: false,
      })),
    ),
    Promise.all(s.top_recommendations.map(mapRecommendation)),
  ])

  return {
    farm_health_score: s.farm_health_score,
    weather: mapWeather(s.weather),
    active_alerts,
    tasks_today,
    status_overview,
    recommendations,
  }
}

export async function getBriefing(): Promise<Briefing> {
  const b = await apiFetch<BackendBriefingToday>("/briefing/today")
  const decisions = await Promise.all(
    [...b.approved_recommendations, ...b.rejected_recommendations].map(mapRecommendation),
  )
  decisions.sort((a, b2) => (a.decided_at ?? "").localeCompare(b2.decided_at ?? "") * -1)
  return { date: b.date, summary: b.summary, decisions }
}

export function askCopilot(question: string): Promise<CopilotAnswer> {
  return apiFetch<BackendCopilotAnswer>("/copilot/ask", {
    method: "POST",
    body: JSON.stringify({ question }),
  })
}
