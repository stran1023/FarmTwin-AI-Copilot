"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import {
  ApiError,
  approveRecommendation,
  getAssetDetail,
  getAssetRecommendations,
  rejectRecommendation,
  type AssetDetail,
  type AssetReading,
  type Recommendation,
} from "@/lib/api";
import { invalidate } from "@/lib/dataCache";
import { Card } from "@/components/Card";
import { RiskBadge } from "@/components/RiskBadge";
import { RecommendationCard } from "@/components/RecommendationCard";

type ReadingField = { key: keyof AssetReading; label: string; unit?: string };

const READING_FIELDS_BY_TYPE: Record<string, ReadingField[]> = {
  fish_pond: [
    { key: "water_temp_c", label: "Water temp", unit: "°C" },
    { key: "ph", label: "pH" },
    { key: "dissolved_oxygen_mg_l", label: "Dissolved oxygen", unit: "mg/L" },
    { key: "feed_level_pct", label: "Feed level", unit: "%" },
    { key: "biomass_kg", label: "Biomass", unit: "kg" },
  ],
  chicken_coop: [
    { key: "egg_count", label: "Eggs today" },
    { key: "feed_level_pct", label: "Feed level", unit: "%" },
    { key: "air_temp_c", label: "Air temp", unit: "°C" },
    { key: "humidity_pct", label: "Humidity", unit: "%" },
    { key: "water_l", label: "Water volume", unit: "L" },
  ],
  rice_field: [
    { key: "growth_stage", label: "Growth stage" },
    { key: "soil_moisture_pct", label: "Soil moisture", unit: "%" },
    { key: "nitrogen_ppm", label: "Nitrogen", unit: "ppm" },
    { key: "irrigation_status", label: "Irrigation" },
  ],
  fruit_orchard: [
    { key: "growth_stage", label: "Growth stage" },
    { key: "soil_moisture_pct", label: "Soil moisture", unit: "%" },
    { key: "disease_risk_pct", label: "Disease risk", unit: "%" },
    { key: "harvest_readiness_pct", label: "Harvest readiness", unit: "%" },
  ],
};

function formatReadingValue(value: unknown, unit?: string): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "number") return unit ? `${value} ${unit}` : `${value}`;
  return String(value).replace(/_/g, " ");
}

function healthColor(score: number) {
  if (score >= 75) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 45) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function AssetDetailPage() {
  const params = useParams<{ id: string }>();
  const assetId = params.id;

  const [detail, setDetail] = useState<AssetDetail | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    const requestId = ++requestIdRef.current;
    return Promise.all([getAssetDetail(assetId), getAssetRecommendations(assetId)])
      .then(([d, recs]) => {
        if (requestId !== requestIdRef.current) return;
        setDetail(d);
        setRecommendations(recs);
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [assetId]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecision(recommendationId: string, decision: "approve" | "reject") {
    setPendingId(recommendationId);
    setActionError(null);
    try {
      if (decision === "approve") {
        await approveRecommendation(recommendationId);
      } else {
        await rejectRecommendation(recommendationId);
      }
      invalidate("dashboard-summary");
      await load();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingId(null);
    }
  }

  if (notFound) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-zinc-500 dark:text-zinc-400">No asset found with id &ldquo;{assetId}&rdquo;.</p>
        <Link href="/" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          &larr; Back to farm
        </Link>
      </div>
    );
  }

  if (error) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>
    );
  }

  if (!detail || !recommendations) {
    return <p className="text-zinc-500">Loading asset…</p>;
  }

  const { asset, latest_reading, latest_risk, prediction, history } = detail;
  const readingFields = READING_FIELDS_BY_TYPE[asset.asset_type] ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:underline dark:text-zinc-400">
          &larr; Back to farm
        </Link>
        <div className="mt-2 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">{asset.name}</h1>
            <p className="text-sm capitalize text-zinc-500 dark:text-zinc-400">
              {asset.asset_type.replace("_", " ")} &middot; {asset.asset_id}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <p className={`text-3xl font-bold ${healthColor(asset.health_score)}`}>{asset.health_score}</p>
            <RiskBadge level={asset.risk_level} />
          </div>
        </div>
      </div>

      {actionError && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError}
        </p>
      )}

      <Card>
        <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Sensor readings (simulated)</p>
        {latest_reading ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {readingFields.map((field) => (
                <div key={String(field.key)}>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{field.label}</p>
                  <p className="text-lg font-medium capitalize text-zinc-900 dark:text-zinc-100">
                    {formatReadingValue(latest_reading[field.key], field.unit)}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
              As of {new Date(latest_reading.ts).toLocaleString()}
            </p>
          </>
        ) : (
          <p className="text-sm text-zinc-500">No sensor readings recorded yet.</p>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">AI analysis</p>
        {latest_risk ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <RiskBadge level={latest_risk.risk_level} />
              <span className="text-sm capitalize text-zinc-600 dark:text-zinc-400">
                {latest_risk.risk_type.replace(/_/g, " ")}
              </span>
            </div>
            <p className="text-sm text-zinc-800 dark:text-zinc-200">{latest_risk.notes}</p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No risk assessment recorded yet.</p>
        )}
      </Card>

      {prediction && (
        <Card>
          <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Prediction (next 24h)</p>
          <p className="text-sm text-zinc-800 dark:text-zinc-200">{prediction.notes}</p>
        </Card>
      )}

      <Card>
        <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          Recommendations ({recommendations.length})
        </p>
        {recommendations.length === 0 ? (
          <p className="text-sm text-zinc-500">No pending recommendations for this asset.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <RecommendationCard key={rec.recommendation_id} recommendation={rec} showAssetLink={false}>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDecision(rec.recommendation_id, "approve")}
                    disabled={pendingId === rec.recommendation_id}
                    className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecision(rec.recommendation_id, "reject")}
                    disabled={pendingId === rec.recommendation_id}
                    className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    Reject
                  </button>
                </div>
              </RecommendationCard>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">Today&rsquo;s tasks</p>
        {recommendations.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing pending for this asset today.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {recommendations.map((rec) => (
              <li key={rec.recommendation_id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-zinc-800 dark:text-zinc-200">{rec.recommendation}</span>
                <RiskBadge level={rec.priority} />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">History</p>
        {history.length === 0 ? (
          <p className="text-sm text-zinc-500">No historical records for this asset.</p>
        ) : (
          <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
            {history.map((h) => (
              <div key={`${h.period_label}-${h.metric_name}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{h.period_label}</span>
                  <span className="ml-2 text-zinc-500 dark:text-zinc-400">
                    {h.metric_name.replace(/_/g, " ")}
                  </span>
                  {h.notes && <p className="text-xs text-zinc-400 dark:text-zinc-500">{h.notes}</p>}
                </div>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">{h.metric_value}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
