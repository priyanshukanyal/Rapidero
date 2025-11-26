import { useEffect, useState } from "react";
import { fetchMyInvoices, type InvoiceSummary } from "../../lib/invoices";

export default function ClientInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyInvoices();
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

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">My Invoices</h1>

      {loading ? (
        <p className="text-sm text-gray-600">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <p className="text-sm text-gray-600">No invoices found.</p>
      ) : (
        <div className="overflow-x-auto bg-white border rounded-md">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2 text-left">Invoice #</th>
                <th className="px-3 py-2 text-left">Period</th>
                <th className="px-3 py-2 text-right">Amount</th>
                <th className="px-3 py-2 text-left">PDF</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-t">
                  <td className="px-3 py-2 font-medium">
                    {inv.invoice_number}
                  </td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
