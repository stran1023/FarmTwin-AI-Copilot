"use client"

import { useState } from "react"
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Gauge,
  History,
  Sparkles,
  Sprout,
  TrendingUp,
} from "lucide-react"
import type { AssetDetail, HarvestPlan, Recommendation, AssetType, ScenarioResult } from "@/lib/types"
import {
  approveRecommendation,
  getAsset,
  getAssetRecommendations,
  getHarvestPlan,
  rejectRecommendation,
  simulateScenario,
} from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import { invalidate } from "@/lib/dataCache"
import { renderInlineMarkdown, splitIntoSentences } from "@/lib/markdown"
import { Card, CardHeader } from "./Card"
import { RiskBadge } from "./RiskBadge"
import { RecommendationCard } from "./RecommendationCard"
import { FishPondMarker } from "./FishPondMarker"
import { ChickenCoopMarker } from "./ChickenCoopMarker"
import { RiceFieldMarker } from "./RiceFieldMarker"
import { FruitOrchardMarker } from "./FruitOrchardMarker"
import { GreenhouseMarker } from "./GreenhouseMarker"

const TYPE_LABEL: Record<AssetType, string> = {
  fish_pond: "Fish Pond",
  chicken_coop: "Chicken Coop",
  rice_field: "Rice Field",
  fruit_orchard: "Fruit Orchard",
  greenhouse: "Greenhouse",
}

function AssetGlyph({ asset }: { asset: AssetDetail }) {
  const map: Record<AssetType, React.ReactNode> = {
    fish_pond: <FishPondMarker asset={asset} />,
    chicken_coop: <ChickenCoopMarker asset={asset} />,
    rice_field: <RiceFieldMarker asset={asset} />,
    fruit_orchard: <FruitOrchardMarker asset={asset} />,
    greenhouse: <GreenhouseMarker asset={asset} />,
  }
  return <>{map[asset.type]}</>
}

const TONE_CLASS: Record<string, string> = {
  good: "text-healthy",
  warn: "text-warning-foreground",
  bad: "text-critical",
}

// Mirrors backend/app/main.py's _HARVEST_PLANNER_ASSET_TYPES -- only these
// 3 types have a HARVEST_RULES row, so this card only renders for them
// (calling getHarvestPlan for any other type 400s).
const HARVEST_PLANNER_TYPES: AssetType[] = ["rice_field", "fruit_orchard", "greenhouse"]

function HarvestPlannerCard({ assetId }: { assetId: string }) {
  const { data: plan, loading } = useApiData<HarvestPlan>(`harvest-plan:${assetId}`, () =>
    getHarvestPlan(assetId),
  )

  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <Sprout className="size-4 text-primary" aria-hidden="true" />
        Harvest Planner
      </h3>
      {loading || !plan ? (
        <div className="mt-2 h-10 animate-pulse rounded bg-muted" />
      ) : (
        <>
          <p className={`mt-2 text-sm font-semibold text-pretty ${plan.is_ready ? "text-healthy" : ""}`}>
            {plan.eta_description}
          </p>
          <div className="mt-2 space-y-1.5">
            {splitIntoSentences(plan.narrative).map((sentence, i) => (
              <p key={i} className="text-sm leading-relaxed text-pretty text-muted-foreground">
                {renderInlineMarkdown(sentence)}
              </p>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

function actionLabel(action: string): string {
  return action === "no_action" ? "Do nothing" : action.replace(/_/g, " ")
}

// Unlike HarvestPlannerCard, this mounts for every asset type -- the
// backend gracefully returns is_available: false for a healthy asset
// (200, not a 400), so there's no wrong-type case to gate the mount on.
function ScenarioSimulatorCard({ assetId }: { assetId: string }) {
  const { data: baseline, loading } = useApiData<ScenarioResult>(`scenario:${assetId}`, () =>
    simulateScenario(assetId, null),
  )
  const [selectedAction, setSelectedAction] = useState("")
  const [result, setResult] = useState<ScenarioResult | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function runSimulation() {
    if (!selectedAction) return
    setSubmitting(true)
    try {
      setResult(await simulateScenario(assetId, selectedAction))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || !baseline) {
    return (
      <Card className="p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold">
          <FlaskConical className="size-4 text-primary" aria-hidden="true" />
          Scenario Simulator
        </h3>
        <div className="mt-2 h-10 animate-pulse rounded bg-muted" />
      </Card>
    )
  }

  // No active, trackable risk on this asset right now -- nothing to
  // simulate, so the card contributes nothing to the page.
  if (!baseline.is_available) {
    return null
  }

  return (
    <Card className="p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <FlaskConical className="size-4 text-primary" aria-hidden="true" />
        Scenario Simulator
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">
        {baseline.metric?.replace(/_/g, " ")} is currently {baseline.current_value}, trending{" "}
        {baseline.baseline_delta_per_hour}/hr without intervention.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={selectedAction}
          onChange={(e) => {
            setSelectedAction(e.target.value)
            setResult(null)
          }}
          className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm"
        >
          <option value="">What if I…</option>
          {baseline.available_actions.map((action) => (
            <option key={action} value={action}>
              {actionLabel(action)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={runSimulation}
          disabled={!selectedAction || submitting}
          className="rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity disabled:opacity-50"
        >
          {submitting ? "Simulating…" : "Simulate"}
        </button>
      </div>

      {result && result.projections.length > 0 && (
        <>
          <p className="mt-3 text-[11px] font-medium text-muted-foreground">
            Without action → with {actionLabel(result.action ?? "")}
          </p>
          <dl className="mt-1 grid grid-cols-2 gap-2">
            {result.projections.map((p) => (
              <div key={p.horizon_hours} className="rounded-lg bg-secondary/60 px-2.5 py-1.5">
                <dt className="text-[10px] font-medium text-muted-foreground">In {p.horizon_hours}h</dt>
                <dd className="text-sm font-bold tabular-nums">
                  {p.without_action} → {p.with_action}
                </dd>
              </div>
            ))}
          </dl>
        </>
      )}

      {result?.narrative && (
        <div className="mt-3 space-y-1.5">
          {splitIntoSentences(result.narrative).map((sentence, i) => (
            <p key={i} className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {renderInlineMarkdown(sentence)}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
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
  // Collapsed by default (progressive disclosure), same pattern as
  // RecommendationCard's "View details" toggle (feat-036).
  const [showHistory, setShowHistory] = useState(false)

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
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            aria-expanded={showHistory}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <History className="size-3.5" aria-hidden="true" />
            History
            {showHistory ? (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            )}
          </button>
        </div>

        {showHistory && (
          <div className="mt-4 border-t border-border pt-4">
            <ul className="flex flex-col gap-3">
              {asset.history.length === 0 && (
                <li className="text-sm text-muted-foreground">No history recorded.</li>
              )}
              {asset.history.map((h) => (
                <li key={h.id} className="relative pl-4 text-sm">
                  <span className="absolute left-0 top-1.5 size-2 rounded-full bg-primary" aria-hidden="true" />
                  <span className="block text-[11px] font-medium text-muted-foreground">{h.at}</span>
                  <span className="block text-pretty">{h.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
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

      {HARVEST_PLANNER_TYPES.includes(asset.type) && <HarvestPlannerCard assetId={asset.id} />}

      <ScenarioSimulatorCard assetId={asset.id} />

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
    </div>
  )
}
