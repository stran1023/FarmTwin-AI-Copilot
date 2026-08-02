"use client"

import { useCallback, useState } from "react"
import { ApiError, unlockDemo } from "./api"
import { getDemoToken, setDemoToken, clearDemoToken } from "./demoAuth"

export interface GatedActionResult<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  needsPasscode: boolean
  passcodeError: boolean
  /** Call on the user's explicit "reveal"/"generate" click. Runs the fetcher
   * immediately if a demo token is already stored, otherwise opens the
   * passcode prompt. */
  reveal: () => void
  submitPasscode: (passcode: string) => void
  cancelPasscode: () => void
}

/**
 * Wraps a Cortex-Agent-triggering fetch so it only ever runs on an explicit
 * user action, never on component mount -- the click-to-reveal counterpart
 * to lib/useApiData.ts's auto-fetch-on-mount. Backed by the same demo gate
 * as DemoTriggerButton (backend/app/services/demo_auth.py): a stored token
 * skips straight to the fetch, no token opens the passcode prompt first.
 */
export function useGatedAction<T>(fetcher: () => Promise<T>): GatedActionResult<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [needsPasscode, setNeedsPasscode] = useState(false)
  const [passcodeError, setPasscodeError] = useState(false)

  // fetcher is a fresh closure per render (mirrors useApiData's fetcher,
  // keyed by an explicit action instead of a cache key) -- deliberately
  // omitted below since nothing re-runs run() automatically off its
  // identity changing, only this hook's own explicit reveal()/
  // submitPasscode() calls do.
  const run = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetcher()
      setData(result)
      setNeedsPasscode(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearDemoToken()
        setNeedsPasscode(true)
      } else {
        setError(err)
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const reveal = useCallback(() => {
    setPasscodeError(false)
    if (getDemoToken()) {
      void run()
    } else {
      setNeedsPasscode(true)
    }
  }, [run])

  const submitPasscode = useCallback(
    async (passcode: string) => {
      setLoading(true)
      setPasscodeError(false)
      try {
        const { token } = await unlockDemo(passcode)
        setDemoToken(token)
        setNeedsPasscode(false)
        await run()
      } catch {
        setPasscodeError(true)
        setLoading(false)
      }
    },
    [run],
  )

  const cancelPasscode = useCallback(() => {
    setNeedsPasscode(false)
    setPasscodeError(false)
  }, [])

  return { data, loading, error, needsPasscode, passcodeError, reveal, submitPasscode, cancelPasscode }
}
