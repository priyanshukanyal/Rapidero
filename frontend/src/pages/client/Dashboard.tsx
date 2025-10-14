// src/pages/client/Dashboard.tsx
import { useEffect, useState } from "react";
import { getClientDashboard } from "../../api/client";

export default function ClientDashboard() {
  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        setD(await getClientDashboard());
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  if (loading) return <div>Loading…</div>;
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Consignments</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total" value={d.total} />
        <StatCard label="Delivered" value={d.delivered} />
        <StatCard label="In Transit" value={d.in_transit} />
        <StatCard label="RTO" value={d.rto} />
      </div>
      {/* optional mini series */}
      <div className="bg-white rounded-xl p-4 shadow">
        <div className="text-sm text-gray-500 mb-2">Last 30 days</div>
        <div className="text-xs text-gray-600">
          {d.series?.map((x: any) => `${x.d}: ${x.c}`).join(" · ")}
        </div>
      </div>
    </div>
  );
}
function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{value ?? 0}</div>
    </div>
  );
}
