// import { useMemo, useState } from "react";
// import api from "../../lib/api";

// type Invoice = {
//   id: number;
//   invoiceNumber: string;
//   amount: string;
//   ewaybillNumber?: string;
//   hsnCode?: string;
//   hsnAmount?: string;
// };
// type Pkg = {
//   id: number;
//   length: string;
//   breadth: string;
//   height: string;
//   count: string;
// };

// export default function CnCreate() {
//   const [formData, setFormData] = useState<any>({
//     client: "",
//     billingEntity: "",
//     clientShipmentCode: "",
//     bookingDateTime: new Date().toISOString().slice(0, 16),
//     noOfPackages: "1",
//     content: "",
//     packingType: "BOX",
//     chargeBasis: "Weight",
//     conversionFactor: "5000", // cm3 per kg
//     mode: "SURFACE", // SURFACE | AIR
//     declaredValue: "", // for insurance
//     codAmount: "", // COD (if any)
//     consignorAddress: "",
//     consignorName: "",
//     consignorPhone: "",
//     consignorEmail: "",
//     consignorCompany: "",
//     consignorGSTIN: "",
//     consignorPAN: "",
//     consignorCity: "",
//     consignorPincode: "",
//     consigneeAddress: "",
//     consigneeName: "",
//     consigneePhone: "",
//     consigneeEmail: "",
//     consigneeCompany: "",
//     consigneeGSTIN: "",
//     consigneePAN: "",
//     consigneeCity: "",
//     consigneePincode: "",
//     originState: "",
//     destinationState: "",
//     poNumber: "",
//     soNumber: "",
//     routeHint: "",
//     remarks: "",
//     weight: "", // actual weight (kg)
//     deliveryType: "NORMAL",
//     serviceCategory: "NORMAL",
//     barcodeType: "SYSTEM", // SYSTEM | PREPRINTED
//     pickupFloorNumber: "",
//     deliveryFloorNumber: "",
//     valueAddedServices: {
//       fragile: false,
//       liquidHandling: false,
//       pickupFloor: false,
//       deliveryFloor: false,
//     },
//   });

//   const [invoices, setInvoices] = useState<Invoice[]>([
//     {
//       id: 1,
//       invoiceNumber: "",
//       amount: "",
//       ewaybillNumber: "",
//       hsnCode: "",
//       hsnAmount: "",
//     },
//   ]);

//   const [packages, setPackages] = useState<Pkg[]>([
//     { id: 1, length: "", breadth: "", height: "", count: "1" },
//   ]);

//   const addInv = () =>
//     setInvoices((v) => [
//       ...v,
//       {
//         id: v.length + 1,
//         invoiceNumber: "",
//         amount: "",
//         ewaybillNumber: "",
//         hsnCode: "",
//         hsnAmount: "",
//       },
//     ]);
//   const rmInv = (id: number) =>
//     setInvoices((v) => v.filter((x) => x.id !== id));
//   const setInv = (id: number, patch: Partial<Invoice>) =>
//     setInvoices((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));

//   const addPkg = () =>
//     setPackages((v) => [
//       ...v,
//       { id: v.length + 1, length: "", breadth: "", height: "", count: "1" },
//     ]);
//   const rmPkg = (id: number) =>
//     setPackages((v) => v.filter((x) => x.id !== id));
//   const setPkg = (id: number, patch: Partial<Pkg>) =>
//     setPackages((v) => v.map((x) => (x.id === id ? { ...x, ...patch } : x)));

//   const num = (s: any) => (isNaN(Number(s)) ? 0 : Number(s));

//   const volumetricWeight = useMemo(() => {
//     const cf = Math.max(1, num(formData.conversionFactor));
//     const volCm3 = packages.reduce(
//       (acc, p) =>
//         acc + num(p.length) * num(p.breadth) * num(p.height) * num(p.count),
//       0
//     );
//     return +(volCm3 / cf).toFixed(2);
//   }, [packages, formData.conversionFactor]);

//   const actualWeight = useMemo(
//     () => +(+num(formData.weight)).toFixed(2),
//     [formData.weight]
//   );

