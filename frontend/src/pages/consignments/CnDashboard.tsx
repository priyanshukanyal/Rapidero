import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../lib/api";

type CNRow = {
  id?: string;
  cn_number: string;
  client?: string;
  booking_datetime?: string;
  shipper_city?: string;
  consignee_city?: string;
  shipper_name?: string;
  consignee_name?: string;
  actual_weight_kg?: number | string;
  current_status_code?: string;
};

type SortField =
  | "booking_datetime"
  | "cn_number"
  | "weight"
  | "consignor"
  | "consignee";

export default function CnDashboard() {
  // 🔹 CN direct search (detail page ke liye)
  const [cnSearch, setCnSearch] = useState("");
  const [recent, setRecent] = useState<CNRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // 🔹 Table filters & sorting
  const [tableSearch, setTableSearch] = useState("");
  const [searchField, setSearchField] = useState<
    "all" | "cn" | "consignor" | "consignee" | "cities"
  >("all");
  const [sortField, setSortField] = useState<SortField>("booking_datetime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const nav = useNavigate();

  // Initial load of recent CNs
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get<CNRow[]>("/consignments", {
          params: { limit: 200 },
        });
        setRecent(res.data || []);
      } catch {
        setRecent([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Direct CN search → detail page
  const searchByCn = async () => {
    const cn = cnSearch.trim();
    if (!cn) return;
    setErr(null);
    try {
      await api.get(`/consignments/ui/${encodeURIComponent(cn)}`);
      nav(`/cn/${encodeURIComponent(cn)}`);
    } catch (e: any) {
      setErr(e?.response?.data?.error || "CN not found");
    }
  };

  // 🔍 Table filtering + sorting (frontend)
  const visibleRows = useMemo(() => {
    let rows = [...recent];

    const term = tableSearch.trim().toLowerCase();
    if (term) {
      rows = rows.filter((r) => {
        const cn = (r.cn_number || "").toLowerCase();
        const consignor = (r.shipper_name || "").toLowerCase();
        const consignee = (r.consignee_name || "").toLowerCase();
        const cities = (
          (r.shipper_city || "") +
          " " +
          (r.consignee_city || "")
        ).toLowerCase();

        switch (searchField) {
          case "cn":
            return cn.includes(term);
          case "consignor":
            return consignor.includes(term);
          case "consignee":
            return consignee.includes(term);
          case "cities":
            return cities.includes(term);
          case "all":
          default:
            return (
              cn.includes(term) ||
              consignor.includes(term) ||
              consignee.includes(term) ||
              cities.includes(term)
            );
        }
      });
    }

    rows.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;

      if (sortField === "booking_datetime") {
        const da = a.booking_datetime
          ? new Date(a.booking_datetime).getTime()
          : 0;
        const db = b.booking_datetime
          ? new Date(b.booking_datetime).getTime()
          : 0;
        return (da - db) * dir;
      }

      if (sortField === "cn_number") {
        return (a.cn_number || "").localeCompare(b.cn_number || "") * dir;
      }

      if (sortField === "weight") {
        const wa = Number(a.actual_weight_kg || 0);
        const wb = Number(b.actual_weight_kg || 0);
        return (wa - wb) * dir;
      }

      if (sortField === "consignor") {
        return (a.shipper_name || "").localeCompare(b.shipper_name || "") * dir;
      }

      if (sortField === "consignee") {
        return (
          (a.consignee_name || "").localeCompare(b.consignee_name || "") * dir
        );
      }

      return 0;
    });

    return rows;
  }, [recent, tableSearch, searchField, sortField, sortDir]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">CN Dashboard</h1>

      {/* 🔹 Direct CN search (detail page navigation) */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="text-sm text-gray-600 mb-2">
          Find consignment by CN number
        </div>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            className="border rounded-md px-3 py-2 flex-1"
            placeholder="Enter CN number"
            value={cnSearch}
            onChange={(e) => {
              setCnSearch(e.target.value);
              setErr(null);
            }}
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

      {/* 🔹 Table filters + sorting */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-3">
          <div className="font-medium">Recent Consignments</div>
          <Link
            to="/cn/create"
            className="text-sm px-3 py-1.5 rounded-md bg-gray-100"
          >
            + Create CN
          </Link>
        </div>

        {/* Filter + sort controls */}
        <div className="flex flex-col md:flex-row gap-3 mb-4 text-sm">
          <div className="flex-1 flex gap-2">
            <input
              className="border rounded-md px-3 py-2 flex-1"
              placeholder="Filter table (CN / name / city)..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            <select
              className="border rounded-md px-2 py-1"
              value={searchField}
              onChange={(e) => setSearchField(e.target.value as any)}
            >
              <option value="all">Search in all fields</option>
              <option value="cn">CN # only</option>
              <option value="consignor">Consignor name</option>
              <option value="consignee">Consignee name</option>
              <option value="cities">Cities (origin/destination)</option>
            </select>

            <select
              className="border rounded-md px-2 py-1"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
            >
              <option value="booking_datetime">Sort by: Booked date</option>
              <option value="cn_number">Sort by: CN number</option>
              <option value="weight">Sort by: Weight</option>
              <option value="consignor">Sort by: Consignor name</option>
              <option value="consignee">Sort by: Consignee name</option>
            </select>

            <button
              type="button"
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="border rounded-md px-3 py-1 flex items-center gap-1"
            >
              {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
            </button>
          </div>
        </div>

        {/* Table */}
        {loading && <div className="text-sm text-gray-500">Loading...</div>}

        {!loading && visibleRows.length === 0 && (
          <div className="text-sm text-gray-500">
            No consignments found. Try changing filters or create a new CN.
          </div>
        )}

        {!loading && visibleRows.length > 0 && (
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
                  <th className="px-3 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((r) => (
                  <tr key={r.id ?? r.cn_number} className="border-t">
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
                    <td className="px-3 py-2">
                      {r.shipper_name || "-"}
                      {r.shipper_city ? ` (${r.shipper_city})` : ""}
                    </td>
                    <td className="px-3 py-2">
                      {r.consignee_name || "-"}
                      {r.consignee_city ? ` (${r.consignee_city})` : ""}
                    </td>
                    <td className="px-3 py-2">{r.actual_weight_kg ?? "-"}</td>
                    <td className="px-3 py-2">
                      {r.current_status_code || "-"}
                    </td>
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
