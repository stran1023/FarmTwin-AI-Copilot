"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import Link from "next/link";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import type { Plot } from "@/lib/api";
import { RiskBadge } from "@/components/RiskBadge";

const RISK_COLORS: Record<string, string> = {
  low: "#10b981",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

function riskIcon(level: string) {
  const color = RISK_COLORS[level.toLowerCase()] ?? "#71717a";
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.35)"></span>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

export default function FarmMap({ plots }: { plots: Plot[] }) {
  const bounds = L.latLngBounds(plots.map((p) => [p.lat, p.lon] as [number, number]));

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [30, 30] }}
      scrollWheelZoom={false}
      className="h-[420px] w-full rounded-xl border border-zinc-200 dark:border-zinc-800"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {plots.map((plot) => (
        <Marker key={plot.plot_id} position={[plot.lat, plot.lon]} icon={riskIcon(plot.risk_level)}>
          <Popup>
            <div className="flex flex-col gap-1.5">
              <p className="font-semibold text-zinc-900">{plot.name}</p>
              <p className="text-sm text-zinc-600">
                {plot.crop_type} · {plot.area_hectares} ha
              </p>
              <RiskBadge level={plot.risk_level} />
              <Link href={`/plots/${plot.plot_id}`} className="text-sm font-medium text-blue-600 hover:underline">
                View risk assessment &rarr;
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
