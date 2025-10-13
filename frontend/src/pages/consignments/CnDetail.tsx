import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../lib/api";

type CN = {
  id?: string;
  cn_number: string;
  formData?: any;
  invoices?: Array<any>;
  packages?: Array<any>;
  client?: string;
  bookingDateTime?: string;
};

export default function CnDetail() {
  const { cnNumber } = useParams();
  const [data, setData] = useState<CN | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await api.get(
          `/consignments/ui/${encodeURIComponent(cnNumber || "")}`
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

  const f = data.formData || {};
  const invoices = data.invoices || [];
  const packages = data.packages || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">CN #{data.cn_number}</h1>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Primary</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Client:</b> {f.client || "-"}
            </div>
            <div>
              <b>Booked:</b>{" "}
              {f.bookingDateTime
                ? new Date(f.bookingDateTime).toLocaleString()
                : "-"}
            </div>
            <div>
              <b>Content:</b> {f.content || "-"}
            </div>
            <div>
              <b>Packing:</b> {f.packingType || "-"}
            </div>
            <div>
              <b>Weight:</b> {f.weight || "-"} kg
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Consignor</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Name:</b> {f.consignorName || "-"}
            </div>
            <div>
              <b>Phone:</b> {f.consignorPhone || "-"}
            </div>
            <div>
              <b>Address:</b> {f.consignorAddress || "-"}
            </div>
            <div>
              <b>City/Pincode:</b>{" "}
              {(f.consignorCity || "-") + " / " + (f.consignorPincode || "-")}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow">
          <div className="font-medium mb-2">Consignee</div>
          <div className="text-sm text-gray-600 space-y-1">
            <div>
              <b>Name:</b> {f.consigneeName || "-"}
            </div>
            <div>
              <b>Phone:</b> {f.consigneePhone || "-"}
            </div>
            <div>
              <b>Address:</b> {f.consigneeAddress || "-"}
            </div>
            <div>
              <b>City/Pincode:</b>{" "}
              {(f.consigneeCity || "-") + " / " + (f.consigneePincode || "-")}
            </div>
          </div>
        </div>
      </div>

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
                    <td className="px-3 py-2">{inv.invoiceNumber}</td>
                    <td className="px-3 py-2">{inv.amount}</td>
                    <td className="px-3 py-2">{inv.ewaybillNumber || "-"}</td>
                    <td className="px-3 py-2">{inv.hsnCode || "-"}</td>
                    <td className="px-3 py-2">{inv.hsnAmount || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
                  const vol =
                    Number(p.length || 0) *
                    Number(p.breadth || 0) *
                    Number(p.height || 0) *
                    Number(p.count || 1);
                  return (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{p.length}</td>
                      <td className="px-3 py-2">{p.breadth}</td>
                      <td className="px-3 py-2">{p.height}</td>
                      <td className="px-3 py-2">{p.count}</td>
                      <td className="px-3 py-2">{vol}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
