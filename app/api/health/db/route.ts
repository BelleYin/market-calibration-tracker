import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [row] = await prisma.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
    const userCount = await prisma.user.count();
    return NextResponse.json({ db: "ok", ping: row.ok, userCount });
  } catch (err) {
    return NextResponse.json(
      { db: "error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 },
    );
  }
}
