import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import type {
  Client,
  ContractPayload,
  OdaRule,
  NonMetroRule,
  RegionSurcharge,
  VasCharge,
  InsuranceRule,
  IncentiveSlab,
  ContractAnnexure,
  ContractParty,
} from "../../types";

/* ------------------------------- Factories -------------------------------- */
const emptyParty = (): ContractParty => ({
  party_role: "CLIENT",
  legal_name: "",
});
const emptyOda = (): OdaRule => ({
  pincode_prefix: "",
  surcharge_flat: 0,
  surcharge_pct: 0,
});
const emptyNonMetro = (): NonMetroRule => ({
  city: "",
  tier: "TIER2",
  surcharge_flat: 0,
  surcharge_pct: 0,
});
const emptyRegion = (): RegionSurcharge => ({
  region_code: "",
  description: "",
  surcharge_flat: 0,
  surcharge_pct: 0,
});
const emptyVas = (): VasCharge => ({ code: "FRAGILE", flat: 0, pct: 0 });
const emptyIns = (): InsuranceRule => ({
  min_declared_value: 0,
  rate_pct: 0,
  provider: "STANDARD", // was "Default"
  notes: "",
});

const emptySlab = (): IncentiveSlab => ({
  threshold_shipments: 0,
  threshold_revenue: 0,
  incentive_pct: 0,
});
const emptyAnn = (): ContractAnnexure => ({
  annexure_code: "A",
  title: "",
  raw_text: "",
});

/* ------------------------------- Utilities -------------------------------- */
const ALLOWED_PARTY_ROLES = new Set(["COMPANY", "CLIENT", "OTHER"]);
const normalizePartyRole = (x: any) => {
  const v = String(x || "")
    .toUpperCase()
    .trim();
  return ALLOWED_PARTY_ROLES.has(v)
    ? (v as "COMPANY" | "CLIENT" | "OTHER")
    : "OTHER";
};

