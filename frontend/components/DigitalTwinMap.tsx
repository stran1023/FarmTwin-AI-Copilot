"use client";

import { useMemo, useState } from "react";
import type { AssetOverview, WeatherReading } from "@/lib/api";
import { FarmTerrain, GRID_SIZE, TILE_H, TILE_W, isoPosition } from "@/components/FarmTerrain";
import { FishPondMarker } from "@/components/FishPondMarker";
import { ChickenCoopMarker } from "@/components/ChickenCoopMarker";
import { RiceFieldMarker } from "@/components/RiceFieldMarker";
import { FruitOrchardMarker } from "@/components/FruitOrchardMarker";
import { WeatherAmbience } from "@/components/WeatherAmbience";
import { StatusIndicators, topPriorityAssetId } from "@/components/StatusIndicators";

const ASSET_ICON: Record<string, string> = {
  fish_pond: "🐟",
  chicken_coop: "🐔",
  rice_field: "🌾",
  fruit_orchard: "🍊",
};

const STATUS_RING: Record<string, string> = {
  healthy: "ring-emerald-400 shadow-emerald-400/50",
  needs_attention: "ring-amber-400 shadow-amber-400/50",
  critical: "ring-red-500 shadow-red-500/60 animate-pulse",
};

/** Per-asset-type illustrated markers (feat-024 onward) take over from
 * this generic emoji-in-a-ring badge one asset type at a time; types
 * without a dedicated marker yet still fall back to it. */
function AssetMarkerVisual({ asset, ring, isSelected }: { asset: AssetOverview; ring: string; isSelected: boolean }) {
  if (asset.asset_type === "fish_pond") {
    return <FishPondMarker asset={asset} isSelected={isSelected} />;
  }
  if (asset.asset_type === "chicken_coop") {
    return <ChickenCoopMarker asset={asset} isSelected={isSelected} />;
  }
  if (asset.asset_type === "rice_field") {
    return <RiceFieldMarker asset={asset} isSelected={isSelected} />;
  }
  if (asset.asset_type === "fruit_orchard") {
    return <FruitOrchardMarker asset={asset} isSelected={isSelected} />;
  }
  return (
    <div
      className={`flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl shadow-lg ring-4 dark:bg-zinc-900 ${ring} ${
        isSelected ? "outline outline-2 outline-offset-2 outline-blue-500" : ""
      }`}
    >
      <span aria-hidden>{ASSET_ICON[asset.asset_type] ?? "❓"}</span>
    </div>
  );
}

export function DigitalTwinMap({
  assets,
  onSelectAsset,
  selectedAssetId,
  weather,
}: {
  assets: AssetOverview[];
  onSelectAsset: (assetId: string) => void;
  selectedAssetId?: string | null;
  weather?: WeatherReading | null;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const centerOffset = ((GRID_SIZE - 1) * TILE_W) / 2;
  const topPriorityId = useMemo(() => topPriorityAssetId(assets), [assets]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-sky-200 via-sky-50 to-emerald-50 dark:border-zinc-800 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950"
      style={{ height: (GRID_SIZE - 1) * TILE_H + 160 }}
    >
      <WeatherAmbience weather={weather ?? null} />

      <div className="absolute" style={{ left: centerOffset, top: 60 }}>
        <FarmTerrain assetPositions={assets.map((a) => ({ gx: a.grid_x, gy: a.grid_y }))} />

        {assets.map((asset) => {
          const { left, top } = isoPosition(asset.grid_x, asset.grid_y);
          const ring = STATUS_RING[asset.status] ?? STATUS_RING.healthy;
          const isHovered = hovered === asset.asset_id;
          const isSelected = selectedAssetId === asset.asset_id;
          return (
            <button
              key={asset.asset_id}
              type="button"
              onClick={() => onSelectAsset(asset.asset_id)}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{
                left: left + TILE_W / 2,
                top,
                // Hovered marker (and its tooltip) must draw above every
                // other marker regardless of grid position, or a
                // neighboring marker with a higher base z-index clips the
                // tooltip text.
                zIndex: isHovered ? 500 : asset.grid_x + asset.grid_y + 100,
              }}
              onMouseEnter={() => setHovered(asset.asset_id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(asset.asset_id)}
              onBlur={() => setHovered(null)}
            >
              <StatusIndicators asset={asset} isTopPriority={topPriorityId === asset.asset_id} />
              <AssetMarkerVisual asset={asset} ring={ring} isSelected={isSelected} />

              {isHovered && (
                <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 w-56 -translate-x-1/2 rounded-lg border border-zinc-200 bg-white p-3 text-left text-sm shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                  <p className="font-semibold text-zinc-950 dark:text-zinc-50">{asset.name}</p>
                  <p className="text-zinc-500 dark:text-zinc-400">Health score: {asset.health_score}</p>
                  <p className="capitalize text-zinc-500 dark:text-zinc-400">
                    {asset.status.replace("_", " ")}
                  </p>
                  {asset.latest_alert && (
                    <p className="mt-1 text-red-600 dark:text-red-400">{asset.latest_alert}</p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
