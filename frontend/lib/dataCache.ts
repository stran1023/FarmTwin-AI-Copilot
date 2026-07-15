/**
 * Module-level fetch cache. The unit of freshness is the cache KEY, not the
 * component tree: any component reading the same key shares one fetch, one
 * cached value, and one invalidation. invalidate(key) clears the entry and
 * refetches once in the background, pushing the new value to every subscriber.
 */

const TTL_MS = 20_000

interface Entry<T = unknown> {
  data?: T
  ts: number
  error?: unknown
  promise?: Promise<T>
}

type Fetcher<T> = () => Promise<T>

const store = new Map<string, Entry>()
const fetchers = new Map<string, Fetcher<unknown>>()
const listeners = new Map<string, Set<() => void>>()

function emit(key: string) {
  listeners.get(key)?.forEach((fn) => fn())
}

export function subscribe(key: string, fn: () => void): () => void {
  let set = listeners.get(key)
  if (!set) {
    set = new Set()
    listeners.set(key, set)
  }
  set.add(fn)
  return () => {
    set!.delete(fn)
  }
}

export function getSnapshot<T>(key: string): Entry<T> | undefined {
  return store.get(key) as Entry<T> | undefined
}

async function run<T>(key: string, fetcher: Fetcher<T>) {
  const promise = fetcher()
  const existing = (store.get(key) as Entry<T>) ?? { ts: 0 }
  store.set(key, { ...existing, promise })
  try {
    const data = await promise
    store.set(key, { data, ts: Date.now() })
  } catch (error) {
    store.set(key, { ...(store.get(key) as Entry<T>), error, promise: undefined, ts: Date.now() })
  } finally {
    emit(key)
  }
}

/** Ensure data for a key exists / is fresh. Dedups in-flight requests. */
export function ensure<T>(key: string, fetcher: Fetcher<T>) {
  fetchers.set(key, fetcher as Fetcher<unknown>)
  const entry = store.get(key) as Entry<T> | undefined
  const fresh = entry && entry.data !== undefined && Date.now() - entry.ts < TTL_MS
  if (fresh || entry?.promise) return
  void run(key, fetcher)
}

/** Clear a key and refetch once in the background. Notifies all subscribers. */
export function invalidate(key: string) {
  const fetcher = fetchers.get(key)
  const prev = store.get(key)
  // Keep previous data visible while the background refetch runs.
  store.set(key, { data: prev?.data, ts: 0 })
  if (fetcher) {
    void run(key, fetcher)
  } else {
    store.delete(key)
    emit(key)
  }
}

/** Force refetch for a single key (used by a hook's refresh()). */
export function refresh(key: string) {
  const fetcher = fetchers.get(key)
  if (fetcher) void run(key, fetcher)
}
