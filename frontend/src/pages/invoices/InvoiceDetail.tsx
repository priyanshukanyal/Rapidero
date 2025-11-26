import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchInvoiceById, type InvoiceVM } from "../../lib/invoices";

export default function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InvoiceVM | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res = await fetchInvoiceById(id);
        setData(res);
      } finally {
        setLoading(false);
      }
    })().catch(console.error);
  }, [id]);

  if (loading || !data) return <p>Loading...</p>;

  const { invoice, client, lines } = data;

  return (
    <div className="page">
      <h1>Invoice {invoice.invoice_number}</h1>
      <p>
        <strong>Client:</strong> {client.client_name}
      </p>
      <p>
        <strong>Period:</strong> {invoice.billing_start} – {invoice.billing_end}
      </p>
      <p>
        <strong>Grand Total:</strong> ₹ {invoice.grand_total.toFixed(2)}
      </p>

      <table className="table" style={{ marginTop: 16 }}>
        <thead>
          <tr>
            <th>#</th>
            <th>Cnote</th>
            <th>Date</th>
            <th>From</th>
            <th>To</th>
            <th>Act Wt</th>
            <th>Chg Wt</th>
            <th>Rate</th>
            <th>Freight</th>
            <th>Docket</th>
            <th>FOV</th>
            <th>FSC</th>
            <th>ODA</th>
            <th>Green Tax</th>
            <th>Line Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l, idx) => (
            <tr key={l.id || idx}>
              <td>{idx + 1}</td>
              <td>{l.cn_number}</td>
              <td>{l.booking_date}</td>
              <td>{l.origin_city}</td>
              <td>{l.dest_city}</td>
              <td>{l.actual_weight_kg}</td>
              <td>{l.charged_weight_kg}</td>
              <td>{l.rate_per_kg}</td>
              <td>{l.basic_freight}</td>
              <td>{l.docket_charge}</td>
              <td>{l.fov_amount}</td>
              <td>{l.fsc_amount}</td>
              <td>{l.oda_charge}</td>
              <td>{l.green_tax}</td>
              <td>{l.line_total}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {invoice.pdf_url && (
        <p style={{ marginTop: 12 }}>
          <a href={invoice.pdf_url} target="_blank" rel="noreferrer">
            Open PDF
          </a>
        </p>
      )}
    </div>
  );
}
