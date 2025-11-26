// client/src/pages/AdminInvoicesPage.tsx
import { useEffect, useState } from "react";
import {
  fetchInvoices,
  generateInvoice,
  resendInvoiceEmail,
  type InvoiceSummary,
} from "../lib/invoices";

export default function AdminInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    contract_id: "",
    billing_start: "",
    billing_end: "",
    send_email: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const onGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await generateInvoice(form);
      await load();
      alert("Invoice generated");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Failed to generate");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h1>Invoices</h1>

      <form onSubmit={onGenerate} style={{ marginBottom: 16 }}>
        <input
          placeholder="Client ID"
          value={form.client_id}
          onChange={(e) =>
            setForm((f) => ({ ...f, client_id: e.target.value }))
          }
        />
        <input
          placeholder="Contract ID"
          value={form.contract_id}
          onChange={(e) =>
            setForm((f) => ({ ...f, contract_id: e.target.value }))
          }
        />
        <input
          type="date"
          value={form.billing_start}
          onChange={(e) =>
            setForm((f) => ({ ...f, billing_start: e.target.value }))
          }
        />
        <input
          type="date"
          value={form.billing_end}
          onChange={(e) =>
            setForm((f) => ({ ...f, billing_end: e.target.value }))
          }
        />
        <label>
          <input
            type="checkbox"
            checked={form.send_email}
            onChange={(e) =>
              setForm((f) => ({ ...f, send_email: e.target.checked }))
            }
          />
          &nbsp;Send email
        </label>
        <button type="submit">Generate</button>
      </form>

      {loading ? (
        <p>Loading…</p>
      ) : (
        <table border={1} cellPadding={4}>
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Period</th>
              <th>Amount</th>
              <th>PDF</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoice_number}</td>
                <td>
                  {inv.billing_start} – {inv.billing_end}
                </td>
                <td>{inv.grand_total.toFixed(2)}</td>
                <td>
                  {inv.pdf_url ? (
                    <a href={inv.pdf_url} target="_blank" rel="noreferrer">
                      PDF
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
                <td>
                  <button onClick={() => resendInvoiceEmail(inv.id)}>
                    Resend Email
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
