import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";

type CN = {
  id?: string;
  cn_number: string;

  // DB se aa raha hai:
  client_name_snapshot?: string;
  booking_datetime?: string;
  content?: string;
  packing_type_code?: string;
  actual_weight_kg?: number;

  shipper_name?: string;
  shipper_phone?: string;
  shipper_address?: string;
  shipper_city?: string;
  shipper_postcode?: string;

  consignee_name?: string;
  consignee_phone?: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_postcode?: string;

  rivigo_cnote?: string | null;
  rivigo_booking_id?: number | null;
  rivigo_pdf_url?: string | null;
  rivigo_client_address_id?: number | null;
  rivigo_service_category?: string | null;

  raw_request_json?: {
    formData?: any;
    invoices?: any[];
    packages?: any[];
  };

  invoices?: any[];
  packages?: any[];
  history?: any[];
};

export default function CnDetail() {
  const { cnNumber } = useParams();
  const [data, setData] = useState<CN | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!cnNumber) return;
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get(
          `/consignments/ui/${encodeURIComponent(cnNumber)}`
        );
        setData(res.data);
      } catch (e: any) {
        setErr(e?.response?.data?.error || "Unable to fetch CN");
      } finally {
        setLoading(false);
      }
    })();
  }, [cnNumber]);

  if (loading) return <div>Loading...</div>;
  if (err) return <div className="text-red-600">{err}</div>;
  if (!data) return null;

  // 🔹 Original UI form data (jo tune POST kiya tha)
  const raw = (data as any).raw_request_json || {};
  const f = raw.formData || {};

  // 🔹 Invoices & packages – pehle raw se, warna DB se
  const invoices =
    (raw.invoices && raw.invoices.length ? raw.invoices : data.invoices) || [];
  const packages =
    (raw.packages && raw.packages.length ? raw.packages : data.packages) || [];

  const prettyBooked = f.bookingDateTime
    ? new Date(f.bookingDateTime).toLocaleString()
    : data.booking_datetime
    ? new Date(data.booking_datetime).toLocaleString()
    : "-";

  const weight =
    f.weight != null && f.weight !== ""
      ? f.weight
      : data.actual_weight_kg != null
      ? data.actual_weight_kg
      : "-";

  const consignorName = f.consignorName || data.shipper_name || "-";
  const consignorPhone = f.consignorPhone || data.shipper_phone || "-";
  const consignorAddress = f.consignorAddress || data.shipper_address || "-";
  const consignorCity = f.consignorCity || data.shipper_city || "-";
  const consignorPincode = f.consignorPincode || data.shipper_postcode || "-";

  const consigneeName = f.consigneeName || data.consignee_name || "-";
  const consigneePhone = f.consigneePhone || data.consignee_phone || "-";
  const consigneeAddress = f.consigneeAddress || data.consignee_address || "-";
  const consigneeCity = f.consigneeCity || data.consignee_city || "-";
  const consigneePincode = f.consigneePincode || data.consignee_postcode || "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CN #{data.cn_number}</h1>
      </div>

      {/* TOP CARDS */}
      <div className="grid md:grid-cols-4 gap-4">
        {/* Primary */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Primary</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Client:</b> {f.client || data.client_name_snapshot || "-"}
            </div>
            <div>
              <b>Booked:</b> {prettyBooked}
            </div>
            <div>
              <b>Content:</b> {f.content || data.content || "-"}
            </div>
            <div>
              <b>Packing:</b> {f.packingType || data.packing_type_code || "-"}
            </div>
            <div>
              <b>Weight:</b> {weight} kg
            </div>
          </div>
        </div>

        {/* Consignor */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Consignor</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Name:</b> {consignorName}
            </div>
            <div>
              <b>Phone:</b> {consignorPhone}
            </div>
            <div>
              <b>Address:</b> {consignorAddress}
            </div>
            <div>
              <b>City/Pincode:</b> {consignorCity + " / " + consignorPincode}
            </div>
          </div>
        </div>

        {/* Consignee */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Consignee</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Name:</b> {consigneeName}
            </div>
            <div>
              <b>Phone:</b> {consigneePhone}
            </div>
            <div>
              <b>Address:</b> {consigneeAddress}
            </div>
            <div>
              <b>City/Pincode:</b> {consigneeCity + " / " + consigneePincode}
            </div>
          </div>
        </div>

        {/* Rivigo info */}
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Rivigo</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Rivigo CN:</b> {(data as any).rivigo_cnote || "-"}
            </div>
            <div>
              <b>Booking ID:</b> {(data as any).rivigo_booking_id || "-"}
            </div>
            <div>
              <b>Service Category:</b>{" "}
              {(data as any).rivigo_service_category || "-"}
            </div>
            {(data as any).rivigo_pdf_url && (
              <div>
                <a
                  href={(data as any).rivigo_pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand underline"
                >
                  Download CN PDF
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="font-medium mb-2">Invoices</div>
        {invoices.length === 0 ? (
          <div className="text-sm text-gray-500">No invoices</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Invoice #</th>
                  <th className="px-3 py-2 text-left">Amount</th>
                  <th className="px-3 py-2 text-left">E-Waybill</th>
                  <th className="px-3 py-2 text-left">HSN Code</th>
                  <th className="px-3 py-2 text-left">HSN Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv: any, i: number) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-2">
                      {/* raw_request_json vs DB column handle */}
                      {inv.invoiceNumber || inv.invoice_number || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {inv.amount ?? inv.amount_rs ?? "-"}
                    </td>
                    <td className="px-3 py-2">
                      {inv.ewaybillNumber || inv.ewaybill_number || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {inv.hsnCode || inv.hsn_code || "-"}
                    </td>
                    <td className="px-3 py-2">
                      {inv.hsnAmount ?? inv.hsn_amount_rs ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Packages */}
      <div className="bg-white p-4 rounded-xl shadow">
        <div className="font-medium mb-2">Packages</div>
        {packages.length === 0 ? (
          <div className="text-sm text-gray-500">No packages</div>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Length</th>
                  <th className="px-3 py-2 text-left">Breadth</th>
                  <th className="px-3 py-2 text-left">Height</th>
                  <th className="px-3 py-2 text-left">Count</th>
                  <th className="px-3 py-2 text-left">Volume (cm³)</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((p: any, i: number) => {
                  const length = p.length ?? p.length_cm ?? 0;
                  const breadth = p.breadth ?? p.breadth_cm ?? 0;
                  const height = p.height ?? p.height_cm ?? 0;
                  const count = p.count ?? p.pkg_count ?? 1;
                  const vol =
                    Number(length || 0) *
                    Number(breadth || 0) *
                    Number(height || 0) *
                    Number(count || 1);

                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{length}</td>
                      <td className="px-3 py-2">{breadth}</td>
                      <td className="px-3 py-2">{height}</td>
                      <td className="px-3 py-2">{count}</td>
                      <td className="px-3 py-2">{vol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* OPTIONAL: raw debug */}
      {/* <div className="bg-white p-4 rounded-xl shadow">
        <div className="font-medium mb-2">Raw payload (debug)</div>
        <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto">
          {JSON.stringify(raw, null, 2)}
        </pre>
      </div> */}
    </div>
  );
}
