"use client"

import { useState } from "react"
import { ArrowLeft, ClipboardList, Gauge, History, Sparkles, TrendingUp } from "lucide-react"
import type { AssetDetail, Recommendation, AssetType } from "@/lib/types"
import { approveRecommendation, getAsset, getAssetRecommendations, rejectRecommendation } from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import { invalidate } from "@/lib/dataCache"
import { Card, CardHeader } from "./Card"
import { RiskBadge } from "./RiskBadge"
import { RecommendationCard } from "./RecommendationCard"
import { FishPondMarker } from "./FishPondMarker"
import { ChickenCoopMarker } from "./ChickenCoopMarker"
import { RiceFieldMarker } from "./RiceFieldMarker"
import { FruitOrchardMarker } from "./FruitOrchardMarker"

const TYPE_LABEL: Record<AssetType, string> = {
  fish_pond: "Fish Pond",
  chicken_coop: "Chicken Coop",
  rice_field: "Rice Field",
  fruit_orchard: "Fruit Orchard",
}

function AssetGlyph({ asset }: { asset: AssetDetail }) {
  const map: Record<AssetType, React.ReactNode> = {
    fish_pond: <FishPondMarker asset={asset} />,
    chicken_coop: <ChickenCoopMarker asset={asset} />,
    rice_field: <RiceFieldMarker asset={asset} />,
    fruit_orchard: <FruitOrchardMarker asset={asset} />,
  }
  return <>{map[asset.type]}</>
}

const TONE_CLASS: Record<string, string> = {
  good: "text-healthy",
  warn: "text-warning-foreground",
  bad: "text-critical",
}

export function AssetDetailPanel({
  assetId,
  onBack,
}: {
  assetId: string
  onBack: () => void
}) {
  const { data: asset, loading } = useApiData<AssetDetail>(`asset:${assetId}`, () =>
    getAsset(assetId),
  )
  const { data: recs } = useApiData<Recommendation[]>(`asset-recs:${assetId}`, () =>
    getAssetRecommendations(assetId),
  )
  const [busyId, setBusyId] = useState<string | null>(null)

  async function decide(id: string, kind: "approve" | "reject") {
    setBusyId(id)
    try {
      if (kind === "approve") await approveRecommendation(id)
      else await rejectRecommendation(id)
      // A write on this panel is reflected everywhere via shared cache keys.
      invalidate("dashboard-summary")
      invalidate("assets")
      invalidate(`asset:${assetId}`)
      invalidate(`asset-recs:${assetId}`)
    } finally {
      setBusyId(null)
    }
  }

  if (loading || !asset) {
    return (
      <div className="flex flex-col gap-4 p-4" aria-hidden="true">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        <div className="h-56 animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to dashboard
      </button>

      {/* Header */}
      <Card className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary/60">
            <AssetGlyph asset={asset} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {TYPE_LABEL[asset.type]}
            </p>
            <h2 className="text-lg font-extrabold tracking-tight text-balance">{asset.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <RiskBadge status={asset.risk_level} />
              <span className="text-xs font-medium text-muted-foreground">
                Health {asset.health_score}/100
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Sensor readings */}
      <Card>
        <CardHeader title="Live Sensor Readings" icon={<Gauge className="size-4 text-primary" aria-hidden="true" />} />
        <dl className="grid grid-cols-2 gap-2 p-4 pt-3">
          {asset.readings.map((r) => (
            <div key={r.label} className="rounded-xl bg-secondary/60 px-3 py-2">
              <dt className="text-[11px] font-medium text-muted-foreground">{r.label}</dt>
              <dd className={`text-base font-bold tabular-nums ${r.tone ? TONE_CLASS[r.tone] : ""}`}>
                {r.value}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* AI prediction */}
      <Card className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <TrendingUp className="size-4 text-primary" aria-hidden="true" />
          AI Prediction
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-pretty">{asset.prediction}</p>
      </Card>

      {/* Recommendations with working approve/reject */}
      <section className="flex flex-col gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          Recommendations
        </h3>
        {(recs ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">No recommendations for this asset.</p>
        )}
        {(recs ?? []).map((rec) => (
          <RecommendationCard
            key={rec.id}
            rec={rec}
            busy={busyId === rec.id}
            onApprove={(id) => decide(id, "approve")}
            onReject={(id) => decide(id, "reject")}
          />
        ))}
      </section>

      {/* Tasks + history */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader title="Today's Tasks" icon={<ClipboardList className="size-4 text-primary" aria-hidden="true" />} />
          <ul className="flex flex-col gap-2 p-4 pt-3">
            {asset.tasks.length === 0 && (
              <li className="text-sm text-muted-foreground">No tasks scheduled.</li>
            )}
            {asset.tasks.map((t) => (
              <li key={t.id} className="flex items-start gap-2 text-sm">
                <span
                  className={`mt-0.5 size-3.5 shrink-0 rounded border ${
                    t.done ? "border-healthy bg-healthy" : "border-border"
                  }`}
                  aria-hidden="true"
                />
                <span className={t.done ? "text-muted-foreground line-through" : ""}>{t.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader title="History" icon={<History className="size-4 text-primary" aria-hidden="true" />} />
          <ul className="flex flex-col gap-3 p-4 pt-3">
            {asset.history.map((h) => (
              <li key={h.id} className="relative pl-4 text-sm">
                <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                <span className="block text-[11px] font-medium text-muted-foreground">{h.at}</span>
                <span className="block text-pretty">{h.text}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
