import type { KalshiMarket } from "@/lib/kalshi";

// Pure helpers that translate raw Kalshi market payloads into the values the
// app stores. Kept free of I/O so they can be unit tested directly.

function dollarsToCents(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function bidOrAskCents(
  dollars: string | null | undefined,
  legacyCents: number | null | undefined,
): number | null {
  const fromDollars = dollarsToCents(dollars);
  if (fromDollars !== null) return fromDollars;
  if (typeof legacyCents === "number" && Number.isFinite(legacyCents)) {
    return legacyCents;
  }
  return null;
}

/**
 * Current YES price in cents (0-100), taken as the bid/ask midpoint.
 * Falls back to whichever side is present; returns null if neither is.
 */
export function yesPriceCents(m: KalshiMarket): number | null {
  const bid = bidOrAskCents(m.yes_bid_dollars, m.yes_bid);
  const ask = bidOrAskCents(m.yes_ask_dollars, m.yes_ask);

  // A zero bid/ask means "no quote on that side", so ignore it.
  const validBid = bid !== null && bid > 0 ? bid : null;
  const validAsk = ask !== null && ask > 0 && ask < 100 ? ask : null;

  if (validBid !== null && validAsk !== null) {
    return Math.round((validBid + validAsk) / 2);
  }
  return validBid ?? validAsk;
}

export function volumeCount(m: KalshiMarket): number {
  const fromFp = m.volume_fp ? Number(m.volume_fp) : NaN;
  if (Number.isFinite(fromFp)) return Math.round(fromFp);
  if (typeof m.volume === "number" && Number.isFinite(m.volume)) {
    return Math.round(m.volume);
  }
  return 0;
}

export interface Resolution {
  resolved: boolean;
  /** true = YES won, false = NO won. Only meaningful when resolved. */
  outcome: boolean | null;
}

/**
 * A market is settled once Kalshi publishes a YES or NO result. Status
 * alone is not enough: markets can be "closed" or "determined" before the
 * result field is populated.
 */
export function resolutionOf(m: KalshiMarket): Resolution {
  if (m.result === "yes") return { resolved: true, outcome: true };
  if (m.result === "no") return { resolved: true, outcome: false };
  return { resolved: false, outcome: null };
}
