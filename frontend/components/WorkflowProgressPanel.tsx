"use client"

import { useEffect, useRef, useState } from "react"
import { Bot, Check, CircleDashed, Loader2, PartyPopper, Search, Sparkles, TriangleAlert } from "lucide-react"
import { getWorkflowStatus } from "@/lib/api"
import { useTickDiff } from "@/lib/useTickDiff"
import type { WorkflowAssetProgress, WorkflowJobStatus } from "@/lib/types"
import { cn } from "@/lib/utils"

const POLL_INTERVAL_MS = 2000

// Decorative front-of-house lines, not backend polling -- each names a real
// step of _run_workflow (weather + reading ingestion, then the real Cortex
// Agent call) that's genuinely happening concurrently while these play, but
// isn't itself individually observable over the wire the way the per-asset
// steps below are. Deliberately does NOT claim a runtime "Connecting to
// CoCo" step -- CoCo only builds the Snowflake objects this workflow runs
// against, at dev time (see CLAUDE.md); the running app calls the Cortex
// Agents REST API directly.
const INTRO_LINES = [
  "Loading the latest farm state…",
  "Collecting sensor & environmental data…",
  "Connecting to the Cortex Agent…",
]
const INTRO_STEP_MS = 650

// Also decorative -- the real Snowflake writes already happened during the
// per-asset loop above. This is a one-beat "wrapping up" transition before
// the one part of this phase that IS real: awaiting onDone(job) below.
const OUTRO_LINE = "Saving the new farm state…"
const OUTRO_STEP_MS = 600

type Phase = "intro" | "live" | "outro" | "refreshing" | "done"

/**
 * Live view into one real POST /workflow/run/start job -- polls
 * GET /workflow/run/status/{jobId} so a judge (or the demo video) can watch
 * the real Observe -> Understand -> Recommend -> Predict loop move through
 * each of the 5 real Farm Assets. Wrapped in a short decorative intro/outro
 * choreography (feat-059) so the moment reads as "several systems
 * collaborating" rather than a bare spinner, bookending the always-real
 * per-asset list (feat-057) and a genuinely-real refresh step (feat-058's
 * onDone, now awaited instead of fired blind) before a success summary.
 */
