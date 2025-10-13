import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";

type CNRow = {
  id?: string;
  cn_number: string;
  client?: string;
  booking_datetime?: string;
  consignorName?: string;
  consigneeName?: string;
  weight?: number | string;
};

export default function CnDashboard() {
  const [cnSearch, setCnSearch] = useState("");
  const [recent, setRecent] = useState<CNRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get<CNRow[]>("/consignments", {
          params: { limit: 50 },
        });
        setRecent(res.data);
      } catch {
        setRecent([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const searchByCn = async () => {
    if (!cnSearch.trim()) return;
    try {
      await api.get(`/consignments/ui/${encodeURIComponent(cnSearch.trim())}`);
      nav(`/cn/${encodeURIComponent(cnSearch.trim())}`);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "CN not found");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">CN Dashboard</h1>

      <div className="bg-white p-4 rounded-xl shadow">
        <div className="text-sm text-gray-600 mb-2">
          Find consignment by CN number
        </div>
        <div className="flex gap-2">
          <input
            className="border rounded-md px-3 py-2 flex-1"
            placeholder="Enter CN number"
            value={cnSearch}
            onChange={(e) => setCnSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchByCn()}
          />
          <button
            onClick={searchByCn}
            className="px-3 py-2 rounded-md bg-brand text-white"
          >
            Search
          </button>
        </div>
        {err && <div className="text-red-600 text-sm mt-2">{err}</div>}
      </div>

      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Recent Consignments</div>
          <Link
            to="/cn/create"
            className="text-sm px-3 py-1.5 rounded-md bg-gray-100"
          >
            + Create CN
          </Link>
        </div>

        {loading && <div className="text-sm text-gray-500">Loading...</div>}
        {!loading && recent.length === 0 && (
          <div className="text-sm text-gray-500">
            No recent list endpoint or no data yet. You can still search above.
          </div>
        )}

        {recent.length > 0 && (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">CN #</th>
                  <th className="px-3 py-2 text-left">Client</th>
                  <th className="px-3 py-2 text-left">Booked At</th>
                  <th className="px-3 py-2 text-left">Consignor</th>
                  <th className="px-3 py-2 text-left">Consignee</th>
                  <th className="px-3 py-2 text-left">Weight</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r) => (
                  <tr key={r.cn_number} className="border-t">
                    <td className="px-3 py-2">
                      <Link
                        className="text-brand"
                        to={`/cn/${encodeURIComponent(r.cn_number)}`}
                      >
                        {r.cn_number}
                      </Link>
                    </td>
                    <td className="px-3 py-2">{r.client || "-"}</td>
                    <td className="px-3 py-2">
                      {r.booking_datetime
                        ? new Date(r.booking_datetime).toLocaleString()
                        : "-"}
                    </td>
                    <td className="px-3 py-2">{r.consignorName || "-"}</td>
                    <td className="px-3 py-2">{r.consigneeName || "-"}</td>
                    <td className="px-3 py-2">{r.weight ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
