export type AssetType = "fish_pond" | "chicken_coop" | "rice_field" | "fruit_orchard"

export type AssetStatus = "critical" | "needs_attention" | "healthy"

export type Priority = "high" | "medium" | "low"

export type RecommendationStatus = "pending" | "approved" | "rejected"

export interface Reading {
  label: string
  value: string
  /** optional health hint used purely for coloring the reading */
  tone?: "good" | "warn" | "bad"
}

/** Fields the map markers react to (real backend fields, not decoration). */
export interface AssetVisualState {
  /** rice: 0-4 growth stage index -> blade height/color */
  growth_stage?: number
  /** orchard: 0-100 -> fruit-dot count/color */
  harvest_readiness_pct?: number
  /** pond: derived clarity, 0 (murky) - 1 (clear) */
  water_clarity?: number
}

export interface Asset {
  id: string
  name: string
  type: AssetType
  grid_x: number
  grid_y: number
  status: AssetStatus
  health_score: number
  visual: AssetVisualState
}

export interface AssetDetail extends Asset {
  readings: Reading[]
  risk_level: AssetStatus
  prediction: string
  tasks: Task[]
  history: HistoryEvent[]
}

export interface Recommendation {
  id: string
  asset_id: string
  asset_name: string
  recommendation: string
  reason: string
  evidence: string
  priority: Priority
  expected_impact: string
  confidence: number
  status: RecommendationStatus
  decided_by?: string
  decided_at?: string
}

export interface Alert {
  id: string
  asset_id: string
  asset_name: string
  severity: AssetStatus
  message: string
}

export interface Task {
  id: string
  asset_id?: string
  label: string
  done: boolean
}

export interface HistoryEvent {
  id: string
  at: string
  text: string
}

export interface Weather {
  temp_c: number
  humidity_pct: number
  rainfall_mm: number
  wind_kph: number
  condition: string
}

export interface StatusCount {
  status: AssetStatus
  count: number
}

export interface DashboardSummary {
  farm_health_score: number
  weather: Weather
  active_alerts: Alert[]
  tasks_today: Task[]
  status_overview: StatusCount[]
  recommendations: Recommendation[]
}

export interface Briefing {
  date: string
  summary: string
  decisions: Recommendation[]
}

export interface CopilotAnswer {
  answer: string
}
