"use client";

import { useEffect, useState } from "react";
import { getBriefingToday, type BriefingToday, type Recommendation } from "@/lib/api";
import { Card } from "@/components/Card";
import { RecommendationCard } from "@/components/RecommendationCard";

function DecisionMeta({
  recommendation,
  tone,
}: {
  recommendation: Recommendation;
  tone: "approved" | "rejected";
}) {
  return (
    <p
      className={
        tone === "approved"
          ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
          : "text-xs font-medium text-red-700 dark:text-red-400"
      }
    >
      {tone === "approved" ? "Approved" : "Rejected"}
      {recommendation.approved_by && ` by ${recommendation.approved_by}`}
      {recommendation.approved_at && ` at ${new Date(recommendation.approved_at).toLocaleTimeString()}`}
    </p>
  );
}

function RecommendationList({
  recommendations,
  tone,
}: {
  recommendations: Recommendation[];
  tone: "approved" | "rejected";
}) {
  if (recommendations.length === 0) {
    return <p className="text-sm text-zinc-500">None yet today.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {recommendations.map((rec) => (
        <RecommendationCard key={rec.recommendation_id} recommendation={rec}>
          <DecisionMeta recommendation={rec} tone={tone} />
        </RecommendationCard>
      ))}
    </div>
  );
}

export default function BriefingPage() {
  const [briefing, setBriefing] = useState<BriefingToday | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBriefingToday()
      .then(setBriefing)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Daily briefing
      </h1>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {!briefing && !error && <p className="text-zinc-500">Loading briefing…</p>}

      {briefing && (
        <>
          <Card>
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              <span aria-hidden>📋</span>
              {new Date(briefing.date).toLocaleDateString()}
            </div>
            <p className="whitespace-pre-line text-zinc-800 dark:text-zinc-200">
              {briefing.summary}
            </p>
          </Card>

          <Card>
            <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Approved ({briefing.approved_recommendations.length})
            </p>
            <RecommendationList recommendations={briefing.approved_recommendations} tone="approved" />
          </Card>

          <Card>
            <p className="mb-2 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
              Rejected ({briefing.rejected_recommendations.length})
            </p>
            <RecommendationList recommendations={briefing.rejected_recommendations} tone="rejected" />
          </Card>
        </>
      )}
    </div>
  );
}
