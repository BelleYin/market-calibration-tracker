import { NextResponse, type NextRequest } from "next/server";
import { requireUser, badRequest } from "@/lib/api";
import { KalshiError, getMarket } from "@/lib/kalshi";
import { prisma } from "@/lib/prisma";
import { trackMarketSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const body = await req.json().catch(() => null);
  const parsed = trackMarketSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.flatten());

  // Validate the ticker exists on Kalshi before storing it.
  let kalshi;
  try {
    kalshi = await getMarket(parsed.data.ticker);
  } catch (err) {
    if (err instanceof KalshiError && err.status === 404) {
      return NextResponse.json({ error: "Market not found on Kalshi" }, { status: 404 });
    }
    return NextResponse.json({ error: "Kalshi unavailable" }, { status: 502 });
  }

  const market = await prisma.market.upsert({
    where: { ticker: kalshi.ticker },
    update: { title: kalshi.title, closeTime: new Date(kalshi.close_time) },
    create: {
      ticker: kalshi.ticker,
      title: kalshi.title,
      closeTime: new Date(kalshi.close_time),
      category: kalshi.event_ticker ?? null,
    },
  });

  return NextResponse.json({ market }, { status: 201 });
}
