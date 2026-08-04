"use client"

import { CheckCircle2, CloudRain, Droplets, ListChecks, Thermometer, TrendingDown, TrendingUp, Wind } from "lucide-react"
import type { DashboardSummary } from "@/lib/types"
import { getDashboardSummary } from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import { useTickDiff } from "@/lib/useTickDiff"
import { Card, CardHeader } from "./Card"
import { HealthGauge } from "./HealthGauge"

export function DashboardPanel({
  onSelectAsset,
  onHoverAsset,
}: {
  onSelectAsset: (id: string) => void
  onHoverAsset?: (id: string | null) => void
}) {
  const { data, loading } = useApiData<DashboardSummary>("dashboard-summary", getDashboardSummary)
  const tickDiff = useTickDiff()

  if (loading || !data) {
    return <PanelSkeleton />
  }

  const { farm_health_score, weather, tasks_today } = data
  const healthDelta = tickDiff?.healthDelta ?? null

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
        <Card
          className="relative flex items-center p-4"
          style={healthDelta ? { animation: "value-flash 1.4s ease-out" } : undefined}
        >
          <HealthGauge score={farm_health_score} />
          {/* Real before/after delta from the most recent Run Farm Tick (feat-058) --
              distinct from HealthGauge's own session-scoped "Improving/Declining"
              trend arrow, which stays untouched. */}
          {healthDelta !== null && healthDelta !== 0 && (
            <span
              className={`absolute right-3 top-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${
                healthDelta > 0 ? "bg-healthy/15 text-healthy" : "bg-critical/15 text-critical"
              }`}
            >
              {healthDelta > 0 ? (
                <TrendingUp className="size-3.5" aria-hidden="true" />
              ) : (
                <TrendingDown className="size-3.5" aria-hidden="true" />
              )}
              {healthDelta > 0 ? `+${healthDelta}` : healthDelta}
            </span>
          )}
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
            <WeatherStat icon={<Droplets className="size-3.5" />} label="Humidity" value={`${Math.round(weather.humidity_pct)}%`} />
            <WeatherStat icon={<CloudRain className="size-3.5" />} label="Rain" value={`${Math.round(weather.rainfall_mm)} mm`} />
            <WeatherStat icon={<Wind className="size-3.5" />} label="Wind" value={`${Math.round(weather.wind_kph)} kph`} />
          </dl>
        </Card>
      </div>

      {/* Tasks due today -- asset status now lives on the map (bottom-center
          pill); active alerts and daily recommendations are visible directly
          on the map and in each asset's detail view, so they're not
          duplicated here. Each row is clickable straight to that asset's
          detail (with a hover highlight on the map first, to help locate it
          on an isometric scene with no text labels). */}
      <Card>
        <CardHeader
          title="Tasks Due Today"
          icon={<ListChecks className="size-4 text-primary" aria-hidden="true" />}
        />
        <ul className="flex flex-col gap-2 p-4 pt-3">
          {tasks_today.length === 0 && (
            <p className="text-sm text-muted-foreground">All caught up — no tasks due today.</p>
          )}
          {tasks_today.map((task) => {
            const checkbox = (
              <span
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-md border ${
                  task.done ? "border-healthy bg-healthy text-healthy-foreground" : "border-border"
                }`}
                aria-hidden="true"
              >
                {task.done && <CheckCircle2 className="size-3" />}
              </span>
            )
            const label = (
              <span className={task.done ? "text-muted-foreground line-through" : ""}>
                {task.label}
              </span>
            )
            if (!task.asset_id) {
              return (
                <li key={task.id} className="flex items-start gap-2 px-2 py-1.5 text-sm">
                  {checkbox}
                  {label}
                </li>
              )
            }
            const assetId = task.asset_id
            return (
              <li key={task.id}>
                <button
                  type="button"
                  onClick={() => onSelectAsset(assetId)}
                  onMouseEnter={() => onHoverAsset?.(assetId)}
                  onMouseLeave={() => onHoverAsset?.(null)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-secondary/60"
                >
                  {checkbox}
                  {label}
                </button>
              </li>
            )
          })}
        </ul>
      </Card>
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
      <dd className="mt-0.5 truncate text-sm font-bold tabular-nums">{value}</dd>
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
