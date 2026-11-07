import { TtlCache } from "@/lib/ttl-cache";

// Kalshi's public market-data endpoints. No authentication required.
const BASE_URL =
  process.env.KALSHI_BASE_URL ?? "https://external-api.kalshi.com/trade-api/v2";

const SEARCH_CACHE_TTL_MS = 60_000;
const MAX_PAGES = 5; // up to 5 * 1000 open markets scanned per refresh
const PAGE_SIZE = 1000;

// Kalshi has returned prices both as integer cents (legacy) and as dollar
// strings (e.g. "0.5600"). Both shapes are typed so either can be parsed.
export interface KalshiMarket {
  ticker: string;
  event_ticker?: string;
  title: string;
  status: string;
  result?: "yes" | "no" | "" | null;
  close_time: string;
  yes_bid?: number | null;
  yes_ask?: number | null;
  yes_bid_dollars?: string | null;
  yes_ask_dollars?: string | null;
  volume?: number | null;
  volume_fp?: string | null;
}

export class KalshiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "KalshiError";
  }
}

// Cache of the open-market listing; search filters this in memory so each
// keystroke costs zero Kalshi requests once the listing is warm.
const openMarketsCache = new TtlCache<KalshiMarket[]>(SEARCH_CACHE_TTL_MS);

async function kalshiGet<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE_URL}${path}`);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new KalshiError(`Kalshi request failed: ${res.status}`, res.status);
  }
  return (await res.json()) as T;
}

export async function listOpenMarkets(): Promise<KalshiMarket[]> {
  const cached = openMarketsCache.get("open");
  if (cached) return cached;

  const markets: KalshiMarket[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const params: Record<string, string> = {
      limit: String(PAGE_SIZE),
      status: "open",
    };
    if (cursor) params.cursor = cursor;
    const body = await kalshiGet<{ markets: KalshiMarket[]; cursor?: string }>(
      "/markets",
      params,
    );
    markets.push(...body.markets);
    if (!body.cursor) break;
    cursor = body.cursor;
  }

  openMarketsCache.set("open", markets);
  return markets;
}

export async function searchMarkets(query: string, limit = 20): Promise<KalshiMarket[]> {
  const needle = query.toLowerCase();
  const all = await listOpenMarkets();
  return all
    .filter(
      (m) =>
        m.title.toLowerCase().includes(needle) ||
        m.ticker.toLowerCase().includes(needle),
    )
    .slice(0, limit);
}

export async function getMarket(ticker: string): Promise<KalshiMarket> {
  const body = await kalshiGet<{ market: KalshiMarket }>(
    `/markets/${encodeURIComponent(ticker)}`,
  );
  return body.market;
}

export function clearKalshiCache(): void {
  openMarketsCache.clear();
}