export function WorkflowProgressPanel({
  jobId,
  onDone,
  onClose,
}: {
  jobId: string
  onDone: (job: WorkflowJobStatus) => Promise<void>
  onClose: () => void
}) {
  const [job, setJob] = useState<WorkflowJobStatus | null>(null)
  const [phase, setPhase] = useState<Phase>("intro")
  const [introIndex, setIntroIndex] = useState(0)
  const refreshFiredRef = useRef(false)
  const tickDiff = useTickDiff()

  // Real polling loop (unchanged mechanism from feat-057) -- only responsible
  // for keeping `job` fresh. What happens once it stops running is entirely
  // driven by the phase effects below, not from inside this loop.
  useEffect(() => {
    let cancelled = false
    let timeoutId: number | undefined

    async function poll() {
      try {
        const status = await getWorkflowStatus(jobId)
        if (cancelled) return
        setJob(status)
        if (status.status === "running") {
          timeoutId = window.setTimeout(poll, POLL_INTERVAL_MS)
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
  }, [jobId])

  // Intro choreography: ticks forward on a fixed cadence regardless of real
  // poll speed (it's a front-of-house flourish over work already in flight),
  // then hands off to "live" once all 3 lines have shown their checkmark.
  useEffect(() => {
    if (phase !== "intro") return
    if (introIndex >= INTRO_LINES.length) {
      // Deferred so setState doesn't run synchronously within the effect
      // body (react-hooks/set-state-in-effect) -- same pattern this
      // codebase already established in lib/useApiData.ts and HealthGauge.tsx.
      queueMicrotask(() => setPhase("live"))
      return
    }
    const t = window.setTimeout(() => setIntroIndex((i) => i + 1), INTRO_STEP_MS)
    return () => window.clearTimeout(t)
  }, [phase, introIndex])

  // Once the intro has finished playing AND the real job has actually
  // stopped running, move on -- covers both orderings (a fast all-low-risk
  // tick finishing before the intro plays out, or a slow multi-agent tick
  // still running once the intro's done).
  useEffect(() => {
    if (phase === "live" && job && job.status !== "running") {
      queueMicrotask(() => setPhase("outro"))
    }
  }, [phase, job])

  useEffect(() => {
    if (phase !== "outro" || !job) return
    const t = window.setTimeout(() => setPhase("refreshing"), OUTRO_STEP_MS)
    return () => window.clearTimeout(t)
  }, [phase, job])

  // The one part of this whole sequence that's genuinely real, not
  // decorative: awaits the same onDone(job) feat-058 uses to snapshot,
  // refetch, and diff the real "assets"/"dashboard-summary" cache keys, so
  // "Refreshing dashboard insights..." is on screen for exactly as long as
  // that real work takes -- not a fixed fake delay.
  useEffect(() => {
    if (phase !== "refreshing" || !job || refreshFiredRef.current) return
    refreshFiredRef.current = true
    void onDone(job).finally(() => setPhase("done"))
  }, [phase, job, onDone])

  const canClose = job !== null && phase === "done"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-4 shadow-xl transition-all duration-300">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <span className="relative flex size-2">
              {phase !== "done" && (
                <span
                  className="absolute inline-flex size-full rounded-full bg-primary/60"
                  style={{ animation: "header-glow 1.6s ease-in-out infinite" }}
                  aria-hidden="true"
                />
              )}
              <span className="relative inline-flex size-2 rounded-full bg-primary" aria-hidden="true" />
            </span>
            {phase === "done" ? "Farm tick" : "Running farm tick"}
          </h2>
          {canClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
            >
              Close
            </button>
          )}
        </div>

        {(phase === "intro" || phase === "live" || phase === "outro" || phase === "refreshing") && (
          <IntroLines introIndex={phase === "intro" ? introIndex : INTRO_LINES.length} />
        )}

        {(phase === "live" || phase === "outro" || phase === "refreshing") && job && (
          <ul className="mt-2 flex flex-col gap-2">
            {job.assets.map((asset, idx) => (
              <AssetProgressRow key={asset.asset_id} asset={asset} index={idx} />
            ))}
          </ul>
        )}

        {(phase === "outro" || phase === "refreshing") && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            {phase === "outro" ? (
              <>
                <Check className="size-3.5 shrink-0 text-emerald-500" aria-hidden="true" />
                {OUTRO_LINE}
              </>
            ) : (
              <>
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden="true" />
                Refreshing dashboard insights…
              </>
            )}
          </div>
        )}

        {phase === "done" && job?.status === "complete" && job.result && (
          <SuccessSummary assets={job.assets} result={job.result} healthDelta={tickDiff?.healthDelta ?? null} />
        )}

        {phase === "done" && job?.status === "error" && (
          <p className="mt-3 flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {job.error ?? "The tick failed partway through."}
          </p>
        )}
      </div>
    </div>
  )
}

function IntroLines({ introIndex }: { introIndex: number }) {
  return (
    <ul className="flex flex-col gap-1.5" aria-label="Farm tick processing steps">
      {INTRO_LINES.map((line, idx) => {
        const state = idx < introIndex ? "done" : idx === introIndex ? "active" : "pending"
        return (
          <li
            key={line}
            className={cn(
              "flex items-center gap-2 text-xs",
              state === "pending" ? "text-muted-foreground/50" : "text-foreground",
            )}
          >
            <span className="flex size-3.5 shrink-0 items-center justify-center">
              {state === "done" && (
                <Check
                  className="size-3.5 text-emerald-500"
                  style={{ animation: "check-pop 300ms ease-out" }}
                  aria-hidden="true"
                />
              )}
              {state === "active" && <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />}
              {state === "pending" && <CircleDashed className="size-3 text-muted-foreground/40" aria-hidden="true" />}
            </span>
            {line}
          </li>
        )
      })}
    </ul>
  )
}

