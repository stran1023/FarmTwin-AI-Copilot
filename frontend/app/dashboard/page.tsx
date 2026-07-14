"use client";

import Link from "next/link";
import { getDashboardSummary } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { Card } from "@/components/Card";
import { RiskBadge } from "@/components/RiskBadge";
import { RecommendationCard } from "@/components/RecommendationCard";

function healthColor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function DashboardPage() {
  const { data: summary, error } = useApiData("dashboard-summary", getDashboardSummary);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Farm dashboard</h1>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {!summary && !error && <p className="text-zinc-500">Loading dashboard…</p>}

      {summary && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Card>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Farm health score</p>
              <p className={`text-4xl font-bold ${healthColor(summary.farm_health_score)}`}>
                {summary.farm_health_score}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active alerts</p>
              <p className="text-4xl font-bold text-zinc-950 dark:text-zinc-50">
                {summary.active_alerts.length}
              </p>
            </Card>
            <Card>
              <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">Tasks due today</p>
              <p className="text-4xl font-bold text-zinc-950 dark:text-zinc-50">
                {summary.tasks_due_today.length}
              </p>
            </Card>
          </div>

          {summary.weather && (
            <Card>
              <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Weather</p>
              <div className="flex flex-wrap gap-4 text-sm text-zinc-800 dark:text-zinc-200">
                <span>🌡️ {summary.weather.temp_c.toFixed(1)}°C</span>
                <span>💧 {summary.weather.humidity_pct.toFixed(0)}% humidity</span>
                <span>🌧️ {summary.weather.rainfall_mm.toFixed(1)} mm rain</span>
                <span>💨 {summary.weather.wind_speed_kmh.toFixed(0)} km/h wind</span>
              </div>
            </Card>
          )}

          {summary.active_alerts.length > 0 && (
            <Card>
              <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Active alerts</p>
              <div className="flex flex-col">
                {summary.active_alerts.map((alert) => (
                  <div
                    key={`${alert.asset_id}-${alert.risk_type}`}
                    className="flex items-start justify-between gap-3 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800"
                  >
                    <div>
                      <Link href={`/assets/${alert.asset_id}`} className="font-medium text-zinc-900 hover:underline dark:text-zinc-100">
                        {alert.asset_id}
                      </Link>
                      <p className="text-sm text-zinc-600 dark:text-zinc-400">{alert.notes}</p>
                    </div>
                    <RiskBadge level={alert.risk_level} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card>
            <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Daily recommendations
            </p>
            {summary.top_recommendations.length === 0 ? (
              <p className="text-sm text-zinc-500">No pending recommendations.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {summary.top_recommendations.map((rec) => (
                  <RecommendationCard key={rec.recommendation_id} recommendation={rec} />
                ))}
              </div>
            )}
          </Card>

          <Card>
            <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Asset status overview
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {summary.assets.map((asset) => (
                <Link
                  key={asset.asset_id}
                  href={`/assets/${asset.asset_id}`}
                  className="rounded-lg border border-zinc-200 p-3 text-center hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{asset.name}</p>
                  <p className={`text-2xl font-bold ${healthColor(asset.health_score)}`}>
                    {asset.health_score}
                  </p>
                  <p className="text-xs capitalize text-zinc-500 dark:text-zinc-400">
                    {asset.status.replace("_", " ")}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
