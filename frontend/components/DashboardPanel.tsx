"use client"

import {
  BellRing,
  CheckCircle2,
  CloudRain,
  Droplets,
  ListChecks,
  Sparkles,
  Thermometer,
  Wind,
} from "lucide-react"
import type { DashboardSummary } from "@/lib/types"
import { getDashboardSummary } from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import { Card, CardHeader } from "./Card"
import { HealthGauge } from "./HealthGauge"
import { RiskBadge } from "./RiskBadge"
import { RecommendationCard } from "./RecommendationCard"

export function DashboardPanel({
  onSelectAsset,
  onHoverAsset,
}: {
  onSelectAsset: (id: string) => void
  onHoverAsset?: (id: string | null) => void
}) {
  const { data, loading } = useApiData<DashboardSummary>("dashboard-summary", getDashboardSummary)

  if (loading || !data) {
    return <PanelSkeleton />
  }

  const { farm_health_score, weather, active_alerts, tasks_today, status_overview, recommendations } =
    data

  return (
    <div className="flex flex-col gap-4 p-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Farm overview
        </p>
        <h2 className="text-xl font-extrabold tracking-tight text-balance">Good day on the farm</h2>
      </header>

      {/* Health + weather */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center p-4">
          <HealthGauge score={farm_health_score} />
        </Card>
        <Card className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Weather
              </p>
              <p className="mt-1 flex items-start text-4xl font-extrabold tabular-nums">
                {Math.round(weather.temp_c)}
                <span className="mt-1 text-lg">°C</span>
              </p>
              <p className="text-xs font-medium text-muted-foreground">{weather.condition}</p>
            </div>
            <Thermometer className="size-6 text-accent" aria-hidden="true" />
          </div>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <WeatherStat icon={<Droplets className="size-3.5" />} label="Humidity" value={`${weather.humidity_pct}%`} />
            <WeatherStat icon={<CloudRain className="size-3.5" />} label="Rain" value={`${weather.rainfall_mm} mm`} />
            <WeatherStat icon={<Wind className="size-3.5" />} label="Wind" value={`${weather.wind_kph} kph`} />
          </dl>
        </Card>
      </div>

      {/* Active alerts */}
      <Card>
        <CardHeader
          title="Active Alerts"
          icon={<BellRing className="size-4 text-critical" aria-hidden="true" />}
          action={
            <span className="rounded-full bg-critical/15 px-2 py-0.5 text-xs font-bold text-critical">
              {active_alerts.length}
            </span>
          }
        />
        <div className="flex flex-col gap-2 p-4 pt-3">
          {active_alerts.length === 0 && (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="size-4 text-healthy" aria-hidden="true" />
              No active alerts. Everything looks calm.
            </p>
          )}
          {active_alerts.map((alert) => (
            <button
              key={alert.id}
              type="button"
              onClick={() => onSelectAsset(alert.asset_id)}
              onMouseEnter={() => onHoverAsset?.(alert.asset_id)}
              onMouseLeave={() => onHoverAsset?.(null)}
              className="flex w-full items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:bg-secondary"
            >
              <RiskBadge status={alert.severity} />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{alert.asset_name}</span>
                <span className="block text-sm text-muted-foreground text-pretty">
                  {alert.message}
                </span>
              </span>
            </button>
          ))}
        </div>
      </Card>

      {/* Tasks + status */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader
            title="Tasks Due Today"
            icon={<ListChecks className="size-4 text-primary" aria-hidden="true" />}
          />
          <ul className="flex flex-col gap-2 p-4 pt-3">
            {tasks_today.map((task) => (
              <li key={task.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-md border ${
                    task.done ? "border-healthy bg-healthy text-healthy-foreground" : "border-border"
                  }`}
                  aria-hidden="true"
                >
                  {task.done && <CheckCircle2 className="size-3" />}
                </span>
                <span className={task.done ? "text-muted-foreground line-through" : ""}>
                  {task.label}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Asset Status" />
          <div className="flex flex-col gap-2 p-4 pt-3">
            {status_overview.map((row) => (
              <div
                key={row.status}
                className="flex items-center justify-between rounded-xl bg-secondary/60 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm font-medium">
                  <RiskBadge status={row.status} />
                </span>
                <span className="text-sm font-bold tabular-nums">{row.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recommendations */}
      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          Daily Recommendations
        </h3>
        {recommendations.length === 0 && (
          <p className="text-sm text-muted-foreground">
            All caught up — no pending recommendations right now.
          </p>
        )}
        {recommendations.map((rec) => (
          // A plain <div role="button">, not a real <button> -- RecommendationCard
          // renders its own interactive buttons (View details/Approve/Reject),
          // and a <button> cannot contain a nested <button> (invalid HTML,
          // breaks hydration).
          <div
            key={rec.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelectAsset(rec.asset_id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onSelectAsset(rec.asset_id)
              }
            }}
            onMouseEnter={() => onHoverAsset?.(rec.asset_id)}
            onMouseLeave={() => onHoverAsset?.(null)}
            className="block w-full cursor-pointer text-left"
            aria-label={`Open ${rec.asset_name} to act on this recommendation`}
          >
            <RecommendationCard rec={rec} />
          </div>
        ))}
      </section>
    </div>
  )
}

function WeatherStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="rounded-lg bg-secondary/60 px-2 py-1.5">
      <dt className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm font-bold tabular-nums">{value}</dd>
    </div>
  )
}

function PanelSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4" aria-hidden="true">
      <div className="h-6 w-40 animate-pulse rounded bg-muted" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
      </div>
      <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      <div className="h-40 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}