function SuccessSummary({
  assets,
  result,
  healthDelta,
}: {
  assets: WorkflowAssetProgress[]
  result: NonNullable<WorkflowJobStatus["result"]>
  healthDelta: number | null
}) {
  const changedNames = assets.filter((a) => a.recommendations_count > 0).map((a) => a.name)
  const totalRecs = assets.reduce((sum, a) => sum + a.recommendations_count, 0)
  // Real signal, not a guess: result.highRiskCount is the backend's own
  // count of assets currently at medium+ risk after this tick (main.py's
  // _run_workflow -- everything that isn't "low" gets appended to
  // high_risk_assets). Whether or not *this* tick is what caused it, a
  // farmer opening the dashboard right now has something to act on.
  const isCritical = result.highRiskCount > 0
  const needsAttention = assets
    .filter((a) => a.risk_level !== null && a.risk_level !== "low")
    .map((a) => a.name)

  if (isCritical) {
    return (
      <div className="mt-2 flex flex-col items-center gap-2 rounded-lg border border-critical/40 bg-critical/10 px-4 py-4 text-center">
        <TriangleAlert
          className="size-6 text-critical"
          style={{ animation: "check-pop 400ms ease-out" }}
          aria-hidden="true"
        />
        <p className="text-sm font-bold text-foreground">Critical Farm Changes Detected</p>
        <dl className="grid w-full grid-cols-3 gap-2 text-xs">
          <SummaryStat label="Assessed" value={result.assetsAssessed} />
          <SummaryStat label="At risk" value={result.highRiskCount} />
          <SummaryStat label="New recs" value={totalRecs} />
        </dl>
        {healthDelta !== null && healthDelta !== 0 && (
          <p className={cn("text-xs font-semibold", healthDelta > 0 ? "text-healthy" : "text-critical")}>
            Farm health {healthDelta > 0 ? `+${healthDelta}` : healthDelta} this tick
          </p>
        )}
        {needsAttention.length > 0 && (
          <p className="flex items-center gap-1 text-xs font-medium text-critical">
            <TriangleAlert className="size-3 shrink-0" aria-hidden="true" />
            Needs attention: {needsAttention.join(", ")}
          </p>
        )}
        {changedNames.length > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="size-3 shrink-0" aria-hidden="true" />
            New recommendations for: {changedNames.join(", ")}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-col items-center gap-2 rounded-lg border border-healthy/40 bg-healthy/10 px-4 py-4 text-center">
      <PartyPopper
        className="size-6 text-healthy"
        style={{ animation: "check-pop 400ms ease-out" }}
        aria-hidden="true"
      />
      <p className="text-sm font-bold text-foreground">Farm Tick Completed — New Insights Generated</p>
      <dl className="grid w-full grid-cols-3 gap-2 text-xs">
        <SummaryStat label="Assessed" value={result.assetsAssessed} />
        <SummaryStat label="At risk" value={result.highRiskCount} />
        <SummaryStat label="New recs" value={totalRecs} />
      </dl>
      {healthDelta !== null && healthDelta !== 0 && (
        <p className={cn("text-xs font-semibold", healthDelta > 0 ? "text-healthy" : "text-critical")}>
          Farm health {healthDelta > 0 ? `+${healthDelta}` : healthDelta} this tick
        </p>
      )}
      {changedNames.length > 0 && (
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="size-3 shrink-0" aria-hidden="true" />
          Updated: {changedNames.join(", ")}
        </p>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-card px-2 py-1.5">
      <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-bold tabular-nums text-foreground">{value}</dd>
    </div>
  )
}

function AssetProgressRow({ asset, index }: { asset: WorkflowAssetProgress; index: number }) {
  const { icon, text, spinning } = describeStep(asset)
  return (
    <li
      className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs"
      style={{ animation: `row-enter 300ms ease-out both`, animationDelay: `${index * 60}ms` }}
    >
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
