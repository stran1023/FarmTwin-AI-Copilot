"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getPlots, type Plot } from "@/lib/api";
import { Card } from "@/components/Card";
import { RiskBadge } from "@/components/RiskBadge";

const FarmMap = dynamic(() => import("@/components/FarmMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-xl border border-zinc-200 text-zinc-500 dark:border-zinc-800">
      Loading map…
    </div>
  ),
});

export default function PlotListPage() {
  const [plots, setPlots] = useState<Plot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPlots()
      .then(setPlots)
      .catch((err) => setError(err instanceof Error ? err.message : String(err)));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-zinc-950 dark:text-zinc-50">
        Today&apos;s plots
      </h1>

      {error && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}
      {!plots && !error && <p className="text-zinc-500">Loading plots…</p>}
      {plots?.length === 0 && <p className="text-zinc-500">No plots found.</p>}

      {plots && plots.length > 0 && <FarmMap plots={plots} />}

      <div className="flex flex-col gap-3">
        {plots?.map((plot) => (
          <Link key={plot.plot_id} href={`/plots/${plot.plot_id}`}>
            <Card className="transition-colors hover:border-zinc-400 dark:hover:border-zinc-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-zinc-950 dark:text-zinc-50">{plot.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    {plot.lat.toFixed(3)}, {plot.lon.toFixed(3)}
                  </p>
                </div>
                <RiskBadge level={plot.risk_level} />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
