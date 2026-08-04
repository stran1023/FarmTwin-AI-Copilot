import type { Asset, DashboardSummary } from "./types"

export const TICK_DIFF_KEY = "tick-diff"

/** How long a computed diff stays published before being cleared back to null. */
export const TICK_DIFF_HIGHLIGHT_MS = 6000

export interface TickDiff {
  /** Ids of assets whose real status or health_score changed this tick. */
  changedAssetIds: string[]
  /** Real farm_health_score delta (after - before), or null if either snapshot was unavailable. */
  healthDelta: number | null
}

/**
 * Diffs the real "before" snapshot (captured via dataCache.getSnapshot right
 * before a tick's invalidate) against the real "after" values (returned by
 * invalidateAndWait once the tick's fresh data has landed), unioned with
 * `recommendedAssetIds` -- assets the just-finished job itself reported a
 * nonzero recommendations_count for (see WorkflowAssetProgress). That job
 * signal matters because health_score is a coarse function of risk_level
 * (see backend/app/main.py's _health_score()), so a tick that generates real
 * new recommendations for an asset whose risk bucket doesn't flip -- the
 * common case once the demo's crisis narrative has already been established
 * for a few ticks -- would otherwise register as "nothing changed" even
 * though the tick did real, visible work for that asset.
 *
 * Returns null when there's nothing to show -- no recommended assets, no
 * before/after snapshot to compare (e.g. first page load, before
 * "assets"/"dashboard-summary" ever populated), and no real health delta.
 */
export function computeTickDiff(
  beforeAssets: Asset[] | undefined,
  afterAssets: Asset[] | undefined,
  beforeSummary: DashboardSummary | undefined,
  afterSummary: DashboardSummary | undefined,
  recommendedAssetIds: string[] = [],
): TickDiff | null {
  const changed = new Set(recommendedAssetIds)
  if (beforeAssets && afterAssets) {
    const beforeById = new Map(beforeAssets.map((a) => [a.id, a]))
    for (const after of afterAssets) {
      const before = beforeById.get(after.id)
      if (before && (before.status !== after.status || before.health_score !== after.health_score)) {
        changed.add(after.id)
      }
    }
  }

  const healthDelta =
    beforeSummary && afterSummary ? afterSummary.farm_health_score - beforeSummary.farm_health_score : null

  if (changed.size === 0 && (healthDelta === null || healthDelta === 0)) {
    return null
  }

  return { changedAssetIds: [...changed], healthDelta }
}
