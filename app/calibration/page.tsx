import { computeCalibration } from "@/lib/calibration";
import { getCalibrationRows } from "@/lib/queries";
import { CalibrationChart } from "./CalibrationChart";

export const dynamic = "force-dynamic";

export default async function CalibrationPage() {
  const report = computeCalibration(await getCalibrationRows());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Calibration</h1>
      <p className="text-sm text-gray-600">
        For each confidence band, how often did the outcome actually happen? A well-calibrated
        forecaster lands on the diagonal.
      </p>

      {report.sampleSize === 0 ? (
        <p className="text-gray-500">No resolved predictions yet.</p>
      ) : (
        <>
          <p className="text-sm">
            Based on <strong>{report.sampleSize}</strong> resolved predictions. Brier score:{" "}
            <strong>{report.brierScore?.toFixed(3)}</strong> (0 is perfect; 0.25 is a coin flip).
          </p>
          <CalibrationChart buckets={report.buckets} />
        </>
      )}
    </div>
  );
}
