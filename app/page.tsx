import Link from "next/link";
import { computeCalibration } from "@/lib/calibration";
import { getDashboardStats } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const stats = await getDashboardStats();
  const report = computeCalibration(stats.calibrationRows);

  const cards = [
    { label: "Predictions", value: stats.total },
    { label: "Resolved", value: stats.resolved },
    { label: "Pending", value: stats.pending },
    {
      label: "Brier score",
      value: report.brierScore === null ? "—" : report.brierScore.toFixed(3),
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded border border-gray-200 bg-white p-4">
            <dt className="text-xs uppercase tracking-wide text-gray-500">{c.label}</dt>
            <dd className="mt-1 text-2xl font-semibold">{c.value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Recent predictions</h2>
          <Link href="/predictions" className="text-sm underline">
            View all
          </Link>
        </div>
        <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
          {stats.recent.map((p) => (
            <li key={p.id} className="flex justify-between gap-4 p-3 text-sm">
              <span className="truncate">{p.market.title}</span>
              <span className="shrink-0 tabular-nums">
                {Math.round(p.predictedProb * 100)}% · {p.resolved ? (p.outcome ? "YES" : "NO") : "pending"}
              </span>
            </li>
          ))}
          {stats.recent.length === 0 && (
            <li className="p-3 text-sm text-gray-500">
              No predictions yet. <Link href="/markets" className="underline">Find a market</Link>.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
