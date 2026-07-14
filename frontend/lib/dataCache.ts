/**
 * Minimal shared fetch cache: request de-duplication, a short staleness
 * TTL, and cross-component invalidation, keyed by an arbitrary string
 * (typically the API path). No new dependency -- pairs with
 * useSyncExternalStore (built into React 18+) via useApiData.ts.
 */

interface CacheEntry<T> {
  data: T;
  ts: number;
}

const DEFAULT_TTL_MS = 20000;

const store = new Map<string, CacheEntry<unknown>>();
const inFlight = new Map<string, Promise<unknown>>();
const subscribers = new Map<string, Set<() => void>>();
const fetchers = new Map<string, () => Promise<unknown>>();

function emit(key: string): void {
  subscribers.get(key)?.forEach((cb) => cb());
}

export function subscribe(key: string, callback: () => void): () => void {
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(callback);
  return () => subscribers.get(key)?.delete(callback);
}

export function getSnapshot<T>(key: string): CacheEntry<T> | undefined {
  return store.get(key) as CacheEntry<T> | undefined;
}

export function load<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS,
  force = false,
): Promise<T> {
  fetchers.set(key, fetcher as () => Promise<unknown>);

  if (!force) {
    const existing = getSnapshot<T>(key);
    if (existing && Date.now() - existing.ts < ttlMs) {
      return Promise.resolve(existing.data);
    }
  }

  const pending = inFlight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = fetcher()
    .then((data) => {
      store.set(key, { data, ts: Date.now() });
      inFlight.delete(key);
      emit(key);
      return data;
    })
    .catch((err) => {
      inFlight.delete(key);
      throw err;
    });
  inFlight.set(key, promise);
  return promise;
}

/** Clear a key's cached value and immediately refetch it in the
 * background using its last-known fetcher, so every mounted consumer
 * (via useApiData's subscription) picks up fresh data without needing
 * to know a mutation happened elsewhere. */
export function invalidate(key: string): void {
  store.delete(key);
  const fetcher = fetchers.get(key);
  if (fetcher) {
    load(key, fetcher, 0, true).catch(() => {
      // Errors surface to whichever useApiData call triggers the next
      // load(); nothing to do with them here.
    });
  } else {
    emit(key);
  }
}
