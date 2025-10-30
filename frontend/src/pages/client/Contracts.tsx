import { useEffect, useState } from "react";
import { listMyContracts } from "../../api/contracts";

export default function ClientContracts() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setRows(await listMyContracts());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Loading…</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Contracts</h1>
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-2">Code</th>
              <th className="px-4 py-2">Agreement Date</th>
              <th className="px-4 py-2">Term</th>
              <th className="px-4 py-2">PDF</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-4 py-2 font-medium">{r.contract_code}</td>
                <td className="px-4 py-2">
                  {r.agreement_date
                    ? new Date(r.agreement_date).toLocaleDateString()
                    : "-"}
                </td>
                <td className="px-4 py-2">
                  {r.term_start
                    ? new Date(r.term_start).toLocaleDateString()
                    : "-"}{" "}
                  →
                  {r.term_end ? new Date(r.term_end).toLocaleDateString() : "-"}
                </td>
                <td className="px-4 py-2">
                  {r.pdf_url ? (
                    <a
                      href={r.pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline"
                    >
                      View PDF
                    </a>
                  ) : (
                    <span className="text-gray-400">Not available</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                  No contracts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
