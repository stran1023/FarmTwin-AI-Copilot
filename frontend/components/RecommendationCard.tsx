"use client"

import { type ReactNode, useState } from "react"
import { Check, ChevronDown, ChevronUp, Sparkles, X } from "lucide-react"
import type { Recommendation } from "@/lib/types"
import { cn } from "@/lib/utils"
import { PriorityBadge } from "./RiskBadge"

interface RecommendationCardProps {
  rec: Recommendation
  /** Show working Approve/Reject controls (only in AssetDetailPanel). */
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
  busy?: boolean
  /** Extra content, e.g. the "approved by / when" line on the briefing screen. */
  children?: ReactNode
  className?: string
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm leading-relaxed">{value}</dd>
    </div>
  )
}

export function RecommendationCard({
  rec,
  onApprove,
  onReject,
  busy,
  children,
  className,
}: RecommendationCardProps) {
  // feat-036: collapsed by default (progressive disclosure).
  const [expanded, setExpanded] = useState(false)
  const showActions = Boolean(onApprove || onReject) && rec.status === "pending"

  return (
    <article
      className={cn(
        "rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={rec.priority} />
            <span className="text-xs font-medium text-muted-foreground">{rec.asset_name}</span>
          </div>
          <p className="mt-2 text-sm font-semibold leading-snug text-pretty">{rec.recommendation}</p>
        </div>
      </div>

      {expanded && (
        <dl className="mt-4 grid gap-3 border-t border-border pt-4">
          <Field label="Reason" value={rec.reason} />
          <Field label="Evidence" value={rec.evidence} />
          <Field label="Expected impact" value={rec.expected_impact} />
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Confidence
            </span>
            <div className="flex flex-1 items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.round(rec.confidence * 100)}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums">
                {Math.round(rec.confidence * 100)}%
              </span>
            </div>
          </div>
        </dl>
      )}

      {children}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setExpanded((v) => !v)
          }}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-primary transition-colors hover:bg-primary/10"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              Hide details <ChevronUp className="size-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              View details <ChevronDown className="size-3.5" aria-hidden="true" />
            </>
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {showActions && (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onReject?.(rec.id)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary disabled:opacity-50"
              >
                <X className="size-3.5" aria-hidden="true" />
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={(e) => {
                  e.stopPropagation()
                  onApprove?.(rec.id)
                }}
                className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-50"
              >
                <Check className="size-3.5" aria-hidden="true" />
                Approve
              </button>
            </>
          )}
          {rec.status === "approved" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-healthy/15 px-3 py-1.5 text-xs font-semibold text-healthy">
              <Check className="size-3.5" aria-hidden="true" />
              Approved
            </span>
          )}
          {rec.status === "rejected" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">
              <X className="size-3.5" aria-hidden="true" />
              Rejected
            </span>
          )}
        </div>
      </div>
    </article>
  )
}
