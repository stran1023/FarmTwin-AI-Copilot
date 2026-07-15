"use client"

import { CheckCircle2, TrendingUp, XCircle } from "lucide-react"
import type { Asset, Briefing, Priority } from "@/lib/types"
import { renderInlineMarkdown, splitIntoSentences } from "@/lib/markdown"
import { cn } from "@/lib/utils"
import { Card } from "./Card"
import { PriorityBadge, RiskBadge } from "./RiskBadge"

interface PrimaryAsset {
  id: string
  name: string
  approved: number
  rejected: number
  topConfidence: number
  topPriority: Priority
}

/** The asset with the most decisions today (ties broken by decision
 * order), used to headline the overview -- derived from the real
 * decisions list, not parsed out of the prose. */
function primaryAsset(decisions: Briefing["decisions"]): PrimaryAsset | null {
  if (decisions.length === 0) return null

  const counts = new Map<string, number>()
  for (const d of decisions) counts.set(d.asset_id, (counts.get(d.asset_id) ?? 0) + 1)

  let bestId = decisions[0].asset_id
  let bestCount = 0
  counts.forEach((count, id) => {
    if (count > bestCount) {
      bestCount = count
      bestId = id
    }
  })

  const forAsset = decisions.filter((d) => d.asset_id === bestId)
  const priorityRank: Record<Priority, number> = { high: 2, medium: 1, low: 0 }
  const topPriority = forAsset.reduce<Priority>(
    (top, d) => (priorityRank[d.priority] > priorityRank[top] ? d.priority : top),
    "low",
  )

  return {
    id: bestId,
    name: forAsset[0].asset_name,
    approved: forAsset.filter((d) => d.status === "approved").length,
    rejected: forAsset.filter((d) => d.status === "rejected").length,
    topConfidence: Math.max(...forAsset.map((d) => d.confidence)),
    topPriority,
  }
}

function DotChip({ asset }: { asset: Asset }) {
  const dot =
    asset.status === "critical" ? "bg-critical" : asset.status === "needs_attention" ? "bg-warning" : "bg-healthy"
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground/80">
      <span className={cn("size-1.5 shrink-0 rounded-full", dot)} aria-hidden="true" />
      {asset.name}
    </span>
  )
}

export function BriefingOverview({ briefing, assets }: { briefing: Briefing; assets?: Asset[] }) {
  const sentences = splitIntoSentences(briefing.summary)
  const primary = primaryAsset(briefing.decisions)
  const primaryStatus = assets?.find((a) => a.id === primary?.id)?.status
  const otherAssets = assets?.filter((a) => a.id !== primary?.id) ?? []

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 px-6 pt-6 text-primary">
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Overview</h2>
      </div>

      {/* Primary incident -- visually separated from the prose and from
          the rest of the farm's status below, sourced from real decision/
          asset data rather than parsed out of the free-text summary. */}
      {primary && (
        <div className="mx-6 mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-secondary/40 px-4 py-3">
          <span className="text-sm font-bold">{primary.name}</span>
          {primaryStatus && <RiskBadge status={primaryStatus} />}
          <PriorityBadge priority={primary.topPriority} />
          <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {Math.round(primary.topConfidence * 100)}% confidence
          </span>
          {primary.approved > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-healthy/15 px-2.5 py-1 text-xs font-semibold text-healthy">
              <CheckCircle2 className="size-3.5" aria-hidden="true" />
              {primary.approved} approved
            </span>
          )}
          {primary.rejected > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              <XCircle className="size-3.5" aria-hidden="true" />
              {primary.rejected} rejected
            </span>
          )}
        </div>
      )}

      {/* Prose, split into one short paragraph per sentence for
          scanability, real bold rendering (no raw "**"), a comfortable
          line length and line height. */}
      <div className="max-w-[68ch] space-y-3 px-6 py-5">
        {sentences.map((sentence, i) => (
          <p key={i} className="text-[15px] leading-[1.7] text-foreground/90 text-pretty">
            {renderInlineMarkdown(sentence)}
          </p>
        ))}
      </div>

      {otherAssets.length > 0 && (
        <div className="border-t border-border bg-secondary/20 px-6 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Rest of the farm
          </p>
          <div className="flex flex-wrap gap-2">
            {otherAssets.map((a) => (
              <DotChip key={a.id} asset={a} />
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}