//   const chargeableWeight = useMemo(
//     () => Math.max(actualWeight || 0, volumetricWeight || 0),
//     [actualWeight, volumetricWeight]
//   );

//   const totalInvoice = useMemo(
//     () => invoices.reduce((t, i) => t + num(i.amount), 0),
//     [invoices]
//   );

//   const update = (k: string, v: any) =>
//     setFormData((p: any) => ({ ...p, [k]: v }));

//   const submit = async () => {
//     // minimal front-end required fields check
//     const required = [
//       "client",
//       "consignorName",
//       "consignorPhone",
//       "consignorAddress",
//       "consigneeName",
//       "consigneePhone",
//       "consigneeAddress",
//       "content",
//       "packingType",
//       "weight",
//     ];
//     for (const k of required)
//       if (!formData[k] || String(formData[k]).trim() === "")
//         return alert(`Missing: ${k}`);

//     const payload = {
//       formData: {
//         ...formData,
//         volumetricWeight,
//         chargeableWeight,
//         totalInvoiceValue: totalInvoice,
//       },
//       invoices,
//       packages,
//     };

//     const { data } = await api.post("/consignments/ui", payload);
//     alert(`✅ CN created: ${data.cn_number || "OK"}`);
//   };

//   const bind = (k: string) => ({
//     value: formData[k] ?? "",
//     onChange: (e: any) =>
//       update(
//         k,
//         e.target.type === "checkbox" ? e.target.checked : e.target.value
//       ),
//   });

//   return (
//     <div className="space-y-6">
//       <h1 className="text-xl font-semibold">Create Consignment (CN)</h1>

//       {/* PRIMARY */}
//       <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
//         <div>
//           <label className="block text-sm mb-1">Client *</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("client")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Billing Entity</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("billingEntity")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Client Shipment Code</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("clientShipmentCode")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Booking DateTime</label>
//           <input
//             type="datetime-local"
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("bookingDateTime")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">No. of packages</label>
//           <input
//             type="number"
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("noOfPackages")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Content *</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("content")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Packing Type *</label>
//           <select
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("packingType")}
//           >
//             <option value="BOX">BOX</option>
//             <option value="BUNDLE">BUNDLE</option>
//             <option value="ENVELOPE">ENVELOPE</option>
//             <option value="BAG">BAG</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Charge Basis</label>
//           <select
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("chargeBasis")}
//           >
//             <option value="Weight">Weight</option>
//             <option value="Volume">Volume</option>
//             <option value="Fixed">Fixed</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm mb-1">
//             Conversion Factor (cm³/kg)
//           </label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("conversionFactor")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Mode</label>
//           <select
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("mode")}
//           >
//             <option value="SURFACE">SURFACE</option>
//             <option value="AIR">AIR</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Declared Value (₹)</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("declaredValue")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">COD Amount (₹)</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("codAmount")}
//           />
//         </div>
//       </section>

//       {/* PARTNERS */}
//       <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-2 gap-6">
//         <div className="grid gap-3">
//           <div className="font-medium">Consignor *</div>
//           <input
//             placeholder="Name *"
//             className="border rounded px-3 py-2"
//             {...bind("consignorName")}
//           />
//           <input
//             placeholder="Phone *"
//             className="border rounded px-3 py-2"
//             {...bind("consignorPhone")}
//           />
//           <input
//             placeholder="Email"
//             className="border rounded px-3 py-2"
//             {...bind("consignorEmail")}
//           />
//           <input
//             placeholder="Company"
//             className="border rounded px-3 py-2"
//             {...bind("consignorCompany")}
//           />
//           <input
//             placeholder="GSTIN"
//             className="border rounded px-3 py-2"
//             {...bind("consignorGSTIN")}
//           />
//           <input
//             placeholder="PAN"
//             className="border rounded px-3 py-2"
//             {...bind("consignorPAN")}
//           />
//           <input
//             placeholder="Address *"
//             className="border rounded px-3 py-2"
//             {...bind("consignorAddress")}
//           />
//           <div className="grid grid-cols-2 gap-2">
//             <input
//               placeholder="City"
//               className="border rounded px-3 py-2"
//               {...bind("consignorCity")}
//             />
//             <input
//               placeholder="Pincode"
//               className="border rounded px-3 py-2"
//               {...bind("consignorPincode")}
//             />
//           </div>
//           <input
//             placeholder="Origin State"
//             className="border rounded px-3 py-2"
//             {...bind("originState")}
//           />
//           <div className="grid grid-cols-2 gap-2">
//             <input
//               placeholder="Pickup Floor #"
//               className="border rounded px-3 py-2"
//               {...bind("pickupFloorNumber")}
//             />
//             <label className="text-sm flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 checked={formData.valueAddedServices.pickupFloor}
//                 onChange={(e) =>
//                   update("valueAddedServices", {
//                     ...formData.valueAddedServices,
//                     pickupFloor: e.target.checked,
//                   })
//                 }
//               />
//               Pickup Floor Service
//             </label>
//           </div>
//         </div>

