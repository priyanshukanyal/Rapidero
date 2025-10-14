// src/pages/client/ConsignmentsList.tsx
import { useEffect, useState } from "react";
import { listMyConsignments } from "../../api/client";
import { Link } from "react-router-dom";

export default function ClientCNList() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      try {
        setRows(await listMyConsignments());
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Consignments</h1>
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">CN</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 text-left">Route</th>
              <th className="p-3 text-left">Booked</th>
              <th className="p-3 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="p-4 text-center text-gray-500" colSpan={5}>
                  No consignments
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 font-mono">{r.cn_number}</td>
                  <td className="p-3">{r.current_status_code}</td>
                  <td className="p-3">
                    {r.shipper_city} → {r.consignee_city}
                  </td>
                  <td className="p-3">
                    {r.booking_datetime
                      ? new Date(r.booking_datetime).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-3">
                    <Link
                      to={`/client/consignments/${r.id}`}
                      className="text-brand underline"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
