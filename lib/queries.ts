import { prisma } from "@/lib/prisma";
import type { ResolvedPrediction } from "@/lib/calibration";

/** All resolved predictions, shaped for the calibration math. */
export async function getCalibrationRows(): Promise<ResolvedPrediction[]> {
  const rows = await prisma.prediction.findMany({
    where: { resolved: true, outcome: { not: null } },
    select: { predictedProb: true, outcome: true },
  });
  return rows.map((r) => ({ predictedProb: r.predictedProb, outcome: r.outcome === true }));
}

export async function getDashboardStats() {
  const [total, resolved, recent, calibrationRows] = await Promise.all([
    prisma.prediction.count(),
    prisma.prediction.count({ where: { resolved: true } }),
    prisma.prediction.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { market: { select: { title: true, ticker: true } } },
    }),
    getCalibrationRows(),
  ]);
  return { total, resolved, pending: total - resolved, recent, calibrationRows };
}
