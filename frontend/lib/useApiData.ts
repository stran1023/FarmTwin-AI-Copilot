"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getSnapshot, load, subscribe } from "@/lib/dataCache";

const DEFAULT_TTL_MS = 20000;

export function useApiData<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = DEFAULT_TTL_MS) {
  const entry = useSyncExternalStore(
    (onStoreChange) => subscribe(key, onStoreChange),
    () => getSnapshot<T>(key),
    () => undefined,
  );
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(!entry);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    let cancelled = false;
    load(key, () => fetcherRef.current(), ttlMs)
      .then(() => {
        if (!cancelled) setError(null);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, ttlMs]);

  const refresh = useCallback(() => {
    return load(key, () => fetcherRef.current(), ttlMs, true)
      .then((data) => {
        setError(null);
        return data;
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : String(err));
        throw err;
      });
  }, [key, ttlMs]);

  return {
    data: entry?.data,
    loading: initialLoading && !entry,
    error,
    refresh,
  };
}
