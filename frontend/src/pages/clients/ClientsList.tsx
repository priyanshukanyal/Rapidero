// src/modules/clients/ClientsList.tsx

import { useEffect, useState } from "react";
import api from "../../lib/api";
import type { Client } from "../../types";
import { Link } from "react-router-dom";

export default function ClientsList() {
  const [rows, setRows] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [canDelete, setCanDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Load clients
    api
      .get<Client[]>("/clients")
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));

    // Check user roles from localStorage
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const user = JSON.parse(raw);
      const roles: string[] = user?.roles || [];
      if (roles.includes("ADMIN") || roles.includes("OPS")) {
        setCanDelete(true);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleDelete = async (id: string) => {
    const client = rows.find((c) => c.id === id);
    const label = client
      ? `${client.client_code || ""} ${client.client_name || ""}`.trim()
      : "";

    // First confirmation
    if (
      !window.confirm(`Are you sure you want to delete client ${label || ""}?`)
    ) {
      return;
    }

    setDeletingId(id);

    try {
      // 1️⃣ First attempt: normal delete
      await api.delete(`/clients/${id}`);
      setRows((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) {
      const status = e?.response?.status;
      const data = e?.response?.data || {};

      // Debug if needed:
      // console.log("Delete error payload:", data);

      // Case A: client has contracts → show deadline + warning + second confirm
      if (status === 409 && data?.reason === "HAS_CONTRACTS") {
        const contractsCount = data.contracts_count || 0;
        const endRaw = data.latest_contract_end_date;

        // 🔧 Make the message clear when end date is NULL (open-ended contract)
        const formattedEnd = endRaw
          ? new Date(endRaw).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "no end date defined (ongoing contract)";

        const msg = [
          `This client has ${contractsCount} contract(s).`,
          `Latest contract end date: ${formattedEnd}.`,
          "",
          "If you continue:",
          "- All contracts for this client will be deleted (treated as cancelled).",
          "- An email will be sent to the client that their contract is cancelled by Rapidero.",
          "",
          "Do you still want to delete this client?",
        ].join("\n");

        const confirmForce = window.confirm(msg);
        if (!confirmForce) {
          setDeletingId(null);
          return;
        }

        try {
          // 2️⃣ Second attempt: force delete (deletes contracts + sends email)
          await api.delete(`/clients/${id}`, {
            params: { force: 1 },
          });
          setRows((prev) => prev.filter((c) => c.id !== id));
        } catch (e2: any) {
          const d2 = e2?.response?.data || {};
          window.alert(
            d2?.error || e2?.message || "Failed to delete client (force)"
          );
        } finally {
          setDeletingId(null);
        }

        return;
      }

      // Case B: consignments linked or any other backend error
      window.alert(data?.error || e?.message || "Failed to delete client");
      setDeletingId(null);
    } finally {
      // safety
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Clients</h1>
        <Link
          to="/clients/create"
          className="px-3 py-2 rounded-md bg-brand text-white text-sm"
        >
          New Client
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left">Code</th>
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Phone</th>
              {canDelete && (
                <th className="px-4 py-2 text-left w-24">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-3" colSpan={canDelete ? 5 : 4}>
                  Loading...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-4 py-3" colSpan={canDelete ? 5 : 4}>
                  No clients
                </td>
              </tr>
            )}
            {rows.map((c) => (
              <tr key={c.id} className="border-t">
                <td className="px-4 py-2">{c.client_code}</td>
                <td className="px-4 py-2">{c.client_name}</td>
                <td className="px-4 py-2">{c.email || "-"}</td>
                <td className="px-4 py-2">{c.phone || "-"}</td>
                {canDelete && (
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deletingId === c.id}
                      className="px-2 py-1 text-xs rounded-md bg-red-50 text-red-700 border border-red-200 disabled:opacity-50"
                    >
                      {deletingId === c.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
