/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";

const mockPrisma = {
  market: { findUnique: jest.fn() },
  prediction: { create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  $transaction: jest.fn(),
};
let mockSession: { user: { id: string } } | null = null;

jest.mock("@/lib/prisma", () => ({
  get prisma() {
    return mockPrisma;
  },
}));
jest.mock("next-auth", () => ({
  getServerSession: jest.fn(async () => mockSession),
}));

// Import after mocks are registered.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { POST, GET } = require("@/app/api/predictions/route");

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/predictions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/predictions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "user-1" } };
  });

  it("rejects unauthenticated requests with 401", async () => {
    mockSession = null;
    const res = await POST(postRequest({ marketId: "m1", predictedProb: 0.5 }));
    expect(res.status).toBe(401);
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("rejects a probability above 1 with 400 and does not touch the database", async () => {
    const res = await POST(postRequest({ marketId: "m1", predictedProb: 1.5 }));
    expect(res.status).toBe(400);
    expect(mockPrisma.market.findUnique).not.toHaveBeenCalled();
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("rejects a non-numeric probability with 400", async () => {
    const res = await POST(postRequest({ marketId: "m1", predictedProb: "0.5" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the market is not tracked", async () => {
    mockPrisma.market.findUnique.mockResolvedValue(null);
    const res = await POST(postRequest({ marketId: "missing", predictedProb: 0.3 }));
    expect(res.status).toBe(404);
    expect(mockPrisma.prediction.create).not.toHaveBeenCalled();
  });

  it("creates a prediction for a valid request", async () => {
    mockPrisma.market.findUnique.mockResolvedValue({ id: "m1" });
    mockPrisma.prediction.create.mockResolvedValue({ id: "p1", predictedProb: 0.3 });

    const res = await POST(postRequest({ marketId: "m1", predictedProb: 0.3, reasoning: "  " }));

    expect(res.status).toBe(201);
    expect(mockPrisma.prediction.create).toHaveBeenCalledWith({
      data: { marketId: "m1", predictedProb: 0.3, reasoning: undefined },
    });
  });
});

describe("GET /api/predictions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSession = { user: { id: "user-1" } };
  });

  it("returns 400 for an out-of-range limit", async () => {
    const req = new NextRequest("http://localhost/api/predictions?limit=500");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});