const toNumberOr = (v: any, d: number) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export default function ContractCreate() {
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);
  const [body, setBody] = useState<ContractPayload>({
    client_id: "",
    contract_code: "",
    title: "",
    purpose: "",
    start_date: "",
    end_date: "",
    settlement_frequency: "MONTHLY",
    credit_days: 30,
    taxes_gst_pct: 18,
    fuel_surcharge_pct: 0,
    price_floor_enabled: true,
    price_ceiling_enabled: false,
    min_charge: 0,
    volumetric_bases: [6000],
    parties: [
      { party_role: "COMPANY", legal_name: "Rapidero Logistics Pvt Ltd" },
    ],
    oda_rules: [],
    non_metro_rules: [],
    region_surcharges: [],
    vas_charges: [{ code: "FRAGILE", flat: 0, pct: 0 }],
    insurance_rules: [{ rate_pct: 0.25, provider: "Default" }],
    incentive_slabs: [],
    annexures: [{ annexure_code: "A", title: "Scope", raw_text: "" }],
    notes: "",
  });

  useEffect(() => {
    api.get<Client[]>("/clients").then((r) => setClients(r.data));
  }, []);

  const set = (k: keyof ContractPayload, v: any) =>
    setBody((b) => ({ ...b, [k]: v }));

  const canSave = useMemo(
    () => Boolean(body.client_id && body.contract_code),
    [body.client_id, body.contract_code]
  );

  const add = <T,>(k: keyof ContractPayload, factory: () => T) =>
    set(k, [...(body[k] as T[]), factory()]);
  const remove = <T,>(k: keyof ContractPayload, idx: number) => {
    const arr = [...(body[k] as T[])];
    arr.splice(idx, 1);
    set(k, arr);
  };
  const up = <T,>(k: keyof ContractPayload, idx: number, patch: Partial<T>) => {
    const arr = [...(body[k] as T[])];
    arr[idx] = { ...(arr[idx] as any), ...patch };
    set(k, arr);
  };

  const parseNums = (s: string) =>
    s === "" || isNaN(+s) ? undefined : Number(s);

  const save = async () => {
    if (!canSave) return alert("Client & Contract code are required");
    setSaving(true);
    try {
      // --------- Transform UI model → server model expected by backend ---------
      // Defensive transforms to avoid NULL/constraint issues
      const volumetricBases = (body.volumetric_bases || [])
        .map((v) => toNumberOr(v, 0))
        .filter((v) => Number.isFinite(v) && v >= 0);

      const parties = (body.parties || [])
        .map((p) => ({
          party_role: normalizePartyRole(p.party_role),
          legal_name: p.legal_name?.trim() || "",
          contact_person: p.contact_name || null,
          phone: p.phone || null,
          email: p.email || null, // <-- backend expects this column now
          brand_name: null,
          cin: null,
          pan: null,
          address_line1: p.address || null,
          address_line2: null,
          city: null,
          district: null,
          state: null,
          postcode: null,
        }))
        .filter((p) => p.legal_name.length > 0);

      const oda_rules = (body.oda_rules || [])
        .map((o) => ({
          oda_code: (o.pincode_prefix || "").trim(),
          rate_per_kg: toNumberOr(o.surcharge_pct, 0),
          min_per_cn: toNumberOr(o.surcharge_flat, 0),
          notes: null as string | null,
        }))
        .filter((r) => r.oda_code.length > 0); // skip blank codes

      // backend requires distance_km_max NOT NULL → send 0 when absent
      const non_metro_rules = (body.non_metro_rules || []).map((n) => ({
        distance_km_max: 0, // UI doesn't collect distance—use safe default
        rate_per_kg: toNumberOr(n.surcharge_flat, 0),
      }));

      const region_surcharges = (body.region_surcharges || [])
        .map((r) => ({
          region_name: (r.region_code || r.description || "").trim(),
          base_relative_to: null as string | null,
          addl_rate_per_kg: toNumberOr(r.surcharge_flat, 0),
          notes: r.description || null,
        }))
        .filter((r) => r.region_name.length > 0);

      const vas_charges = (body.vas_charges || []).map((v) => {
        const isPct = Number(v.pct) > 0;
        return {
          vas_code: v.code,
          calc_method: isPct ? "PCT" : "FLAT",
          rate_per_kg: isPct ? toNumberOr(v.pct, 0) : null,
          rate_per_cn: !isPct ? toNumberOr(v.flat, 0) : null,
          min_per_cn: null,
          max_per_cn: null,
          multiplier: null,
          extra_per_cn: null,
          free_hours: null,
          floor_start: null,
          city_scope: null,
          notes: null,
        };
      });

      const insurance_rules = (body.insurance_rules || []).map((i) => ({
        insurance_type: (i.provider || "STANDARD").toUpperCase(), // send uppercase
        pct_of_invoice: toNumberOr(i.rate_pct, 0),
        min_per_cn: toNumberOr(i.min_declared_value, 0),
        liability_desc: i.notes || null,
      }));

      const incentive_slabs = (body.incentive_slabs || []).map((s) => ({
        tonnage_min: toNumberOr(s.threshold_shipments, 0),
        tonnage_max:
          s.threshold_revenue !== undefined && s.threshold_revenue !== null
            ? toNumberOr(s.threshold_revenue, 0)
            : null,
        discount_pct: toNumberOr(s.incentive_pct, 0),
        from_date: (s as any).from_date || null,
        to_date: (s as any).to_date || null,
      }));

      const annexures = (body.annexures || []).map((a) => ({
        annexure_code: a.annexure_code,
        title: a.title,
        raw_text: a.raw_text,
      }));

      const serverPayload: any = {
        client_id: body.client_id,
        contract_code: body.contract_code,
        // Parent columns
        purpose: body.purpose || null,
        agreement_date: body.start_date || null,
        term_start: body.start_date || null,
        term_end: body.end_date || null,
        settlement_frequency: body.settlement_frequency || "DAILY",
        price_floor_enabled: !!body.price_floor_enabled,
        price_ceiling_enabled: !!body.price_ceiling_enabled,
        taxes_gst_pct: toNumberOr(body.taxes_gst_pct, 18),
        min_chargeable_freight_rs: toNumberOr(body.min_charge, 0),

        volumetric_bases: volumetricBases,
        parties,
        oda_rules,
        non_metro_rules,
        region_surcharges,
        vas_charges,
        insurance_rules,
        incentive_slabs,
        annexures,
        notes: body.notes || "",
      };

      const { data } = await api.post("/contracts", serverPayload);
      alert(
        `✅ Contract created${data?.pdf_url ? `\nPDF: ${data.pdf_url}` : ""}`
      );
    } catch (e: any) {
      alert(
        e?.response?.data?.error ||
          "Failed to create contract. Please check required fields."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Contract</h1>

      {/* BASIC */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm mb-1">Client *</label>
          <select
            value={body.client_id}
            onChange={(e) => set("client_id", e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Select client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.client_name} ({c.client_code})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Contract Code *</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={body.contract_code}
            onChange={(e) => set("contract_code", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Title</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={body.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Purpose</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={body.purpose}
            onChange={(e) => set("purpose", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Start Date</label>
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={body.start_date || ""}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">End Date</label>
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={body.end_date || ""}
            onChange={(e) => set("end_date", e.target.value)}
          />
        </div>
      </section>

      {/* BILLING */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">Settlement Frequency</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={body.settlement_frequency}
            onChange={(e) => set("settlement_frequency", e.target.value as any)}
          >
            <option value="DAILY">DAILY</option>
            <option value="WEEKLY">WEEKLY</option>
            <option value="MONTHLY">MONTHLY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Credit Days</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.credit_days ?? ""}
            onChange={(e) => set("credit_days", parseNums(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">GST %</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.taxes_gst_pct ?? ""}
            onChange={(e) => set("taxes_gst_pct", parseNums(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Fuel Surcharge %</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.fuel_surcharge_pct ?? ""}
            onChange={(e) =>
              set("fuel_surcharge_pct", parseNums(e.target.value))
            }
          />
        </div>
        <div className="md:col-span-2 flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!body.price_floor_enabled}
              onChange={(e) => set("price_floor_enabled", e.target.checked)}
            />{" "}
            Price Floor
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!body.price_ceiling_enabled}
              onChange={(e) => set("price_ceiling_enabled", e.target.checked)}
            />{" "}
            Price Ceiling
          </label>
        </div>
        <div>
          <label className="block text-sm mb-1">Min Charge (₹)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.min_charge ?? ""}
            onChange={(e) => set("min_charge", parseNums(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Volumetric Base(s)</label>
          <div className="flex flex-wrap gap-2">
            {body.volumetric_bases.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-24 border rounded-md px-2 py-1"
                  value={v}
                  onChange={(e) => {
                    const arr = [...body.volumetric_bases];
                    arr[i] = Number(e.target.value || 0);
                    set("volumetric_bases", arr);
                  }}
                />
                <button
                  type="button"
                  className="text-sm text-red-600"
                  onClick={() =>
                    set(
                      "volumetric_bases",
                      body.volumetric_bases.filter((_, x) => x !== i)
                    )
                  }
                >
                  ×
                </button>
              </div>
            ))}
            <button
              type="button"
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() =>
                set("volumetric_bases", [...body.volumetric_bases, 6000])
              }
            >
              + Add
            </button>
          </div>
        </div>
      </section>

      {/* PARTIES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="font-medium">Parties</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={() => add("parties", emptyParty)}
          >
            + Add
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {body.parties.map((p, i) => (
            <div key={i} className="border rounded-lg p-3 grid gap-2">
              <div className="flex justify-between">
                <select
                  className="border rounded-md px-2 py-1"
                  value={p.party_role}
                  onChange={(e) =>
                    up("parties", i, { party_role: e.target.value as any })
                  }
                >
                  <option value="COMPANY">COMPANY</option>
                  <option value="CLIENT">CLIENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
                {i > 0 && (
                  <button
                    className="text-red-600 text-sm"
                    onClick={() => remove("parties", i)}
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                placeholder="Legal Name"
                className="border rounded-md px-2 py-1"
                value={p.legal_name}
                onChange={(e) =>
                  up("parties", i, { legal_name: e.target.value })
                }
              />
              <input
                placeholder="Contact Name"
                className="border rounded-md px-2 py-1"
                value={p.contact_name || ""}
                onChange={(e) =>
                  up("parties", i, { contact_name: e.target.value })
                }
              />
              <input
                placeholder="Email"
                className="border rounded-md px-2 py-1"
                value={p.email || ""}
                onChange={(e) => up("parties", i, { email: e.target.value })}
              />
              <input
                placeholder="Phone"
                className="border rounded-md px-2 py-1"
                value={p.phone || ""}
                onChange={(e) => up("parties", i, { phone: e.target.value })}
              />
              <input
                placeholder="Address"
                className="border rounded-md px-2 py-1"
                value={p.address || ""}
                onChange={(e) => up("parties", i, { address: e.target.value })}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ODA / NON-METRO / REGION SURCHARGES */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
        {/* ODA */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">ODA Rules</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => add("oda_rules", emptyOda)}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {body.oda_rules.map((r, i) => (
              <div key={i} className="border rounded-lg p-2 grid gap-1">
                <input
                  placeholder="Pincode Prefix"
                  className="border rounded px-2 py-1"
                  value={r.pincode_prefix}
                  onChange={(e) =>
                    up("oda_rules", i, { pincode_prefix: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Surcharge Flat"
                  className="border rounded px-2 py-1"
                  value={r.surcharge_flat ?? ""}
                  onChange={(e) =>
                    up("oda_rules", i, {
                      surcharge_flat: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Surcharge %"
                  className="border rounded px-2 py-1"
                  value={r.surcharge_pct ?? ""}
                  onChange={(e) =>
                    up("oda_rules", i, {
                      surcharge_pct: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("oda_rules", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Non-Metro */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Non-Metro Rules</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => add("non_metro_rules", emptyNonMetro)}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {body.non_metro_rules.map((r, i) => (
              <div key={i} className="border rounded-lg p-2 grid gap-1">
                <input
                  placeholder="City"
                  className="border rounded px-2 py-1"
                  value={r.city}
                  onChange={(e) =>
                    up("non_metro_rules", i, { city: e.target.value })
                  }
                />
                <select
                  className="border rounded px-2 py-1"
                  value={r.tier || "TIER2"}
                  onChange={(e) =>
                    up("non_metro_rules", i, { tier: e.target.value as any })
                  }
                >
                  <option value="TIER2">TIER2</option>
                  <option value="TIER3">TIER3</option>
                  <option value="RURAL">RURAL</option>
                </select>
                <input
                  type="number"
                  placeholder="Surcharge Flat"
                  className="border rounded px-2 py-1"
                  value={r.surcharge_flat ?? ""}
                  onChange={(e) =>
                    up("non_metro_rules", i, {
                      surcharge_flat: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Surcharge %"
                  className="border rounded px-2 py-1"
                  value={r.surcharge_pct ?? ""}
                  onChange={(e) =>
                    up("non_metro_rules", i, {
                      surcharge_pct: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("non_metro_rules", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Region */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Region Surcharges</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => add("region_surcharges", emptyRegion)}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {body.region_surcharges.map((r, i) => (
              <div key={i} className="border rounded-lg p-2 grid gap-1">
                <input
                  placeholder="Region Code"
                  className="border rounded px-2 py-1"
                  value={r.region_code}
                  onChange={(e) =>
                    up("region_surcharges", i, { region_code: e.target.value })
                  }
                />
                <input
                  placeholder="Description"
                  className="border rounded px-2 py-1"
                  value={r.description || ""}
                  onChange={(e) =>
                    up("region_surcharges", i, { description: e.target.value })
                  }
                />
                <input
                  type="number"
                  placeholder="Surcharge Flat"
                  className="border rounded px-2 py-1"
                  value={r.surcharge_flat ?? ""}
                  onChange={(e) =>
                    up("region_surcharges", i, {
                      surcharge_flat: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Surcharge %"
                  className="border rounded px-2 py-1"
                  value={r.surcharge_pct ?? ""}
                  onChange={(e) =>
                    up("region_surcharges", i, {
                      surcharge_pct: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("region_surcharges", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VAS / INSURANCE / INCENTIVES */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-3 gap-4">
        {/* VAS */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">VAS Charges</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => add("vas_charges", emptyVas)}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {body.vas_charges.map((v, i) => (
              <div key={i} className="border rounded-lg p-2 grid gap-1">
                <select
                  className="border rounded px-2 py-1"
                  value={v.code}
                  onChange={(e) =>
                    up("vas_charges", i, { code: e.target.value as any })
                  }
                >
                  <option value="FRAGILE">FRAGILE</option>
                  <option value="LIQUID">LIQUID</option>
                  <option value="PICKUP_FLOOR">PICKUP_FLOOR</option>
                  <option value="DELIVERY_FLOOR">DELIVERY_FLOOR</option>
                  <option value="ODA">ODA</option>
                  <option value="NON_METRO">NON_METRO</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <input
                  type="number"
                  placeholder="Flat"
                  className="border rounded px-2 py-1"
                  value={v.flat ?? ""}
                  onChange={(e) =>
                    up("vas_charges", i, {
                      flat: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="%"
                  className="border rounded px-2 py-1"
                  value={v.pct ?? ""}
                  onChange={(e) =>
                    up("vas_charges", i, {
                      pct: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("vas_charges", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Insurance */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Insurance Rules</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => add("insurance_rules", emptyIns)}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {body.insurance_rules.map((r, i) => (
              <div key={i} className="border rounded-lg p-2 grid gap-1">
                <input
                  type="number"
                  placeholder="Min Declared Value"
                  className="border rounded px-2 py-1"
                  value={r.min_declared_value ?? ""}
                  onChange={(e) =>
                    up("insurance_rules", i, {
                      min_declared_value: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Rate %"
                  className="border rounded px-2 py-1"
                  value={r.rate_pct}
                  onChange={(e) =>
                    up("insurance_rules", i, {
                      rate_pct: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  placeholder="Provider"
                  className="border rounded px-2 py-1"
                  value={r.provider || ""}
                  onChange={(e) =>
                    up("insurance_rules", i, { provider: e.target.value })
                  }
                />
                <input
                  placeholder="Notes"
                  className="border rounded px-2 py-1"
                  value={r.notes || ""}
                  onChange={(e) =>
                    up("insurance_rules", i, { notes: e.target.value })
                  }
                />
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("insurance_rules", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Incentives */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium">Incentive Slabs</div>
            <button
              className="text-sm px-2 py-1 rounded bg-gray-100"
              onClick={() => add("incentive_slabs", emptySlab)}
            >
              + Add
            </button>
          </div>
          <div className="space-y-2">
            {body.incentive_slabs.map((s, i) => (
              <div key={i} className="border rounded-lg p-2 grid gap-1">
                <input
                  type="number"
                  placeholder="Threshold Shipments"
                  className="border rounded px-2 py-1"
                  value={s.threshold_shipments ?? ""}
                  onChange={(e) =>
                    up("incentive_slabs", i, {
                      threshold_shipments: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Threshold Revenue"
                  className="border rounded px-2 py-1"
                  value={s.threshold_revenue ?? ""}
                  onChange={(e) =>
                    up("incentive_slabs", i, {
                      threshold_revenue: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <input
                  type="number"
                  placeholder="Incentive %"
                  className="border rounded px-2 py-1"
                  value={s.incentive_pct}
                  onChange={(e) =>
                    up("incentive_slabs", i, {
                      incentive_pct: parseFloat(e.target.value || "0"),
                    })
                  }
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={(s as any).from_date || ""}
                    onChange={(e) =>
                      up("incentive_slabs", i, {
                        from_date: e.target.value,
                      } as any)
                    }
                  />
                  <input
                    type="date"
                    className="border rounded px-2 py-1"
                    value={(s as any).to_date || ""}
                    onChange={(e) =>
                      up("incentive_slabs", i, {
                        to_date: e.target.value,
                      } as any)
                    }
                  />
                </div>
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("incentive_slabs", i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANNEXURES + NOTES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Annexures</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={() => add("annexures", emptyAnn)}
          >
            + Add
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {body.annexures.map((a, i) => (
            <div key={i} className="border rounded-lg p-3 grid gap-2">
              <div className="flex gap-2">
                <input
                  placeholder="Code"
                  className="border rounded px-2 py-1 w-24"
                  value={a.annexure_code}
                  onChange={(e) =>
                    up("annexures", i, { annexure_code: e.target.value })
                  }
                />
                <input
                  placeholder="Title"
                  className="border rounded px-2 py-1 flex-1"
                  value={a.title}
                  onChange={(e) =>
                    up("annexures", i, { title: e.target.value })
                  }
                />
              </div>
              <textarea
                placeholder="Raw text…"
                rows={6}
                className="border rounded px-2 py-1"
                value={a.raw_text}
                onChange={(e) =>
                  up("annexures", i, { raw_text: e.target.value })
                }
              />
              {i > 0 && (
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => remove("annexures", i)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4">
          <label className="block text-sm mb-1">Notes</label>
          <textarea
            className="w-full border rounded-md px-3 py-2"
            rows={3}
            value={body.notes || ""}
            onChange={(e) => set("notes", e.target.value)}
          />
        </div>
      </section>

      <div className="flex gap-2">
        <button
          disabled={saving || !canSave}
          onClick={save}
          className="px-4 py-2 rounded-md bg-brand text-white"
        >
          {saving ? "Saving…" : "Create Contract"}
        </button>
      </div>
    </div>
  );
}
