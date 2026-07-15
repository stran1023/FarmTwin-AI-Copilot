"use client"

import { CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react"
import { getAssets, getBriefing } from "@/lib/api"
import { useApiData } from "@/lib/useApiData"
import { Card } from "@/components/Card"
import { PriorityBadge } from "@/components/RiskBadge"
import { BriefingOverview } from "@/components/BriefingOverview"
import { cn } from "@/lib/utils"
import type { Asset, RecommendationStatus } from "@/lib/types"

const STATUS_META: Record<RecommendationStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  approved: { label: "Approved", icon: CheckCircle2, className: "text-primary" },
  rejected: { label: "Rejected", icon: XCircle, className: "text-destructive" },
  pending: { label: "Pending", icon: Clock, className: "text-muted-foreground" },
}

export function BriefingView() {
  const { data: briefing, loading, error } = useApiData("briefing", getBriefing)
  // Shares the "assets" cache key the Farm view already uses (lib/dataCache.ts)
  // -- a free cache hit if the user visited "/" this session, one extra
  // GET /assets otherwise. Used only to show each asset's real current
  // status next to the overview, not to re-derive anything about the summary.
  const { data: assets } = useApiData<Asset[]>("assets", getAssets)

  return (
    <div className="mx-auto w-full max-w-3xl px-5 py-8">
      <header className="mb-8 flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <CalendarDays className="h-6 w-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="font-serif text-3xl font-semibold leading-tight text-balance">Daily Briefing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {briefing?.date ?? "Loading today's farm summary..."}
          </p>
        </div>
      </header>

      {loading && <SkeletonBriefing />}

      {Boolean(error) && (
        <Card className="p-6 text-sm text-destructive">Unable to load the briefing right now.</Card>
      )}

      {briefing && !loading && (
        <div className="space-y-8">
          <BriefingOverview briefing={briefing} assets={assets} />

          <section>
            <h2 className="mb-4 font-serif text-xl font-semibold">Decision Log</h2>
            <div className="relative space-y-4 border-l border-border pl-6">
              {briefing.decisions.map((rec) => {
                const meta = STATUS_META[rec.status]
                const Icon = meta.icon
                return (
                  <div key={rec.id} className="relative">
                    <span className="absolute -left-[31px] top-1 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-card">
                      <Icon className={cn("h-3.5 w-3.5", meta.className)} aria-hidden="true" />
                    </span>
                    <Card className="p-4">
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span className="text-sm font-semibold">{rec.asset_name}</span>
                        <div className="flex items-center gap-2">
                          <PriorityBadge priority={rec.priority} />
                          <span className={cn("text-xs font-medium", meta.className)}>{meta.label}</span>
                        </div>
                      </div>
                      <p className="text-sm leading-relaxed text-foreground/90">{rec.recommendation}</p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        {rec.reason} {rec.decided_by ? `· ${meta.label} by ${rec.decided_by}` : ""}
                      </p>
                    </Card>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function SkeletonBriefing() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  )
}
