import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { Client } from "../../types";
import { Link } from "react-router-dom";

export default function ClientsList() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Client[]>("/clients").then(r => setRows(r.data)).finally(()=>setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Link to="/clients/create" className="px-3 py-2 rounded-md bg-brand text-white text-sm">New Client</Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="px-4 py-3" colSpan={4}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td className="px-4 py-3" colSpan={4}>No clients</td></tr>}
            {rows.map(c => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">{c.client_code}</td>
                <td className="px-4 py-2">{c.client_name}</td>
                <td className="px-4 py-2">{c.email || "-"}</td>
                <td className="px-4 py-2">{c.phone || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