//         <div className="grid gap-3">
//           <div className="font-medium">Consignee *</div>
//           <input
//             placeholder="Name *"
//             className="border rounded px-3 py-2"
//             {...bind("consigneeName")}
//           />
//           <input
//             placeholder="Phone *"
//             className="border rounded px-3 py-2"
//             {...bind("consigneePhone")}
//           />
//           <input
//             placeholder="Email"
//             className="border rounded px-3 py-2"
//             {...bind("consigneeEmail")}
//           />
//           <input
//             placeholder="Company"
//             className="border rounded px-3 py-2"
//             {...bind("consigneeCompany")}
//           />
//           <input
//             placeholder="GSTIN"
//             className="border rounded px-3 py-2"
//             {...bind("consigneeGSTIN")}
//           />
//           <input
//             placeholder="PAN"
//             className="border rounded px-3 py-2"
//             {...bind("consigneePAN")}
//           />
//           <input
//             placeholder="Address *"
//             className="border rounded px-3 py-2"
//             {...bind("consigneeAddress")}
//           />
//           <div className="grid grid-cols-2 gap-2">
//             <input
//               placeholder="City"
//               className="border rounded px-3 py-2"
//               {...bind("consigneeCity")}
//             />
//             <input
//               placeholder="Pincode"
//               className="border rounded px-3 py-2"
//               {...bind("consigneePincode")}
//             />
//           </div>
//           <input
//             placeholder="Destination State"
//             className="border rounded px-3 py-2"
//             {...bind("destinationState")}
//           />
//           <div className="grid grid-cols-2 gap-2">
//             <input
//               placeholder="Delivery Floor #"
//               className="border rounded px-3 py-2"
//               {...bind("deliveryFloorNumber")}
//             />
//             <label className="text-sm flex items-center gap-2">
//               <input
//                 type="checkbox"
//                 checked={formData.valueAddedServices.deliveryFloor}
//                 onChange={(e) =>
//                   update("valueAddedServices", {
//                     ...formData.valueAddedServices,
//                     deliveryFloor: e.target.checked,
//                   })
//                 }
//               />
//               Delivery Floor Service
//             </label>
//           </div>
//         </div>
//       </section>

//       {/* PACKAGE / WEIGHTS */}
//       <section className="bg-white p-6 rounded-xl shadow">
//         <div className="grid md:grid-cols-4 gap-4">
//           <div>
//             <label className="block text-sm mb-1">Actual Weight (kg) *</label>
//             <input
//               type="number"
//               className="w-full border rounded-md px-3 py-2"
//               {...bind("weight")}
//             />
//           </div>
//           <div>
//             <label className="block text-sm mb-1">Volumetric Weight (kg)</label>
//             <input
//               className="w-full border rounded-md px-3 py-2 bg-gray-50"
//               value={volumetricWeight}
//               readOnly
//             />
//           </div>
//           <div>
//             <label className="block text-sm mb-1">Chargeable Weight (kg)</label>
//             <input
//               className="w-full border rounded-md px-3 py-2 bg-gray-50"
//               value={chargeableWeight}
//               readOnly
//             />
//           </div>
//           <div>
//             <label className="block text-sm mb-1">Service Category</label>
//             <select
//               className="w-full border rounded-md px-3 py-2"
//               {...bind("serviceCategory")}
//             >
//               <option value="NORMAL">NORMAL</option>
//               <option value="EXPRESS">EXPRESS</option>
//             </select>
//           </div>
//         </div>

