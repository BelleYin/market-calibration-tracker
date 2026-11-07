import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { predictionListQuerySchema } from "@/lib/validation/schemas";

export const dynamic = "force-dynamic";

const STATUS_TABS = ["all", "pending", "resolved"] as const;

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const parsed = predictionListQuerySchema.parse({
    page: searchParams.page,
    status: searchParams.status,
  });
  const { page, status } = parsed;
  const limit = 20;
  const where = status === "all" ? {} : { resolved: status === "resolved" };

  const [total, rows] = await Promise.all([
    prisma.prediction.count({ where }),
    prisma.prediction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        market: {
          select: {
            title: true,
            ticker: true,
            priceSnapshots: { orderBy: { timestamp: "desc" }, take: 1, select: { yesPrice: true } },
          },
        },
      },
    }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const href = (p: number, s: string) => `/predictions?status=${s}&page=${p}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Predictions</h1>

      <nav className="flex gap-2 text-sm">
        {STATUS_TABS.map((s) => (
          <Link
            key={s}
            href={href(1, s)}
            className={`rounded px-3 py-1 capitalize ${
              s === status ? "bg-gray-900 text-white" : "border border-gray-300 hover:bg-gray-100"
            }`}
          >
            {s}
          </Link>
        ))}
      </nav>

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left text-xs uppercase text-gray-600">
            <tr>
              <th className="px-3 py-2">Market</th>
              <th className="px-3 py-2">Your forecast</th>
              <th className="px-3 py-2">Market price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Outcome</th>
              <th className="px-3 py-2">Made</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {rows.map((p) => (
              <tr key={p.id}>
                <td className="px-3 py-2">
                  <p className="font-medium">{p.market.title}</p>
                  <p className="text-xs text-gray-500">{p.market.ticker}</p>
                </td>
                <td className="px-3 py-2">{Math.round(p.predictedProb * 100)}%</td>
                <td className="px-3 py-2">
                  {p.market.priceSnapshots[0] ? `${p.market.priceSnapshots[0].yesPrice}¢` : "—"}
                </td>
                <td className="px-3 py-2">{p.resolved ? "Resolved" : "Pending"}</td>
                <td className="px-3 py-2">
                  {p.outcome === null ? "—" : p.outcome ? "YES" : "NO"}
                </td>
                <td className="px-3 py-2">{p.createdAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No predictions yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 text-sm">
        {page > 1 && (
          <Link href={href(page - 1, status)} className="underline">
            ← Previous
          </Link>
        )}
        <span>
          Page {page} of {totalPages}
        </span>
        {page < totalPages && (
          <Link href={href(page + 1, status)} className="underline">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
