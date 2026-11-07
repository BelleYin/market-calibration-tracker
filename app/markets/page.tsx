import { MarketWorkbench } from "./MarketWorkbench";

export default function MarketsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Markets</h1>
      <p className="text-sm text-gray-600">
        Search open Kalshi markets, track one, then record your probability that it resolves YES.
      </p>
      <MarketWorkbench />
    </div>
  );
}
