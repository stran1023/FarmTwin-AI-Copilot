"use client"

import { useState, type FormEvent } from "react"

/**
 * Shared passcode-entry form for the demo gate (see backend/app/services/
 * demo_auth.py). Positioning is the caller's responsibility -- some callers
 * (DemoTriggerButton) anchor it as a small dropdown off a header button,
 * others (gated asset-detail cards) render it inline within a card body.
 */
export function PasscodePrompt({
  onSubmit,
  onCancel,
  busy,
  submitLabel = "Unlock",
}: {
  onSubmit: (passcode: string) => void
  onCancel: () => void
  busy: boolean
  submitLabel?: string
}) {
  const [passcode, setPasscode] = useState("")

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSubmit(passcode)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
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
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!passcode || busy}
          className="rounded-md bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  )
}
