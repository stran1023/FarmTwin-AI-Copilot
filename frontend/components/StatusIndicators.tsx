"use client";

import type { AssetOverview } from "@/lib/api";

const RISK_SEVERITY: Record<string, number> = { healthy: 0, needs_attention: 1, critical: 2 };

/** The single most urgent asset farm-wide (worst status, tie-broken by
 * lowest health_score) -- null if every asset is healthy. Only one
 * asset ever gets the spotlight pulse, so the eye goes straight to the
 * thing that actually needs attention instead of every elevated asset
 * competing for it. */
export function topPriorityAssetId(assets: AssetOverview[]): string | null {
  let best: AssetOverview | null = null;
  for (const asset of assets) {
    if (asset.status === "healthy") continue;
    if (
      !best ||
      RISK_SEVERITY[asset.status] > RISK_SEVERITY[best.status] ||
      (RISK_SEVERITY[asset.status] === RISK_SEVERITY[best.status] && asset.health_score < best.health_score)
    ) {
      best = asset;
    }
  }
  return best?.asset_id ?? null;
}

/** Layers on top of feat-024-027's per-type marker graphics: a pulsing
 * halo behind the single top-priority asset, a bouncing alert badge on
 * every critical asset, and a gentle sparkle on every healthy one --
 * replacing the old plain static colored ring as the sole status
 * language. */
export function StatusIndicators({ asset, isTopPriority }: { asset: AssetOverview; isTopPriority: boolean }) {
  return (
    <>
      {isTopPriority && (
        <div
          className="absolute inset-0 -z-10 animate-[spotlight-pulse_2s_ease-in-out_infinite] rounded-full bg-red-400 blur-md dark:bg-red-500"
          aria-hidden
        />
      )}

      {asset.status === "critical" && (
        <span
          className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 animate-[badge-bounce_1.2s_ease-in-out_infinite] items-center justify-center rounded-full bg-red-600 text-[11px] font-bold text-white shadow-md"
          aria-hidden
        >
          !
        </span>
      )}

      {asset.status === "healthy" && (
        <span
          className="absolute -right-1 -top-1 z-10 animate-[sparkle-fade_3s_ease-in-out_infinite] text-sm"
          aria-hidden
        >
          ✨
        </span>
      )}
    </>
  );
}
