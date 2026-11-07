import { NextResponse } from "next/server";
import { requireUser } from "@/lib/api";
import { computeCalibration } from "@/lib/calibration";
import { getCalibrationRows } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireUser();
  if (auth.response) return auth.response;

  const rows = await getCalibrationRows();
  return NextResponse.json(computeCalibration(rows));
}
