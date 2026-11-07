"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  predictionInputSchema,
  marketSearchSchema,
} from "@/lib/validation/schemas";

interface SearchResult {
  ticker: string;
  title: string;
  status: string;
  closeTime: string;
}

interface TrackedMarket {
  id: string;
  ticker: string;
  title: string;
}

export function MarketWorkbench() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<TrackedMarket | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Debounced search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const parsed = marketSearchSchema.safeParse({ query });
    if (!parsed.success) {
      setResults([]);
      setSearchError(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const res = await fetch(
          `/api/markets/search?query=${encodeURIComponent(parsed.data.query)}`,
          { signal: controller.signal },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Search failed");
        setResults(body.markets);
      } catch (err) {
        if (controller.signal.aborted) return;
        setResults([]);
        setSearchError(err instanceof Error ? err.message : "Search failed");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function track(ticker: string) {
    setMessage(null);
    const res = await fetch("/api/markets/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker }),
    });
    const body = await res.json();
    if (!res.ok) {
      setMessage(body.error ?? "Could not track market");
      return;
    }
    setSelected(body.market);
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <section className="space-y-4">
        <input
          type="search"
          placeholder="Search open markets, e.g. 'rain' or 'NFL'"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded border border-gray-300 px-3 py-2"
          aria-label="Search markets"
        />
        {searching && <p className="text-sm text-gray-500">Searching…</p>}
        {searchError && <p className="text-sm text-red-600">{searchError}</p>}
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {results.map((r) => (
            <li key={r.ticker} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.title}</p>
                <p className="text-xs text-gray-500">{r.ticker}</p>
              </div>
              <button
                type="button"
                onClick={() => track(r.ticker)}
                className="shrink-0 rounded border border-gray-300 px-3 py-1 text-sm hover:bg-gray-100"
              >
                Track
              </button>
            </li>
          ))}
        </ul>
        {message && <p className="text-sm text-red-600">{message}</p>}
      </section>

      <section>
        {selected ? (
          <PredictionForm key={selected.id} market={selected} />
        ) : (
          <p className="text-sm text-gray-500">Track a market to record a prediction on it.</p>
        )}
      </section>
    </div>
  );
}

function PredictionForm({ market }: { market: TrackedMarket }) {
  const [percent, setPercent] = useState("50");
  const [reasoning, setReasoning] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);

    const parsed = predictionInputSchema.safeParse({
      marketId: market.id,
      predictedProb: Number(percent) / 100,
      reasoning,
    });
    if (!parsed.success) {
      setErrors(parsed.error.issues.map((i) => i.message));
      return;
    }
    setErrors([]);

    const res = await fetch("/api/predictions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
    });
    if (!res.ok) {
      setStatus("Could not save prediction");
      return;
    }
    setStatus("Prediction saved");
    setReasoning("");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded border border-gray-200 bg-white p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Predicting</p>
        <p className="font-medium">{market.title}</p>
        <p className="text-xs text-gray-500">{market.ticker}</p>
      </div>
      <label className="block text-sm">
        Probability that this resolves YES (%)
        <input
          type="number"
          min={0}
          max={100}
          step={1}
          value={percent}
          onChange={(e) => setPercent(e.target.value)}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        Reasoning (optional)
        <textarea
          value={reasoning}
          onChange={(e) => setReasoning(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>
      {errors.map((err) => (
        <p key={err} className="text-sm text-red-600">
          {err}
        </p>
      ))}
      {status && <p className="text-sm text-gray-700">{status}</p>}
      <button type="submit" className="rounded bg-gray-900 px-4 py-2 text-white">
        Save prediction
      </button>
    </form>
  );
}
