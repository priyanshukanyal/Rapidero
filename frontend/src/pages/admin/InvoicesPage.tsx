import { useEffect, useState } from "react";
import {
  fetchInvoices,
  resendInvoiceEmail,
  type InvoiceSummary,
} from "../../lib/invoices";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = invoices.filter((inv) => {
    const name = (inv.client_name || "").toLowerCase();
    const code = (inv.invoice_number || "").toLowerCase();
    const q = search.toLowerCase();
    return !q || name.includes(q) || code.includes(q);
  });

  const handleResend = async (id: string) => {
    try {
      await resendInvoiceEmail(id);
      alert("Invoice email resent");
    } catch (err: any) {
      alert(
        err?.response?.data?.error || "Failed to resend invoice. See console."
      );
      console.error(err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder="Search by client name or invoice #"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-1 text-sm w-80"
        />
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading invoices…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-600">No invoices found.</p>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Invoice #</th>
                <th className="px-3 py-2 text-left">Client</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">PDF</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {inv.invoice_number}
                  </td>
                  <td className="px-3 py-2">{inv.client_name || "-"}</td>
                  <td className="px-3 py-2">
                    {inv.billing_start} – {inv.billing_end}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {inv.grand_total?.toFixed(2)}
                  </td>
                  <td className="px-3 py-2">
                    {inv.pdf_url ? (
                      <a
                        href={inv.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-brand underline"
                      >
                        View PDF
                      </a>
                    ) : (
                      <span className="text-gray-400">Not generated</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => handleResend(inv.id)}
                      className="px-2 py-1 text-xs rounded bg-gray-100 hover:bg-gray-200"
                    >
                      Resend Email
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
