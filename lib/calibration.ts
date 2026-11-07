// Calibration math. This is the one piece of real domain logic in the app, so
// it is pure (no I/O) and covered by unit tests.

export const BUCKET_COUNT = 10;

export interface ResolvedPrediction {
  predictedProb: number; // 0.0 - 1.0
  outcome: boolean; // true = YES happened
}

export interface CalibrationBucket {
  label: string; // e.g. "70–80%"
  lower: number; // inclusive, 0.0 - 1.0
  upper: number; // exclusive, except the top bucket which includes 1.0
  count: number;
  hits: number; // predictions whose outcome was YES
  hitRate: number | null; // hits / count, null when count is 0
  avgPredicted: number | null; // mean predictedProb, null when count is 0
}

export interface CalibrationReport {
  buckets: CalibrationBucket[];
  sampleSize: number;
  brierScore: number | null; // lower is better; 0 is perfect, null when no data
}

/** Index of the bucket containing `p`. 1.0 falls into the top bucket. */
export function bucketIndex(p: number): number {
  if (!Number.isFinite(p)) throw new RangeError(`Invalid probability: ${p}`);
  if (p < 0 || p > 1) throw new RangeError(`Probability out of range: ${p}`);
  return Math.min(BUCKET_COUNT - 1, Math.floor(p * BUCKET_COUNT));
}

function bucketLabel(lower: number, upper: number): string {
  return `${Math.round(lower * 100)}–${Math.round(upper * 100)}%`;
}

export function computeCalibration(rows: ResolvedPrediction[]): CalibrationReport {
  const buckets: CalibrationBucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => {
    const lower = i / BUCKET_COUNT;
    const upper = (i + 1) / BUCKET_COUNT;
    return {
      label: bucketLabel(lower, upper),
      lower,
      upper,
      count: 0,
      hits: 0,
      hitRate: null,
      avgPredicted: null,
    };
  });

  const sums = new Array<number>(BUCKET_COUNT).fill(0);
  let squaredErrorTotal = 0;

  for (const row of rows) {
    const i = bucketIndex(row.predictedProb);
    const bucket = buckets[i];
    bucket.count += 1;
    sums[i] += row.predictedProb;
    if (row.outcome) bucket.hits += 1;

    const actual = row.outcome ? 1 : 0;
    squaredErrorTotal += (row.predictedProb - actual) ** 2;
  }

  for (let i = 0; i < BUCKET_COUNT; i++) {
    const b = buckets[i];
    if (b.count > 0) {
      b.hitRate = b.hits / b.count;
      b.avgPredicted = sums[i] / b.count;
    }
  }

  return {
    buckets,
    sampleSize: rows.length,
    brierScore: rows.length > 0 ? squaredErrorTotal / rows.length : null,
  };
}
