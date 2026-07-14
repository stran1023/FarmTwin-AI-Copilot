"use client";

import { useState } from "react";
import { getAssets, getDashboardSummary, type DashboardSummary } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { DigitalTwinMap } from "@/components/DigitalTwinMap";
import { DashboardPanel } from "@/components/DashboardPanel";
import { AssetDetailPanel } from "@/components/AssetDetailPanel";

/** Keeps the address bar in sync with the selected asset without going
 * through Next's router -- a router.push()/replace() across / and
 * /assets/[id] would remount this whole tree (they're different route
 * segments), causing the map to flicker/reload on every click. Direct
 * History API calls update the URL for sharing/reload without that. */
function syncUrl(assetId: string | null) {
  if (typeof window === "undefined") return;
  const path = assetId ? `/assets/${assetId}` : "/";
  if (window.location.pathname !== path) {
    window.history.replaceState(null, "", path);
  }
}

export function SplitFarmView({ initialAssetId }: { initialAssetId: string | null }) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialAssetId);
  const { data: assets, error } = useApiData("assets", getAssets);
  // Same cache key DashboardPanel/CopilotPanel already use (feat-021) --
  // this adds zero extra network calls, just reads whatever's cached.
  const { data: summary } = useApiData<DashboardSummary>("dashboard-summary", getDashboardSummary);

  function selectAsset(assetId: string) {
    setSelectedAssetId(assetId);
    syncUrl(assetId);
  }

  function backToDashboard() {
    setSelectedAssetId(null);
    syncUrl(null);
  }

  return (
    <div className="flex flex-col gap-4 lg:h-[calc(100vh-89px)] lg:flex-row">
      <div className="flex flex-col gap-3 lg:w-3/5">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">Farm digital twin</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Hover an asset for its status, click to see its full detail on the right.
          </p>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {!assets && !error && <p className="text-zinc-500">Loading farm…</p>}
        {assets?.length === 0 && <p className="text-zinc-500">No farm assets found.</p>}

        {assets && assets.length > 0 && (
          <DigitalTwinMap
            assets={assets}
            onSelectAsset={selectAsset}
            selectedAssetId={selectedAssetId}
            weather={summary?.weather}
          />
        )}

        <div className="flex gap-4 text-sm text-zinc-500 dark:text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Healthy
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Needs attention
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Critical
          </span>
        </div>
      </div>

      <div className="lg:w-2/5 lg:overflow-y-auto lg:pl-2">
        {selectedAssetId ? (
          <AssetDetailPanel key={selectedAssetId} assetId={selectedAssetId} onBack={backToDashboard} />
        ) : (
          <DashboardPanel onSelectAsset={selectAsset} />
        )}
      </div>
    </div>
  );
}
