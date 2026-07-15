"use client"

import { useCallback, useState } from "react"
import { DigitalTwinMap } from "./DigitalTwinMap"
import { DashboardPanel } from "./DashboardPanel"
import { AssetDetailPanel } from "./AssetDetailPanel"

/**
 * The Farm view shell. Map on the left (never swapped/remounted), the right
 * panel swaps in place between the dashboard and an asset detail by local
 * React state — not by navigation, so the map never flickers. syncUrl uses
 * history.replaceState directly so the address bar reflects /assets/{id} for
 * sharing without triggering an App Router remount.
 */
export function SplitFarmView({ initialAssetId = null }: { initialAssetId?: string | null }) {
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialAssetId)
  const [highlightedAssetId, setHighlightedAssetId] = useState<string | null>(null)

  const syncUrl = useCallback((id: string | null) => {
    if (typeof window === "undefined") return
    const path = id ? `/assets/${id}` : "/"
    window.history.replaceState(window.history.state, "", path)
  }, [])

  const selectAsset = useCallback(
    (id: string) => {
      setSelectedAssetId(id)
      syncUrl(id)
    },
    [syncUrl],
  )

  const clearAsset = useCallback(() => {
    setSelectedAssetId(null)
    syncUrl(null)
  }, [syncUrl])

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] flex-col lg:flex-row">
      {/* Left: digital twin map (always visible) */}
      <div className="h-[50vh] shrink-0 border-b border-border lg:h-full lg:w-3/5 lg:border-b-0 lg:border-r">
        <DigitalTwinMap
          selectedAssetId={selectedAssetId}
          highlightedAssetId={highlightedAssetId}
          onSelectAsset={selectAsset}
        />
      </div>

      {/* Right: swaps in place, scrollable */}
      <div className="themed-scroll min-h-0 flex-1 overflow-y-auto bg-background lg:w-2/5">
        {selectedAssetId ? (
          <AssetDetailPanel key={selectedAssetId} assetId={selectedAssetId} onBack={clearAsset} />
        ) : (
          <DashboardPanel onSelectAsset={selectAsset} onHoverAsset={setHighlightedAssetId} />
        )}
      </div>
    </div>
  )
}
