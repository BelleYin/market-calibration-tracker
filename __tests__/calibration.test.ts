import { BUCKET_COUNT, bucketIndex, computeCalibration } from "@/lib/calibration";

describe("bucketIndex", () => {
  it.each([
    [0, 0],
    [0.099, 0],
    [0.1, 1],
    [0.5, 5],
    [0.7, 7],
    [0.999, 9],
    [1, 9], // 100% belongs in the top bucket, not an out-of-range index
  ])("maps %p to bucket %p", (p, expected) => {
    expect(bucketIndex(p)).toBe(expected);
  });

  it("rejects probabilities outside [0, 1]", () => {
    expect(() => bucketIndex(-0.01)).toThrow(RangeError);
    expect(() => bucketIndex(1.01)).toThrow(RangeError);
    expect(() => bucketIndex(Number.NaN)).toThrow(RangeError);
  });
});

describe("computeCalibration", () => {
  it("returns empty buckets and null Brier score with no data", () => {
    const report = computeCalibration([]);
    expect(report.buckets).toHaveLength(BUCKET_COUNT);
    expect(report.sampleSize).toBe(0);
    expect(report.brierScore).toBeNull();
    expect(report.buckets.every((b) => b.count === 0 && b.hitRate === null)).toBe(true);
  });

  it("computes hit rate and average prediction per bucket", () => {
    const report = computeCalibration([
      { predictedProb: 0.7, outcome: true },
      { predictedProb: 0.72, outcome: true },
      { predictedProb: 0.75, outcome: false },
      { predictedProb: 0.1, outcome: false },
    ]);

    const seventies = report.buckets[7];
    expect(seventies.label).toBe("70–80%");
    expect(seventies.count).toBe(3);
    expect(seventies.hits).toBe(2);
    expect(seventies.hitRate).toBeCloseTo(2 / 3);
    expect(seventies.avgPredicted).toBeCloseTo((0.7 + 0.72 + 0.75) / 3);

    expect(report.buckets[1].count).toBe(1);
    expect(report.buckets[1].hitRate).toBe(0);
    expect(report.buckets[3].count).toBe(0);
    expect(report.buckets[3].hitRate).toBeNull();
  });

  it("computes the Brier score as mean squared error", () => {
    // (0.8 - 1)^2 = 0.04 ; (0.2 - 0)^2 = 0.04 ; mean = 0.04
    const report = computeCalibration([
      { predictedProb: 0.8, outcome: true },
      { predictedProb: 0.2, outcome: false },
    ]);
    expect(report.brierScore).toBeCloseTo(0.04);
  });

  it("scores a perfect forecaster at 0 and a maximally wrong one at 1", () => {
    expect(
      computeCalibration([
        { predictedProb: 1, outcome: true },
        { predictedProb: 0, outcome: false },
      ]).brierScore,
    ).toBe(0);
    expect(
      computeCalibration([
        { predictedProb: 1, outcome: false },
        { predictedProb: 0, outcome: true },
      ]).brierScore,
    ).toBe(1);
  });

  it("gives a constant 50% forecast a Brier score of 0.25", () => {
    const rows = [true, false, true, false].map((outcome) => ({
      predictedProb: 0.5,
      outcome,
    }));
    expect(computeCalibration(rows).brierScore).toBeCloseTo(0.25);
  });
});
