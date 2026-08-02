"use client"

import { useState, type FormEvent } from "react"
import { PlayCircle, Loader2 } from "lucide-react"
import { ApiError, unlockDemo, runWorkflow } from "@/lib/api"
import { getDemoToken, setDemoToken, clearDemoToken } from "@/lib/demoAuth"
import { invalidate } from "@/lib/dataCache"
import { cn } from "@/lib/utils"

/**
 * Manual "advance the farm one tick" trigger for the public deployment.
 * There's no scheduler -- POST /workflow/run has no other caller -- so this
 * button is the only way the demo's live data actually moves during
 * judging. Gated by the same passcode as the backend's require_demo_access
 * dependency: a stored token skips straight to running; no token prompts
 * for the passcode first. Against a local backend with no DEMO_PASSCODE
 * set, the backend gate is a no-op, so the passcode prompt never appears.
 */
export function DemoTriggerButton() {
  const [showPasscode, setShowPasscode] = useState(false)
  const [passcode, setPasscode] = useState("")
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null)

  async function trigger() {
    setRunning(true)
    setMessage(null)
    try {
      const result = await runWorkflow()
      invalidate("assets")
      invalidate("dashboard-summary")
      setMessage({
        text: `Tick complete — ${result.assetsAssessed} assets assessed, ${result.highRiskCount} at risk`,
        isError: false,
      })
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearDemoToken()
        setShowPasscode(true)
        setMessage({ text: "Session expired — enter the passcode again", isError: true })
      } else {
        setMessage({ text: "Couldn't run the tick — try again", isError: true })
      }
    } finally {
      setRunning(false)
      window.setTimeout(() => setMessage(null), 6000)
    }
  }

  function handleClick() {
    if (getDemoToken()) {
      void trigger()
    } else {
      setShowPasscode(true)
    }
  }

  async function submitPasscode(e: FormEvent) {
    e.preventDefault()
    setRunning(true)
    setMessage(null)
    try {
      const { token } = await unlockDemo(passcode)
      setDemoToken(token)
      setShowPasscode(false)
      setPasscode("")
      await trigger()
    } catch {
      setMessage({ text: "Incorrect passcode", isError: true })
      setRunning(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleClick}
        disabled={running}
        title="Run a farm simulation tick — advances sensor readings, risk assessment, and AI recommendations"
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-50"
      >
        {running ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <PlayCircle className="h-4 w-4" aria-hidden="true" />
        )}
        <span className="hidden sm:inline">Run Farm Tick</span>
      </button>

      {message && (
        <div
          role="status"
          className={cn(
            "absolute right-0 top-full z-10 mt-1 w-60 rounded-lg border px-3 py-2 text-xs shadow-md",
            message.isError
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-border bg-card text-muted-foreground",
          )}
        >
          {message.text}
        </div>
      )}

      {showPasscode && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-lg border border-border bg-card p-3 shadow-lg">
          <form onSubmit={submitPasscode} className="flex flex-col gap-2">
            <label htmlFor="demo-passcode" className="text-xs font-medium text-muted-foreground">
              Judge passcode
            </label>
            <input
              id="demo-passcode"
              type="password"
              autoFocus
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowPasscode(false)
                  setPasscode("")
                }}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!passcode || running}
                className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
              >
                Unlock &amp; run
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
