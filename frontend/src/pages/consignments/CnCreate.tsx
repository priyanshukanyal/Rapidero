import { useMemo, useState } from "react";
import api from "../../lib/api";

type Invoice = {
  id: number;
  invoiceNumber: string;
  amount: string;
  ewaybillNumber?: string;
  hsnCode?: string;
  hsnAmount?: string;
};

type Pkg = {
  id: number;
  length: string; // dimensions in selected unit
  breadth: string;
  height: string;
  count: string;
};

export default function CnCreate() {
  const [formData, setFormData] = useState<any>({
    // ---------- PRIMARY ----------
    client: "TEST COMPANY LTD",
    billingEntity: "TEST COMPANY LTD",
    clientShipmentCode: "PEFTEST01",
    // 1574361000000 → 2019-11-21T18:30:00Z approx
    bookingDateTime: "2019-11-21T18:30",

    noOfPackages: "1",
    content: "Clothes",
    packingType: "BOX", // will map to packaging "CARTON" later in Rivigo body
    chargeBasis: "Weight",
    conversionFactor: "5000", // cm3/kg
    mode: "SURFACE",
    declaredValue: "500",
    codAmount: "",

    // ---------- PARTNER From (Consignor) ----------
    consignorAddress: "TEST WAREHOUSE, DELHI",
    consignorName: "Sender Test",
    consignorPhone: "9000000001",
    consignorEmail: "sender@test.com",
    consignorCompany: "TEST COMPANY LTD",
    consignorGSTIN: "27AACCH8930K1A1",
    consignorPAN: "ABCDE1234F",
    consignorCity: "Delhi",
    consignorPincode: "110021",
    consignorLatitude: "28.5884",
    consignorLongitude: "77.1859",
    pickupFloorNumber: "1",
    originState: "Delhi",

    // ---------- PARTNER To (Consignee) ----------
    consigneeAddress: "TEST STREET 123, HYDERABAD",
    consigneeName: "Receiver Test",
    consigneePhone: "9876543210",
    consigneeEmail: "receiver@test.com",
    consigneeCompany: "BLUE APPARELS",
    consigneeGSTIN: "27AACCH8930K1B2",
    consigneePAN: "XYZAB1234X",
    consigneeCity: "Hyderabad",
    consigneePincode: "560001",
    consigneeLatitude: "17.5186",
    consigneeLongitude: "78.3963",
    deliveryFloorNumber: "1",
    destinationState: "Telangana",

    // ---------- PACKAGE / SERVICE ----------
    unit: "IN", // match Rivigo sample
    weight: "0.5",
    deliveryType: "NORMAL",
    serviceCategory: "NORMAL",
    barcodeType: "PREPRINTED",

    // ---------- VAS / flags ----------
    valueAddedServices: {
      fragile: false,
      liquidHandling: false,
    },
    isHazardousMaterialApplicable: false,
    isDacc: false,

    // ---------- Rivigo-style extra fields ----------
    retailType: "NORMAL",
    paymentMode: "PAID",
    taxId: "ABCDE1234F",
    taxIdType: "PAN",
    toPayAmount: "0",
    appointmentId: "A001",
    appointmentTime: "2019-11-21T18:30",
    deliveryClient: "OTHERS",
    deliveryClientFcName: "Test FC",
    poExpiryTime: "2021-09-09T03:30",
    poOrderNumber: "PO123456",
    poNumberOfItems: "1",

    routeHint: "DEL-HYD",
    remarks: "Demo test booking",

    // identifiers
    cnNumber: "", // leave blank so Rivigo can generate cnote later
    clientCode: "RAPID1", // from your env
  });

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 1,
      invoiceNumber: "INV001",
      amount: "500",
      ewaybillNumber: "123123123123",
      hsnCode: "4901",
      hsnAmount: "300",
    },
  ]);

  const [packages, setPackages] = useState<Pkg[]>([
    {
      id: 1,
      length: "10",
      breadth: "5",
      height: "6",
      count: "1",
    },
  ]);

  // NEW: barcodes list (system-generated or pre-printed) – just stored in raw_request_json
  const [barcodes, setBarcodes] = useState<string[]>(["TEST000111212"]);

  const addInv = () =>
    setInvoices((v) => [
      ...v,
      {
        id: v.length + 1,
        invoiceNumber: "",
        amount: "",
        ewaybillNumber: "",
        hsnCode: "",
        hsnAmount: "",
      },
    ]);

  const rmInv = (id: number) =>
    setInvoices((v) => v.filter((x) => x.id !== id));

  const setInv = (id: number, patch: Partial<Invoice>) =>
    setInvoices((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addPkg = () =>
    setPackages((v) => [
      ...v,
      { id: v.length + 1, length: "", breadth: "", height: "", count: "1" },
    ]);

  const rmPkg = (id: number) =>
    setPackages((v) => v.filter((x) => x.id !== id));

  const setPkg = (id: number, patch: Partial<Pkg>) =>
    setPackages((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  const addBarcode = () => setBarcodes((v) => [...v, ""]);
  const rmBarcode = (idx: number) =>
    setBarcodes((v) => v.filter((_, i) => i !== idx));
  const setBarcode = (idx: number, val: string) =>
    setBarcodes((v) => v.map((b, i) => (i === idx ? val : b)));

  const num = (s: any) => (isNaN(Number(s)) ? 0 : Number(s));

  const volumetricWeight = useMemo(() => {
    const cf = Math.max(1, num(formData.conversionFactor));
    const vol = packages.reduce(
      (acc, p) =>
        acc + num(p.length) * num(p.breadth) * num(p.height) * num(p.count),
      0
    );
    return +(vol / cf).toFixed(2);
  }, [packages, formData.conversionFactor]);

  const actualWeight = useMemo(
    () => +(+num(formData.weight)).toFixed(2),
    [formData.weight]
  );

  const chargeableWeight = useMemo(
    () => Math.max(actualWeight || 0, volumetricWeight || 0),
    [actualWeight, volumetricWeight]
  );

  const totalInvoice = useMemo(
    () => invoices.reduce((t, i) => t + num(i.amount), 0),
    [invoices]
  );

  const update = (k: string, v: any) =>
    setFormData((p: any) => ({ ...p, [k]: v }));

  const bind = (k: string) => ({
    value: formData[k] ?? "",
    onChange: (e: any) =>
      update(
        k,
        e.target.type === "checkbox" ? e.target.checked : e.target.value
      ),
  });

  const totalBoxes = useMemo(
    () => packages.reduce((t, p) => t + num(p.count || 1), 0),
    [packages]
  );

  // -------------------- SUBMIT → backend /consignments/ui --------------------
  const submit = async () => {
    try {
      const required = [
        "client",
        "consignorName",
        "consignorPhone",
        "consignorAddress",
        "consigneeName",
        "consigneePhone",
        "consigneeAddress",
        "content",
        "packingType",
        "weight",
      ];
      for (const k of required) {
        if (!formData[k] || String(formData[k]).trim() === "") {
          alert(`Missing: ${k}`);
          return;
        }
      }

      if (!totalBoxes) {
        alert("Please add at least one package with count > 0");
        return;
      }

      // Attach barcodes into formData (for storing in raw_request_json)
      const payload = {
        formData: {
          ...formData,
          barcodes:
            formData.barcodeType === "PREPRINTED"
              ? barcodes.filter((b) => b && b.trim() !== "")
              : [],
          totalBoxes,
          volumetricWeight,
          chargeableWeight,
          totalInvoice,
        },
        invoices: invoices.map((inv) => ({
          invoiceNumber: inv.invoiceNumber,
          amount: inv.amount,
          ewaybillNumber: inv.ewaybillNumber,
          hsnCode: inv.hsnCode,
          hsnAmount: inv.hsnAmount,
        })),
        packages: packages.map((p) => ({
          length: p.length,
          breadth: p.breadth,
          height: p.height,
          count: p.count,
        })),
      };

      const { data } = await api.post("/consignments/ui", payload);

      alert(
        `✅ CN created successfully.\nID: ${data?.id}\nCN Number: ${data?.cn_number}`
      );
    } catch (err: any) {
      console.error(err);
      alert(
        err?.response?.data?.error ||
          "Failed to create CN. Please try again or check console."
      );
    }
  };

  // ------------------------------ JSX layout ------------------------------
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Consignment (CN)</h1>

      {/* PRIMARY */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Client *</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("client")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Client Code (Rivigo)</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("clientCode")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Billing Entity</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("billingEntity")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Client Shipment Code</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("clientShipmentCode")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Booking DateTime</label>
          <input
            type="datetime-local"
            className="w-full border rounded-md px-3 py-2"
            {...bind("bookingDateTime")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">No. of packages</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            {...bind("noOfPackages")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Content *</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("content")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Packing Type *</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            {...bind("packingType")}
          >
            <option value="BOX">BOX</option>
            <option value="BUNDLE">BUNDLE</option>
            <option value="ENVELOPE">ENVELOPE</option>
            <option value="BAG">BAG</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Mode</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            {...bind("mode")}
          >
            <option value="SURFACE">SURFACE</option>
            <option value="AIR">AIR</option>
          </select>
        </div>
      </section>

      {/* PARTNER: Consignor / Consignee */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-2 gap-6">
        <div className="grid gap-3">
          <div className="font-medium">Consignor *</div>
          <input
            placeholder="Name *"
            className="border rounded px-3 py-2"
            {...bind("consignorName")}
          />
          <input
            placeholder="Phone *"
            className="border rounded px-3 py-2"
            {...bind("consignorPhone")}
          />
          <input
            placeholder="Email"
            className="border rounded px-3 py-2"
            {...bind("consignorEmail")}
          />
          <input
            placeholder="Company"
            className="border rounded px-3 py-2"
            {...bind("consignorCompany")}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="GSTIN"
              className="border rounded px-3 py-2"
              {...bind("consignorGSTIN")}
            />
            <input
              placeholder="PAN"
              className="border rounded px-3 py-2"
              {...bind("consignorPAN")}
            />
          </div>
          <input
            placeholder="Address *"
            className="border rounded px-3 py-2"
            {...bind("consignorAddress")}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="City"
              className="border rounded px-3 py-2"
              {...bind("consignorCity")}
            />
            <input
              placeholder="Pincode"
              className="border rounded px-3 py-2"
              {...bind("consignorPincode")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Latitude"
              className="border rounded px-3 py-2"
              {...bind("consignorLatitude")}
            />
            <input
              placeholder="Longitude"
              className="border rounded px-3 py-2"
              {...bind("consignorLongitude")}
            />
          </div>
          <input
            placeholder="Pickup Floor #"
            className="border rounded px-3 py-2"
            {...bind("pickupFloorNumber")}
          />
        </div>

        <div className="grid gap-3">
          <div className="font-medium">Consignee *</div>
          <input
            placeholder="Name *"
            className="border rounded px-3 py-2"
            {...bind("consigneeName")}
          />
          <input
            placeholder="Phone *"
            className="border rounded px-3 py-2"
            {...bind("consigneePhone")}
          />
          <input
            placeholder="Email"
            className="border rounded px-3 py-2"
            {...bind("consigneeEmail")}
          />
          <input
            placeholder="Company"
            className="border rounded px-3 py-2"
            {...bind("consigneeCompany")}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="GSTIN"
              className="border rounded px-3 py-2"
              {...bind("consigneeGSTIN")}
            />
            <input
              placeholder="PAN"
              className="border rounded px-3 py-2"
              {...bind("consigneePAN")}
            />
          </div>
          <input
            placeholder="Address *"
            className="border rounded px-3 py-2"
            {...bind("consigneeAddress")}
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="City"
              className="border rounded px-3 py-2"
              {...bind("consigneeCity")}
            />
            <input
              placeholder="Pincode"
              className="border rounded px-3 py-2"
              {...bind("consigneePincode")}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Latitude"
              className="border rounded px-3 py-2"
              {...bind("consigneeLatitude")}
            />
            <input
              placeholder="Longitude"
              className="border rounded px-3 py-2"
              {...bind("consigneeLongitude")}
            />
          </div>
          <input
            placeholder="Delivery Floor #"
            className="border rounded px-3 py-2"
            {...bind("deliveryFloorNumber")}
          />
        </div>
      </section>

      {/* PACKAGE / WEIGHTS */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="grid md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm mb-1">Unit</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              {...bind("unit")}
            >
              <option value="CM">CM</option>
              <option value="IN">IN</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Actual Weight (kg) *</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              {...bind("weight")}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Volumetric Weight (kg)</label>
            <input
              className="w-full border rounded-md px-3 py-2 bg-gray-50"
              value={volumetricWeight}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Chargeable Weight (kg)</label>
            <input
              className="w-full border rounded-md px-3 py-2 bg-gray-50"
              value={chargeableWeight}
              readOnly
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Service Category</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              {...bind("serviceCategory")}
            >
              <option value="NORMAL">NORMAL</option>
              <option value="EXPRESS">EXPRESS</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Packages ({formData.unit})</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={addPkg}
            >
              + Add
            </button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {packages.map((p) => (
              <div
                key={p.id}
                className="border rounded-lg p-3 grid md:grid-cols-4 gap-2 items-center"
              >
                <input
                  placeholder="L"
                  className="border rounded px-2 py-1"
                  value={p.length}
                  onChange={(e) => setPkg(p.id, { length: e.target.value })}
                />
                <input
                  placeholder="B"
                  className="border rounded px-2 py-1"
                  value={p.breadth}
                  onChange={(e) => setPkg(p.id, { breadth: e.target.value })}
                />
                <input
                  placeholder="H"
                  className="border rounded px-2 py-1"
                  value={p.height}
                  onChange={(e) => setPkg(p.id, { height: e.target.value })}
                />
                <div className="flex gap-2">
                  <input
                    placeholder="# pkgs"
                    className="border rounded px-2 py-1 w-24"
                    value={p.count}
                    onChange={(e) => setPkg(p.id, { count: e.target.value })}
                  />
                  {packages.length > 1 && (
                    <button
                      className="text-red-600 text-sm"
                      onClick={() => rmPkg(p.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INVOICES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Invoices</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={addInv}
          >
            + Add
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {invoices.map((inv) => (
            <div key={inv.id} className="border rounded-lg p-3 grid gap-2">
              <input
                placeholder="Invoice Number"
                className="border rounded px-2 py-1"
                value={inv.invoiceNumber}
                onChange={(e) =>
                  setInv(inv.id, { invoiceNumber: e.target.value })
                }
              />
              <input
                placeholder="Amount (₹)"
                className="border rounded px-2 py-1"
                value={inv.amount}
                onChange={(e) => setInv(inv.id, { amount: e.target.value })}
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="E-Waybill"
                  className="border rounded px-2 py-1"
                  value={inv.ewaybillNumber || ""}
                  onChange={(e) =>
                    setInv(inv.id, { ewaybillNumber: e.target.value })
                  }
                />
                <input
                  placeholder="HSN Code"
                  className="border rounded px-2 py-1"
                  value={inv.hsnCode || ""}
                  onChange={(e) => setInv(inv.id, { hsnCode: e.target.value })}
                />
                <input
                  placeholder="HSN Amount"
                  className="border rounded px-2 py-1"
                  value={inv.hsnAmount || ""}
                  onChange={(e) =>
                    setInv(inv.id, { hsnAmount: e.target.value })
                  }
                />
              </div>
              {invoices.length > 1 && (
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => rmInv(inv.id)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-600 mt-2">
          Total Invoice Value: ₹ {totalInvoice}
        </div>
      </section>

      {/* BAR CODES + SERVICES */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Delivery Type</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            {...bind("deliveryType")}
          >
            <option value="NORMAL">NORMAL</option>
            <option value="EXPRESS">EXPRESS</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Barcode Type</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            {...bind("barcodeType")}
          >
            <option value="SYSTEM">SYSTEM</option>
            <option value="PREPRINTED">PREPRINTED</option>
          </select>

          {formData.barcodeType === "PREPRINTED" && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <div className="text-sm font-medium">
                  Barcodes ({barcodes.length})
                </div>
                <button
                  className="text-xs px-2 py-1 bg-gray-100 rounded"
                  onClick={addBarcode}
                >
                  + Add
                </button>
              </div>
              <div className="grid gap-2">
                {barcodes.map((b, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      className="border rounded px-2 py-1 w-full"
                      placeholder="Barcode"
                      value={b}
                      onChange={(e) => setBarcode(i, e.target.value)}
                    />
                    {barcodes.length > 1 && (
                      <button
                        className="text-red-600 text-sm"
                        onClick={() => rmBarcode(i)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <label className="block text-sm">Value Added / Flags</label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.valueAddedServices.fragile}
              onChange={(e) =>
                update("valueAddedServices", {
                  ...formData.valueAddedServices,
                  fragile: e.target.checked,
                })
              }
            />
            Fragile Material
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.valueAddedServices.liquidHandling}
              onChange={(e) =>
                update("valueAddedServices", {
                  ...formData.valueAddedServices,
                  liquidHandling: e.target.checked,
                })
              }
            />
            Liquid Handling
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isHazardousMaterialApplicable}
              onChange={(e) =>
                update("isHazardousMaterialApplicable", e.target.checked)
              }
            />
            Hazardous Material
          </label>
          <label className="text-sm flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.isDacc}
              onChange={(e) => update("isDacc", e.target.checked)}
            />
            DACC
          </label>
        </div>
      </section>

      {/* RIVIGO SPECIALS (stored but not sent to Rivigo yet) */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm mb-1">Retail Type</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("retailType")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Payment Mode</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            {...bind("paymentMode")}
          >
            <option value="PAID">PAID</option>
            <option value="TOPAY">TOPAY</option>
            <option value="COD">COD</option>
          </select>
        </div>
        {formData.paymentMode === "TOPAY" && (
          <div>
            <label className="block text-sm mb-1">To-Pay Amount</label>
            <input
              className="w-full border rounded-md px-3 py-2"
              {...bind("toPayAmount")}
            />
          </div>
        )}
        <div>
          <label className="block text-sm mb-1">Tax ID</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("taxId")}
          />
        </div>
        <div>
          <label className="block text.sm mb-1">Tax ID Type</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            {...bind("taxIdType")}
          >
            <option value="PAN">PAN</option>
            <option value="GSTIN">GSTIN</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">CN Number (optional)</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("cnNumber")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Appointment ID</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("appointmentId")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Appointment Time</label>
          <input
            type="datetime-local"
            className="w-full border rounded-md px-3 py-2"
            {...bind("appointmentTime")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Delivery Client</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("deliveryClient")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Delivery FC Name</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("deliveryClientFcName")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">PO Order #</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("poOrderNumber")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">PO Items</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("poNumberOfItems")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">PO Expiry</label>
          <input
            type="datetime-local"
            className="w-full border rounded-md px-3 py-2"
            {...bind("poExpiryTime")}
          />
        </div>
      </section>

      {/* ROUTE / REMARKS */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Route hint</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("routeHint")}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Remarks</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            {...bind("remarks")}
          />
        </div>
      </section>

      <button
        onClick={submit}
        className="px-4 py-2 rounded-md bg-brand text-white"
      >
        Create CN
      </button>
    </div>
  );
}
