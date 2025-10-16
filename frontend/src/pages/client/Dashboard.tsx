// src/pages/client/Dashboard.tsx
import { useEffect, useState } from "react";
import api from "../../lib/api";
import { useAuth } from "../../store/auth";

type Dash = {
  total: number;
  delivered: number;
  in_transit: number;
  rto: number;
  series?: { d: string; c: number }[];
};

export default function ClientDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<Dash | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!user?.roles?.includes("CLIENT")) {
          setErr("You do not have client access.");
          return;
        }
        const { data } = await api.get<Dash>("/clients/me/dashboard");
        setData(data);
      } catch (e: any) {
        const msg =
          e?.response?.status === 403
            ? "Forbidden: your account is not linked to a client."
            : e?.response?.data?.error || e?.message || "Failed to load";
        setErr(msg);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) return <div>Loading…</div>;
  if (err) return <div className="text-red-600">{err}</div>;
  if (!data) return <div>No data</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Consignments</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Total" value={data.total} />
        <Stat label="Delivered" value={data.delivered} />
        <Stat label="In Transit" value={data.in_transit} />
        <Stat label="RTO" value={data.rto} />
      </div>
      <div className="bg-white rounded-xl p-4 shadow">
        <div className="text-sm text-gray-500 mb-2">Last 30 days</div>
        <div className="text-xs text-gray-600">
          {data.series?.length
            ? data.series.map((x) => `${x.d}: ${x.c}`).join(" · ")
            : "—"}
        </div>
      </div>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-semibold">{Number(value) || 0}</div>
    </div>
  );
}