//         <div className="mt-4">
//           <div className="flex items-center justify-between mb-2">
//             <div className="font-medium">Packages (cm)</div>
//             <button
//               className="text-sm px-2 py-1 rounded bg-gray-100"
//               onClick={addPkg}
//             >
//               + Add
//             </button>
//           </div>
//           <div className="grid md:grid-cols-2 gap-3">
//             {packages.map((p) => (
//               <div
//                 key={p.id}
//                 className="border rounded-lg p-3 grid md:grid-cols-4 gap-2 items-center"
//               >
//                 <input
//                   placeholder="L"
//                   className="border rounded px-2 py-1"
//                   value={p.length}
//                   onChange={(e) => setPkg(p.id, { length: e.target.value })}
//                 />
//                 <input
//                   placeholder="B"
//                   className="border rounded px-2 py-1"
//                   value={p.breadth}
//                   onChange={(e) => setPkg(p.id, { breadth: e.target.value })}
//                 />
//                 <input
//                   placeholder="H"
//                   className="border rounded px-2 py-1"
//                   value={p.height}
//                   onChange={(e) => setPkg(p.id, { height: e.target.value })}
//                 />
//                 <div className="flex gap-2">
//                   <input
//                     placeholder="#"
//                     className="border rounded px-2 py-1 w-20"
//                     value={p.count}
//                     onChange={(e) => setPkg(p.id, { count: e.target.value })}
//                   />
//                   {packages.length > 1 && (
//                     <button
//                       className="text-red-600 text-sm"
//                       onClick={() => rmPkg(p.id)}
//                     >
//                       ×
//                     </button>
//                   )}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       {/* INVOICES */}
//       <section className="bg-white p-6 rounded-xl shadow">
//         <div className="flex items-center justify-between mb-2">
//           <div className="font-medium">Invoices</div>
//           <button
//             className="text-sm px-2 py-1 rounded bg-gray-100"
//             onClick={addInv}
//           >
//             + Add
//           </button>
//         </div>
//         <div className="grid md:grid-cols-2 gap-3">
//           {invoices.map((inv) => (
//             <div key={inv.id} className="border rounded-lg p-3 grid gap-2">
//               <input
//                 placeholder="Invoice Number"
//                 className="border rounded px-2 py-1"
//                 value={inv.invoiceNumber}
//                 onChange={(e) =>
//                   setInv(inv.id, { invoiceNumber: e.target.value })
//                 }
//               />
//               <input
//                 placeholder="Amount (₹)"
//                 className="border rounded px-2 py-1"
//                 value={inv.amount}
//                 onChange={(e) => setInv(inv.id, { amount: e.target.value })}
//               />
//               <div className="grid grid-cols-3 gap-2">
//                 <input
//                   placeholder="E-Waybill"
//                   className="border rounded px-2 py-1"
//                   value={inv.ewaybillNumber || ""}
//                   onChange={(e) =>
//                     setInv(inv.id, { ewaybillNumber: e.target.value })
//                   }
//                 />
//                 <input
//                   placeholder="HSN Code"
//                   className="border rounded px-2 py-1"
//                   value={inv.hsnCode || ""}
//                   onChange={(e) => setInv(inv.id, { hsnCode: e.target.value })}
//                 />
//                 <input
//                   placeholder="HSN Amount"
//                   className="border rounded px-2 py-1"
//                   value={inv.hsnAmount || ""}
//                   onChange={(e) =>
//                     setInv(inv.id, { hsnAmount: e.target.value })
//                   }
//                 />
//               </div>
//               {invoices.length > 1 && (
//                 <button
//                   className="text-red-600 text-sm text-left"
//                   onClick={() => rmInv(inv.id)}
//                 >
//                   Remove
//                 </button>
//               )}
//             </div>
//           ))}
//         </div>
//         <div className="text-sm text-gray-600 mt-2">
//           Total Invoice Value: ₹ {totalInvoice}
//         </div>
//       </section>

