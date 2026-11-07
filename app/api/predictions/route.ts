import { NextResponse, type NextRequest } from "next/server";
import { requireUser, badRequest } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import {
  predictionInputSchema,
  predictionListQuerySchema,
} from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

// Predictions are personal to a user only through the session; the schema
// has no owner column because the app is single-user.

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = predictionListQuerySchema.safeParse(params);
  if (!parsed.success) return badRequest(parsed.error.flatten());
  const { page, limit, status } = parsed.data;

  const where =
    status === "all" ? {} : { resolved: status === "resolved" };

  const [total, rows] = await prisma.$transaction([
    prisma.prediction.count({ where }),
    prisma.prediction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        market: {
          include: {
            priceSnapshots: { orderBy: { timestamp: "desc" }, take: 1 },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    predictions: rows,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = predictionInputSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  const market = await prisma.market.findUnique({
    where: { id: parsed.data.marketId },
    select: { id: true },
  });
  if (!market) {
    return NextResponse.json({ error: "Market not tracked" }, { status: 404 });
  }

  const prediction = await prisma.prediction.create({
    data: {
      marketId: parsed.data.marketId,
      predictedProb: parsed.data.predictedProb,
      reasoning: parsed.data.reasoning,
    },
  });

  return NextResponse.json({ prediction }, { status: 201 });
}
