"use client"

import { useState } from "react"
import { PlayCircle, Loader2 } from "lucide-react"
import { ApiError, unlockDemo, startWorkflow } from "@/lib/api"
import { getDemoToken, setDemoToken, clearDemoToken } from "@/lib/demoAuth"
import { getSnapshot, invalidateAndWait, setValue } from "@/lib/dataCache"
import { computeTickDiff, TICK_DIFF_HIGHLIGHT_MS, TICK_DIFF_KEY } from "@/lib/tickDiff"
import type { Asset, DashboardSummary, WorkflowJobStatus } from "@/lib/types"
import { PasscodePrompt } from "./PasscodePrompt"
import { WorkflowProgressPanel } from "./WorkflowProgressPanel"

/**
 * Manual "advance the farm one tick" trigger for the public deployment.
 * There's no scheduler -- POST /workflow/run has no other caller -- so this
 * button is the only way the demo's live data actually moves during
 * judging. Gated by the same passcode as the backend's require_demo_access
 * dependency: a stored token skips straight to starting; no token prompts
 * for the passcode first. Against a local backend with no DEMO_PASSCODE
 * set, the backend gate is a no-op, so the passcode prompt never appears.
 *
 * Starts the job (POST /workflow/run/start) and hands off to
 * WorkflowProgressPanel for live per-asset polling, rather than blocking on
 * the multi-minute POST /workflow/run with no feedback in between.
 */
export function DemoTriggerButton() {
  const [showPasscode, setShowPasscode] = useState(false)
  const [starting, setStarting] = useState(false)
  const [passcodeError, setPasscodeError] = useState(false)
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  async function start() {
    setStarting(true)
    try {
      const jobId = await startWorkflow()
      setActiveJobId(jobId)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearDemoToken()
        setShowPasscode(true)
        setPasscodeError(false)
      }
      // Other errors: the button just returns to its idle state -- nothing
      // was started, so there's no partial progress to show.
    } finally {
      setStarting(false)
    }
  }

  function handleClick() {
    if (getDemoToken()) {
      void start()
    } else {
      setShowPasscode(true)
    }
  }

  async function submitPasscode(passcode: string) {
    setStarting(true)
    setPasscodeError(false)
    try {
      const { token } = await unlockDemo(passcode)
      setDemoToken(token)
      setShowPasscode(false)
      await start()
    } catch {
      setPasscodeError(true)
      setStarting(false)
    }
  }

  async function handleJobDone(job: WorkflowJobStatus) {
    // Fires on both "complete" and "error" -- even a failed job may have
    // written real Snowflake rows for whichever assets it got through
    // before failing, so the dashboard/map should refresh either way.
    // Snapshot the real pre-tick values before kicking off the refetch, so
    // they can be diffed against the real post-tick values below -- this is
    // what lets the map/dashboard highlight exactly what changed instead of
    // silently swapping to the new data.
    const beforeAssets = getSnapshot<Asset[]>("assets")?.data
    const beforeSummary = getSnapshot<DashboardSummary>("dashboard-summary")?.data

    const [afterAssets, afterSummary] = await Promise.all([
      invalidateAndWait<Asset[]>("assets"),
      invalidateAndWait<DashboardSummary>("dashboard-summary"),
    ])

    // Real assets the job itself generated fresh recommendations for this
    // tick -- see tickDiff.ts for why this matters alongside the raw
    // before/after asset compare.
    const recommendedAssetIds = job.assets.filter((a) => a.recommendations_count > 0).map((a) => a.asset_id)

    const diff = computeTickDiff(beforeAssets, afterAssets, beforeSummary, afterSummary, recommendedAssetIds)
    if (diff) {
      setValue(TICK_DIFF_KEY, diff)
      window.setTimeout(() => setValue(TICK_DIFF_KEY, null), TICK_DIFF_HIGHLIGHT_MS)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={starting || activeJobId !== null}
        title="Run a farm simulation tick — advances sensor readings, risk assessment, and AI recommendations"
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
      >
        {starting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Run Farm Tick</span>
      </button>

      {showPasscode && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
          <PasscodePrompt
            onSubmit={submitPasscode}
            onCancel={() => setShowPasscode(false)}
            busy={starting}
            submitLabel="Unlock & run"
          />
          {passcodeError && <p className="mt-1 text-xs text-destructive">Incorrect passcode</p>}
        </div>
      )}

      {activeJobId && (
        <WorkflowProgressPanel jobId={activeJobId} onDone={handleJobDone} onClose={() => setActiveJobId(null)} />
      )}
    </div>
  )
}
