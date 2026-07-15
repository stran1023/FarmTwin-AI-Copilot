"use client"

import { useCallback, useSyncExternalStore } from "react"
import { subscribe, getSnapshot, ensure, refresh } from "./dataCache"

export interface ApiDataResult<T> {
  data: T | undefined
  loading: boolean
  error: unknown
  refresh: () => void
}

/**
 * Subscribe a component to a cache key via useSyncExternalStore. Multiple
 * components using the same key share one fetch and re-render together when
 * the cached value changes (including cross-panel invalidate()).
 */
export function useApiData<T>(key: string, fetcher: () => Promise<T>): ApiDataResult<T> {
  ensure(key, fetcher)

  const subscribeToKey = useCallback((onChange: () => void) => subscribe(key, onChange), [key])

  const getKeySnapshot = useCallback(() => getSnapshot<T>(key), [key])
  // Always "no data yet" on the server, never the live module-level cache --
  // dataCache's store is a singleton that persists across requests within
  // the same Next.js server process, so reading it during SSR can return
  // whatever a *previous* request already fetched. The client's very first
  // render (before its own fetch resolves) is always undefined, so the
  // server snapshot must match that deterministically or hydration mismatches.
  const getServerSnapshot = useCallback((): undefined => undefined, [])

  const entry = useSyncExternalStore(subscribeToKey, getKeySnapshot, getServerSnapshot)

  return {
    data: entry?.data,
    loading: entry?.data === undefined && entry?.error === undefined,
    error: entry?.error,
    refresh: useCallback(() => refresh(key), [key]),
  }
}
