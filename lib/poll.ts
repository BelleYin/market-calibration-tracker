import { getMarket, KalshiError } from "@/lib/kalshi";
import { prisma } from "@/lib/prisma";
import { resolutionOf, yesPriceCents, volumeCount } from "@/lib/market-data";

export interface PollSummary {
  marketsChecked: number;
  snapshotsStored: number;
  predictionsResolved: number;
  errors: { ticker: string; message: string }[];
}

/**
 * For every tracked market that still has an unresolved prediction: fetch
 * the current Kalshi state, store a price snapshot, and if Kalshi has
 * published a result, resolve the linked predictions.
 *
 * Errors are isolated per market so one bad ticker doesn't stop the run.
 */
export async function pollPrices(now: Date = new Date()): Promise<PollSummary> {
  const markets = await prisma.market.findMany({
    where: { predictions: { some: { resolved: false } } },
    select: { id: true, ticker: true },
  });

  const summary: PollSummary = {
    marketsChecked: 0,
    snapshotsStored: 0,
    predictionsResolved: 0,
    errors: [],
  };

  for (const market of markets) {
    summary.marketsChecked += 1;
    try {
      const kalshi = await getMarket(market.ticker);

      const yes = yesPriceCents(kalshi);
      if (yes !== null) {
        await prisma.priceSnapshot.create({
          data: {
            marketId: market.id,
            yesPrice: yes,
            noPrice: 100 - yes,
            volume: volumeCount(kalshi),
          },
        });
        summary.snapshotsStored += 1;
      }

      const resolution = resolutionOf(kalshi);
      if (resolution.resolved) {
        const result = await prisma.prediction.updateMany({
          where: { marketId: market.id, resolved: false },
          data: { resolved: true, outcome: resolution.outcome, resolvedAt: now },
        });
        summary.predictionsResolved += result.count;
      }
    } catch (err) {
      summary.errors.push({
        ticker: market.ticker,
        message: err instanceof KalshiError ? err.message : "unexpected error",
      });
    }
  }

  return summary;
}