//       {/* SERVICES / FLAGS */}
//       <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
//         <div>
//           <label className="block text-sm mb-1">Delivery Type</label>
//           <select
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("deliveryType")}
//           >
//             <option value="NORMAL">NORMAL</option>
//             <option value="EXPRESS">EXPRESS</option>
//           </select>
//         </div>
//         <div>
//           <label className="block text-sm mb-1">Barcode Type</label>
//           <select
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("barcodeType")}
//           >
//             <option value="SYSTEM">SYSTEM</option>
//             <option value="PREPRINTED">PREPRINTED</option>
//           </select>
//         </div>
//         <div className="grid gap-2">
//           <label className="block text-sm">Value Added Services</label>
//           <label className="text-sm flex items-center gap-2">
//             <input
//               type="checkbox"
//               checked={formData.valueAddedServices.fragile}
//               onChange={(e) =>
//                 update("valueAddedServices", {
//                   ...formData.valueAddedServices,
//                   fragile: e.target.checked,
//                 })
//               }
//             />{" "}
//             Fragile
//           </label>
//           <label className="text-sm flex items-center gap-2">
//             <input
//               type="checkbox"
//               checked={formData.valueAddedServices.liquidHandling}
//               onChange={(e) =>
//                 update("valueAddedServices", {
//                   ...formData.valueAddedServices,
//                   liquidHandling: e.target.checked,
//                 })
//               }
//             />{" "}
//             Liquid Handling
//           </label>
//         </div>
//       </section>

//       {/* ROUTE / REFS / REMARKS */}
//       <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
//         <div>
//           <label className="block text-sm mb-1">Route hint</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("routeHint")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">PO Number</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("poNumber")}
//           />
//         </div>
//         <div>
//           <label className="block text-sm mb-1">SO Number</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("soNumber")}
//           />
//         </div>
//         <div className="md:col-span-3">
//           <label className="block text-sm mb-1">Remarks</label>
//           <input
//             className="w-full border rounded-md px-3 py-2"
//             {...bind("remarks")}
//           />
//         </div>
//       </section>

