import type { KalshiMarket } from "@/lib/kalshi";
import { resolutionOf, volumeCount, yesPriceCents } from "@/lib/market-data";
import { pollPrices } from "@/lib/poll";

const base: KalshiMarket = {
  ticker: "KX-TEST",
  title: "Test market",
  status: "active",
  close_time: "2026-11-12T01:15:00Z",
};

describe("resolutionOf", () => {
  it("resolves to YES when Kalshi reports result yes", () => {
    expect(resolutionOf({ ...base, status: "finalized", result: "yes" })).toEqual({
      resolved: true,
      outcome: true,
    });
  });

  it("resolves to NO when Kalshi reports result no", () => {
    expect(resolutionOf({ ...base, status: "finalized", result: "no" })).toEqual({
      resolved: true,
      outcome: false,
    });
  });

  it("stays unresolved while the result is empty, even if the market has closed", () => {
    expect(resolutionOf({ ...base, status: "closed", result: "" })).toEqual({
      resolved: false,
      outcome: null,
    });
    expect(resolutionOf(base)).toEqual({ resolved: false, outcome: null });
  });
});

describe("yesPriceCents", () => {
  it("uses the bid/ask midpoint from dollar strings", () => {
    expect(yesPriceCents({ ...base, yes_bid_dollars: "0.5500", yes_ask_dollars: "0.5700" })).toBe(56);
  });

  it("falls back to legacy integer-cent fields", () => {
    expect(yesPriceCents({ ...base, yes_bid: 40, yes_ask: 44 })).toBe(42);
  });

  it("ignores a zero bid and uses the ask alone", () => {
    expect(yesPriceCents({ ...base, yes_bid_dollars: "0.0000", yes_ask_dollars: "0.3000" })).toBe(30);
  });

  it("returns null when there is no quote", () => {
    expect(yesPriceCents(base)).toBeNull();
  });
});

describe("volumeCount", () => {
  it("parses fixed-point volume strings", () => {
    expect(volumeCount({ ...base, volume_fp: "1523.00" })).toBe(1523);
  });

  it("defaults to 0", () => {
    expect(volumeCount(base)).toBe(0);
  });
});

// pollPrices end-to-end with Prisma and Kalshi mocked: a settled market should
// snapshot its price and resolve only its unresolved predictions.
const mockPrisma = {
  market: { findMany: jest.fn() },
  priceSnapshot: { create: jest.fn() },
  prediction: { updateMany: jest.fn() },
};
const mockGetMarket = jest.fn();

jest.mock("@/lib/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
jest.mock("@/lib/kalshi", () => {
  const actual = jest.requireActual("@/lib/kalshi");
  return {
    ...actual,
    getMarket: (...args: unknown[]) => mockGetMarket(...args),
  };
});

describe("pollPrices", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves predictions for a settled market", async () => {
    mockPrisma.market.findMany.mockResolvedValue([{ id: "m1", ticker: "KX-TEST" }]);
    mockGetMarket.mockResolvedValue({
      ...base,
      status: "finalized",
      result: "yes",
      yes_bid_dollars: "0.9900",
      yes_ask_dollars: "1.0000",
    });
    mockPrisma.prediction.updateMany.mockResolvedValue({ count: 2 });

    const now = new Date("2026-11-13T00:00:00Z");
    const summary = await pollPrices(now);

    expect(mockPrisma.priceSnapshot.create).toHaveBeenCalledWith({
      data: { marketId: "m1", yesPrice: 99, noPrice: 1, volume: 0 },
    });
    expect(mockPrisma.prediction.updateMany).toHaveBeenCalledWith({
      where: { marketId: "m1", resolved: false },
      data: { resolved: true, outcome: true, resolvedAt: now },
    });
    expect(summary).toEqual({
      marketsChecked: 1,
      snapshotsStored: 1,
      predictionsResolved: 2,
      errors: [],
    });
  });

  it("does not resolve predictions for an open market", async () => {
    mockPrisma.market.findMany.mockResolvedValue([{ id: "m1", ticker: "KX-TEST" }]);
    mockGetMarket.mockResolvedValue({ ...base, yes_bid_dollars: "0.4000", yes_ask_dollars: "0.4200" });

    const summary = await pollPrices();

    expect(mockPrisma.prediction.updateMany).not.toHaveBeenCalled();
    expect(summary.predictionsResolved).toBe(0);
    expect(summary.snapshotsStored).toBe(1);
  });

  it("isolates a failing market and keeps processing the rest", async () => {
    mockPrisma.market.findMany.mockResolvedValue([
      { id: "m1", ticker: "BAD" },
      { id: "m2", ticker: "GOOD" },
    ]);
    mockGetMarket
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({ ...base, ticker: "GOOD", yes_bid: 10, yes_ask: 12 });

    const summary = await pollPrices();

    expect(summary.marketsChecked).toBe(2);
    expect(summary.errors).toEqual([{ ticker: "BAD", message: "unexpected error" }]);
    expect(summary.snapshotsStored).toBe(1);
  });
});
