"use client";

import {
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { CalibrationBucket } from "@/lib/calibration";

export function CalibrationChart({ buckets }: { buckets: CalibrationBucket[] }) {
  const points = buckets
    .filter((b) => b.hitRate !== null && b.avgPredicted !== null)
    .map((b) => ({
      predicted: Math.round((b.avgPredicted as number) * 1000) / 10,
      actual: Math.round((b.hitRate as number) * 1000) / 10,
      count: b.count,
      label: b.label,
    }));

  return (
    <div className="h-96 w-full rounded border border-gray-200 bg-white p-4">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="predicted"
            domain={[0, 100]}
            name="Predicted"
            unit="%"
            label={{ value: "Predicted probability", position: "insideBottom", offset: -15 }}
          />
          <YAxis
            type="number"
            dataKey="actual"
            domain={[0, 100]}
            name="Actual"
            unit="%"
            label={{ value: "Actual frequency", angle: -90, position: "insideLeft" }}
          />
          <ZAxis type="number" dataKey="count" range={[60, 400]} name="Predictions" />
          <Tooltip cursor={{ strokeDasharray: "3 3" }} />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ]}
            stroke="#9ca3af"
            strokeDasharray="6 4"
            label={{ value: "Perfect calibration", position: "insideTopLeft", fontSize: 12 }}
          />
          <Scatter data={points} fill="#1f2937" line shape="circle" />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