//       <button
//         onClick={submit}
//         className="px-4 py-2 rounded-md bg-brand text-white"
//       >
//         Create CN
//       </button>
//     </div>
//   );
// }
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
    // PRIMARY
    client: "",
    billingEntity: "",
    clientShipmentCode: "",
    bookingDateTime: new Date().toISOString().slice(0, 16),

    noOfPackages: "1",
    content: "",
    packingType: "BOX",
    chargeBasis: "Weight",
    conversionFactor: "5000", // cm3/kg
    mode: "SURFACE",
    declaredValue: "",
    codAmount: "",

    // PARTNER From (Consignor)
    consignorAddress: "",
    consignorName: "",
    consignorPhone: "",
    consignorEmail: "",
    consignorCompany: "",
    consignorGSTIN: "",
    consignorPAN: "",
    consignorCity: "",
    consignorPincode: "",
    consignorLatitude: "",
    consignorLongitude: "",
    pickupFloorNumber: "",
    originState: "",

    // PARTNER To (Consignee)
    consigneeAddress: "",
    consigneeName: "",
    consigneePhone: "",
    consigneeEmail: "",
    consigneeCompany: "",
    consigneeGSTIN: "",
    consigneePAN: "",
    consigneeCity: "",
    consigneePincode: "",
    consigneeLatitude: "",
    consigneeLongitude: "",
    deliveryFloorNumber: "",
    destinationState: "",

    // PACKAGE / SERVICE
    unit: "CM", // CM | IN (Rivigo example used IN)
    weight: "",
    deliveryType: "NORMAL",
    serviceCategory: "NORMAL",
    barcodeType: "SYSTEM",

    // VAS / flags
    valueAddedServices: {
      fragile: false,
      liquidHandling: false,
    },
    isHazardousMaterialApplicable: false,
    isDacc: false,

    // Rivigo extra fields
    retailType: "NORMAL", // NORMAL / B2C etc.
    paymentMode: "PAID", // PAID / TOPAY / COD
    taxId: "", // e.g., PAN/GST of shipper or as required
    taxIdType: "PAN", // PAN | GSTIN
    toPayAmount: "", // for TOPAY
    appointmentId: "",
    appointmentTime: new Date().toISOString().slice(0, 16),
    deliveryClient: "", // e.g., AMAZON
    deliveryClientFcName: "",
    poExpiryTime: new Date().toISOString().slice(0, 16),
    poOrderNumber: "",
    poNumberOfItems: "1",

    routeHint: "",
    remarks: "",

    // identifiers
    cnNumber: "", // your internal CN if you want to pass as cnote
    clientCode: "", // e.g., "Mahaveer" from sample
  });

  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 1,
      invoiceNumber: "",
      amount: "",
      ewaybillNumber: "",
      hsnCode: "",
      hsnAmount: "",
    },
  ]);

  const [packages, setPackages] = useState<Pkg[]>([
    { id: 1, length: "", breadth: "", height: "", count: "1" },
  ]);

  // NEW: barcodes list (system-generated or pre-printed)
  const [barcodes, setBarcodes] = useState<string[]>([""]);

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
    const volUnit = formData.unit === "IN" ? 1 : 1; // if you want to keep cm³ as base, keep cf aligned
    const vol = packages.reduce(
      (acc, p) =>
        acc +
        num(p.length) * num(p.breadth) * num(p.height) * num(p.count) * volUnit,
      0
    );
    return +(vol / cf).toFixed(2);
  }, [packages, formData.conversionFactor, formData.unit]);

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

  // ---- Helpers to build Rivigo payload ----
  const toEpoch = (localDateTimeStr: string) => {
    // local naive -> epoch ms
    const d = new Date(localDateTimeStr);
    return d.getTime();
  };

  const buildAddress = (side: "consignor" | "consignee") => {
    const prefix = side === "consignor" ? "consignor" : "consignee";
    return {
      addressDetails: {
        detailedAddress: formData[`${prefix}Address`],
        city: formData[`${prefix}City`],
        pincode: num(formData[`${prefix}Pincode`]),
        latitude: num(formData[`${prefix}Latitude`]) || undefined,
        longitude: num(formData[`${prefix}Longitude`]) || undefined,
        floorNumber:
          num(
            side === "consignor"
              ? formData.pickupFloorNumber
              : formData.deliveryFloorNumber
          ) || undefined,
        addressCode: undefined, // if you have a master address code, set it here
      },
      callDetails: {
        name: formData[`${prefix}Name`],
        phone: num(formData[`${prefix}Phone`]),
        email: formData[`${prefix}Email`] || undefined,
      },
      companyDetails: {
        companyName: formData[`${prefix}Company`] || undefined,
        GSTIN: formData[`${prefix}GSTIN`] || undefined,
        PAN: formData[`${prefix}PAN`] || undefined,
      },
    };
  };

  const buildInvoicesList = () =>
    invoices
      .filter((i) => (i.invoiceNumber || "").trim() !== "")
      .map((i) => ({
        invoiceNo: i.invoiceNumber,
        invoiceValue: num(i.amount),
        ewaybillNumber: i.ewaybillNumber ? num(i.ewaybillNumber) : undefined,
        hsnCodesList:
          i.hsnCode && i.hsnAmount
            ? [{ hsnCode: num(i.hsnCode), amount: num(i.hsnAmount) }]
            : undefined,
      }));

  const buildBoxTypesList = () =>
    packages.map((p) => ({
      length: num(p.length),
      breadth: num(p.breadth),
      height: num(p.height),
      boxTypeCount: num(p.count || 1),
    }));

  const totalBoxes = useMemo(
    () => packages.reduce((t, p) => t + num(p.count || 1), 0),
    [packages]
  );

  const submit = async () => {
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
      "clientCode",
    ];
    for (const k of required) {
      if (!formData[k] || String(formData[k]).trim() === "") {
        alert(`Missing: ${k}`);
        return;
      }
    }

    // Rivigo payload shape
    const payload = {
      scheduledBookingDateTime: toEpoch(formData.bookingDateTime),
      fromAddress: buildAddress("consignor"),
      individualBookingList: [
        {
          cnote: formData.cnNumber ? num(formData.cnNumber) : undefined,
          toAddressList: [buildAddress("consignee")],
          loadDetails: {
            totalBoxes,
            weight: num(formData.weight),
            volume: packages.reduce(
              (acc, p) =>
                acc +
                num(p.length) *
                  num(p.breadth) *
                  num(p.height) *
                  num(p.count || 1),
              0
            ),
            unit: formData.unit, // "IN" or "CM"
            boxTypesList: buildBoxTypesList(),
            invoicesList: buildInvoicesList(),
            barcodesList:
              formData.barcodeType === "PREPRINTED"
                ? barcodes.filter((b) => b && b.trim() !== "")
                : undefined, // if SYSTEM, Rivigo may generate
            retailType: formData.retailType,
            paymentMode: formData.paymentMode, // PAID / TOPAY / COD
            taxId: formData.taxId || undefined,
            taxIdType: formData.taxIdType || undefined,
            packaging: formData.packingType,
            contents: formData.content,
            isFragile: !!formData.valueAddedServices.fragile,
            vasDetails: undefined, // add cheque/DD mapping here if you need COD-CODD
            isLiquidHandlingApplicable:
              !!formData.valueAddedServices.liquidHandling,
            isHazardousMaterialApplicable:
              !!formData.isHazardousMaterialApplicable,
            isDacc: !!formData.isDacc,
            deliveryType: formData.deliveryType,
            appointmentId: formData.appointmentId || undefined,
            appointmentTime: formData.appointmentTime
              ? toEpoch(formData.appointmentTime)
              : undefined,
            deliveryClient: formData.deliveryClient || undefined,
            deliveryClientDetails:
              formData.deliveryClient || formData.poOrderNumber
                ? {
                    fcName: formData.deliveryClientFcName || undefined,
                    purchaseOrders: formData.poOrderNumber
                      ? [
                          {
                            expiryTime: toEpoch(formData.poExpiryTime),
                            numberOfItems: num(formData.poNumberOfItems || 1),
                            orderNumber: formData.poOrderNumber,
                          },
                        ]
                      : undefined,
                  }
                : undefined,
            toPayAmount:
              formData.paymentMode === "TOPAY"
                ? num(formData.toPayAmount || 0)
                : undefined,
            isLogiFreightAirCn: formData.mode === "AIR",
          },
          clientReferenceNumbers: formData.clientShipmentCode
            ? [formData.clientShipmentCode]
            : undefined,
        },
      ],
      clientCode: formData.clientCode, // REQUIRED by sample ("Mahaveer")
    };

    // optional sanity checks
    if (payload.individualBookingList[0].loadDetails.barcodesList?.length) {
      const bCount =
        payload.individualBookingList[0].loadDetails.barcodesList.length;
      if (bCount !== totalBoxes) {
        const ok = confirm(
          `Barcodes (${bCount}) do not match total boxes (${totalBoxes}). Continue?`
        );
        if (!ok) return;
      }
    }

    // POST to your backend that proxies Rivigo’s API
    const { data } = await api.post("/rivigo/bookings", payload); // update route if different
    alert(`✅ Rivigo booking pushed. Ref: ${data?.reference || "OK"}`);
  };

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
          <label className="block text-sm mb-1">Client Code (Rivigo) *</label>
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

      {/* RIVIGO SPECIALS */}
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
          <label className="block text-sm mb-1">Tax ID Type</label>
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
        Create & Push to Rivigo
      </button>
    </div>
  );
}
