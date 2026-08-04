"use client"

import { useCallback, useSyncExternalStore } from "react"
import { subscribe, getSnapshot } from "./dataCache"
import { TICK_DIFF_KEY, type TickDiff } from "./tickDiff"

/**
 * Read-only subscription to the "tick-diff" cache key -- no ensure()/fetcher,
 * since this value is only ever published by DemoTriggerButton via
 * setValue(), never fetched from the API. Returns null before any tick has
 * run this session, or once the highlight window has expired.
 */
export function useTickDiff(): TickDiff | null {
  const subscribeToKey = useCallback((onChange: () => void) => subscribe(TICK_DIFF_KEY, onChange), [])
  const getKeySnapshot = useCallback(() => getSnapshot<TickDiff | null>(TICK_DIFF_KEY)?.data ?? null, [])
  const getServerSnapshot = useCallback((): null => null, [])

  return useSyncExternalStore(subscribeToKey, getKeySnapshot, getServerSnapshot)
}
