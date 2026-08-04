"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Check, CircleDashed, Loader2, Search, TriangleAlert } from "lucide-react"
import { getWorkflowStatus } from "@/lib/api"
import type { WorkflowAssetProgress, WorkflowJobStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const POLL_INTERVAL_MS = 2000

/**
 * Live view into one real POST /workflow/run/start job -- polls
 * GET /workflow/run/status/{jobId} so a judge (or the demo video) can watch
 * the real Observe -> Understand -> Recommend -> Predict loop move through
 * each of the 5 real Farm Assets, instead of staring at a spinner for
 * several minutes with zero feedback.
 */
export function WorkflowProgressPanel({
  jobId,
  onDone,
  onClose,
}: {
  jobId: string
  onDone: (job: WorkflowJobStatus) => void
  onClose: () => void
}) {
  const [job, setJob] = useState<WorkflowJobStatus | null>(null)
  const doneFiredRef = useRef(false)

  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined
    doneFiredRef.current = false

    // Self-scheduling setTimeout, not setInterval -- each poll only queues
    // the next one after it resolves, so a slow request never overlaps with
    // another in-flight one. Reads the freshly-resolved `status` directly
    // rather than React state, so there's no stale-closure risk around
    // when to stop.
    async function poll() {
      try {
        const status = await getWorkflowStatus(jobId)
        if (cancelled) return
        setJob(status)
        if (status.status === "running") {
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
        } else if (!doneFiredRef.current) {
          doneFiredRef.current = true
          onDone(status)
        }
      } catch {
        // Transient poll failure -- retry on the same cadence rather than going quiet forever.
        if (!cancelled) timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onDone is fire-once (guarded by doneFiredRef); re-running this mount-scoped poll loop off its identity would wrongly restart polling
  }, [jobId])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Running farm tick</h2>
          {job && job.status !== "running" && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
            >
              Close
            </button>
          )}
        </div>

        {!job && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Starting...
          </div>
        )}

        {job && (
          <ul className="flex flex-col gap-2">
            {job.assets.map((asset) => (
              <AssetProgressRow key={asset.asset_id} asset={asset} />
            ))}
          </ul>
        )}

        {job?.status === "complete" && job.result && (
          <p className="mt-3 rounded-md border border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">
            Tick complete — {job.result.assetsAssessed} assets assessed, {job.result.highRiskCount} at risk.
          </p>
        )}

        {job?.status === "error" && (
          <p className="mt-3 flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {job.error ?? "The tick failed partway through."}
          </p>
        )}
      </div>
    </div>
  )
}

function AssetProgressRow({ asset }: { asset: WorkflowAssetProgress }) {
  const { icon, text, spinning } = describeStep(asset)
  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs">
      <span className={cn("shrink-0 text-muted-foreground", spinning && "animate-spin")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{asset.name}</span>
        <span className="ml-1.5 text-muted-foreground">{text}</span>
      </span>
    </li>
  )
}

function describeStep(asset: WorkflowAssetProgress): { icon: React.ReactNode; text: string; spinning: boolean } {
  const snippet = asset.metric_snippet ? ` (${asset.metric_snippet})` : ""

  switch (asset.step) {
    case "queued":
      return { icon: <CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />, text: "Waiting...", spinning: false }
    case "observing":
      return {
        icon: <Loader2 className="h-3.5 w-3.5" aria-hidden="true" />,
        text: "Observing sensor reading...",
        spinning: true,
      }
    case "assessing":
      return {
        icon: <Search className="h-3.5 w-3.5" aria-hidden="true" />,
        text: `Assessing risk${snippet}...`,
        spinning: false,
      }
    case "consulting_agent":
      return {
        icon: <Bot className="h-3.5 w-3.5" aria-hidden="true" />,
        text: `Consulting Cortex Agent${snippet}...`,
        spinning: true,
      }
    case "done":
      if (asset.risk_level === "low") {
        return {
          icon: <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />,
          text: `Low risk — no action needed${snippet}`,
          spinning: false,
        }
      }
      return {
        icon: <Check className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />,
        text: `${asset.recommendations_count} recommendation(s) ready${snippet}`,
        spinning: false,
      }
  }
}
