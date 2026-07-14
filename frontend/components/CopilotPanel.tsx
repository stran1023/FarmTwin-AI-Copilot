"use client";

import { useState } from "react";
import { askCopilot, getDashboardSummary, type DashboardSummary } from "@/lib/api";
import { useApiData } from "@/lib/useApiData";
import { RecommendationCard } from "@/components/RecommendationCard";

interface Exchange {
  question: string;
  answer: string;
  pending: boolean;
  error?: string;
}

const EXAMPLE_QUESTIONS = [
  "What should I do today?",
  "Should I feed the fish?",
  "How healthy is the farm?",
];

export function CopilotPanel() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [asking, setAsking] = useState(false);

  const { data: summary, error: recsError } = useApiData<DashboardSummary>(
    "dashboard-summary",
    getDashboardSummary,
  );
  const recommendations = summary?.top_recommendations ?? null;

  async function handleAsk(raw: string) {
    const trimmed = raw.trim();
    if (!trimmed || asking) return;
    setAsking(true);
    setQuestion("");
    setExchanges((prev) => [...prev, { question: trimmed, answer: "", pending: true }]);
    try {
      const res = await askCopilot(trimmed);
      setExchanges((prev) =>
        prev.map((ex, i) => (i === prev.length - 1 ? { ...ex, answer: res.answer, pending: false } : ex)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setExchanges((prev) =>
        prev.map((ex, i) => (i === prev.length - 1 ? { ...ex, pending: false, error: message } : ex)),
      );
    } finally {
      setAsking(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-lg hover:bg-emerald-700"
      >
        <span aria-hidden>🤖</span> Ask Copilot
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/30"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-zinc-950"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <p className="font-semibold text-zinc-950 dark:text-zinc-50">AI Copilot</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close copilot panel"
                className="text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-3">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Today&rsquo;s priorities
                </p>
                {recsError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{recsError}</p>
                )}
                {recommendations === null && !recsError && (
                  <p className="text-sm text-zinc-500">Loading…</p>
                )}
                {recommendations?.length === 0 && (
                  <p className="text-sm text-zinc-500">No pending recommendations right now.</p>
                )}
                <div className="flex flex-col gap-3">
                  {recommendations?.map((rec) => (
                    <RecommendationCard key={rec.recommendation_id} recommendation={rec} />
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  Ask a question
                </p>
                {exchanges.length === 0 && (
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleAsk(q)}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}
                {exchanges.map((ex, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <p className="max-w-[85%] self-end rounded-lg bg-emerald-600 px-3 py-2 text-sm text-white">
                      {ex.question}
                    </p>
                    {ex.pending ? (
                      <p className="rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-500 dark:bg-zinc-900 dark:text-zinc-400">
                        Thinking…
                      </p>
                    ) : ex.error ? (
                      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {ex.error}
                      </p>
                    ) : (
                      <p className="whitespace-pre-wrap rounded-lg bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                        {ex.answer}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk(question);
              }}
              className="flex gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="What should I do today?"
                disabled={asking}
                className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <button
                type="submit"
                disabled={asking || !question.trim()}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Ask
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
