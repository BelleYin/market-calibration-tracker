import { NextResponse, type NextRequest } from "next/server";
import { requireUser, badRequest } from "@/lib/api";
import { KalshiError, searchMarkets } from "@/lib/kalshi";
import { marketSearchSchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const parsed = marketSearchSchema.safeParse({
    query: req.nextUrl.searchParams.get("query") ?? "",
  });
  if (!parsed.success) return badRequest(parsed.error.flatten());

  try {
    const markets = await searchMarkets(parsed.data.query);
    return NextResponse.json({
      markets: markets.map((m) => ({
        ticker: m.ticker,
        title: m.title,
        status: m.status,
        closeTime: m.close_time,
      })),
    });
  } catch (err) {
    const status = err instanceof KalshiError ? 502 : 500;
    return NextResponse.json({ error: "Market search unavailable" }, { status });
  }
}
