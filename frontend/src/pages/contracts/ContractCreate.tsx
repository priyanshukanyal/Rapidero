import { useEffect, useMemo, useState } from "react";
import api from "../../lib/api";
import type { Client } from "../../types";

/* -------------------------------------------------------------------------- */
/*                               Type definitions                              */
/* -------------------------------------------------------------------------- */

type Party = {
  party_role: "COMPANY" | "CLIENT" | "OTHER";
  legal_name: string;
  brand_name?: string | null;
  cin?: string | null;
  pan?: string | null;
  tan?: string | null;
  gstin?: string | null;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postcode?: string | null;
  phone?: string | null;
  email?: string | null;
  contact_person?: string | null;
  district?: string | null;
};

type VolumetricBase = { cft_base: number; basis_text?: string | null };

type Oda = {
  oda_code: string;
  oda_label?: string | null;
  rate_per_kg?: number | null;
  min_per_cn?: number | null;
  max_per_cn?: number | null;
  notes?: string | null;
};

type Insurance = {
  insurance_type: string;
  pct_of_invoice: number;
  min_per_cn: number;
  liability_desc?: string | null;
};

type VAS = {
  vas_code: string;
  calc_method: "FLAT" | "PCT";
  rate_per_kg?: number | null;
  rate_per_cn?: number | null;
  min_per_cn?: number | null;
  max_per_cn?: number | null;
  notes?: string | null;
};

type SpecialHandling = {
  range_min_kg: number;
  range_max_kg?: number | null;
  rate_per_kg: number;
};

type PickupCharge = {
  service_code: string;
  rate_per_kg?: number | null;
  min_per_pickup?: number | null;
  notes?: string | null;
};

type RegionSurcharge = {
  region_name: string;
  base_relative_to?: string | null;
  addl_rate_per_kg?: number | null;
  notes?: string | null;
};

type NonMetroRule = {
  distance_km_max?: number | null;
  rate_per_kg?: number | null;
};

type IncentiveSlab = {
  tonnage_min?: number | null;
  tonnage_max?: number | null;
  discount_pct?: number | null;
};

type Annexure = {
  annexure_code: string;
  title?: string | null;
  raw_text?: string | null;
};

type ZoneRow = {
  id: string; // local UI id only
  zone_name: string;
  rate_per_kg: number;
  tat_days: number;
  min_cn_rs: number;
  cities: string[]; // UI only; saved as CSV in coverage_areas
};

const uid = () => Math.random().toString(36).slice(2, 10);

/* -------------------------------------------------------------------------- */
/*                         Prefilled defaults from PDF                         */
/* -------------------------------------------------------------------------- */

const PDF_DEFAULTS = {
  // Header/meta
  contract_code: "C-4567",
  contract_type: "GENERAL",
  purpose: "SERVICE CONTRACT",
  agreement_place: "Gurugram",
  territory_desc: "Pan-India",
  agreement_date: new Date().toISOString().slice(0, 10),
  term_months: 12,
  // Billing/settlement
  settlement_frequency: "MONTHLY" as "MONTHLY" | "WEEKLY" | "DAILY",
  payment_terms_days: 15,
  taxes_gst_pct: 18,
  // Volumetric basis
  volumetric_bases: [
    { cft_base: 6, basis_text: "1 CFT = 6 Kg" } as VolumetricBase,
  ],
  charging_mechanism: "HIGHER_OF_ACTUAL_OR_VOLUMETRIC",
  rounding_rule: "ROUND_UP",
  min_chargeable_weight_kg: 20,
  min_chargeable_freight_rs: 200,
  cn_charge_per_cn: 0,
  docket_charge_per_cn: 80,
  metro_congestion_charge_per_cn: 0,
  // Fuel clause
  fuel_base_pct: 15,
  fuel_diesel_base_price: 85,
  fuel_slope_pct_per_1pct: 0.6,
  // Flags
  price_floor_enabled: false,
  price_ceiling_enabled: false,
  opa_excluded: true,
  // Odd size thresholds
  odd_size_pricing: "ON_ACTUALS",
  odd_size_len_ft: 6,
  odd_size_wid_ft: 5,
  odd_size_ht_ft: 5,
  // Legal/Dispute
  jurisdiction_city: "Gurugram",
  arbitration_seat: "New Delhi",
  arbitration_language: "English",
  termination_notice_days: 30,
  non_compete_cooling_months: 6,
  // Capacity
  capacity_booking_day_of_month: 25,
  capacity_additional_notice_days: 7,

  // Metro cities table
  metro_cities: [
    "Delhi",
    "Ahmedabad",
    "Pune",
    "Mumbai",
    "Chennai",
    "Hyderabad",
    "Bangalore",
    "Kolkata",
  ],

  // ODA table
  oda: [
    {
      oda_code: "ODA-1",
      oda_label: "ODA-1",
      rate_per_kg: 2.5,
      min_per_cn: 500,
      max_per_cn: 10000,
    },
    {
      oda_code: "ODA-2",
      oda_label: "Difficult Terrain",
      rate_per_kg: 4,
      min_per_cn: 1000,
      max_per_cn: 18000,
    },
    {
      oda_code: "ODA-3",
      oda_label: "Rivigo Extension-1",
      rate_per_kg: 5,
      min_per_cn: 2500,
      max_per_cn: null,
    },
    {
      oda_code: "ODA-4",
      oda_label: "Rivigo Extension-2",
      rate_per_kg: 150,
      min_per_cn: 15000,
      max_per_cn: null,
    },
  ] as Oda[],

  // Insurance table
  insurance: [
    {
      insurance_type: "OWNER'S RISK (FOV)",
      pct_of_invoice: 0.02,
      min_per_cn: 25,
      liability_desc: "COF + Liability ₹5000/CN",
    },
    {
      insurance_type: "CARRIER'S RISK (FRAGILE)",
      pct_of_invoice: 0.07,
      min_per_cn: 50,
      liability_desc: "Of invoice value",
    },
    {
      insurance_type: "CARRIER'S RISK (NON-FRAGILE)",
      pct_of_invoice: 0.07,
      min_per_cn: 50,
      liability_desc: "Of invoice value",
    },
  ] as Insurance[],

  // VAS table
  vas: [
    {
      vas_code: "GREEN_TAX",
      calc_method: "FLAT",
      rate_per_cn: 50,
      min_per_cn: null,
      max_per_cn: null,
      notes: "For Delhi",
    },
    {
      vas_code: "MALL_DELIVERY",
      calc_method: "PCT",
      rate_per_kg: 1.5,
      min_per_cn: 350,
      max_per_cn: null,
      notes: "Per attempt",
    },
    {
      vas_code: "DAY_DEFINED_APPT",
      calc_method: "PCT",
      rate_per_kg: 1.5,
      min_per_cn: 350,
      max_per_cn: 3000,
      notes: "Per CN, after 2nd attempt",
    },
    {
      vas_code: "TIME_DEFINED_APPT",
      calc_method: "PCT",
      rate_per_kg: 1.5,
      min_per_cn: 500,
      max_per_cn: 4000,
      notes: "Per CN, after 2nd attempt",
    },
    {
      vas_code: "SPECIAL_DELIVERIES",
      calc_method: "PCT",
      rate_per_kg: 2,
      min_per_cn: 1500,
      max_per_cn: null,
      notes: "Per attempt",
    },
    {
      vas_code: "SUN_HOL_DELIVERIES",
      calc_method: "PCT",
      rate_per_kg: 2,
      min_per_cn: 1500,
      max_per_cn: null,
      notes: "Per attempt",
    },
    {
      vas_code: "COD_DOD_ONLINE_DACC",
      calc_method: "FLAT",
      rate_per_cn: 250,
      min_per_cn: null,
      max_per_cn: null,
      notes: "",
    },
    {
      vas_code: "FOD_TO_PAY",
      calc_method: "FLAT",
      rate_per_cn: 150,
      min_per_cn: null,
      max_per_cn: null,
      notes: "",
    },
    {
      vas_code: "RTO_CHARGES",
      calc_method: "PCT",
      rate_per_kg: 100,
      min_per_cn: null,
      max_per_cn: null,
      notes: "100% of contracted rate to Network Partner",
    },
    {
      vas_code: "DELIVERY_REATTEMPT",
      calc_method: "PCT",
      rate_per_kg: 1,
      min_per_cn: null,
      max_per_cn: null,
      notes: "After 2nd attempt",
    },
    {
      vas_code: "DEMURRAGE",
      calc_method: "PCT",
      rate_per_kg: 0.3,
      min_per_cn: null,
      max_per_cn: null,
      notes: "₹/kg/day after 25 days of 1st attempt",
    },
    {
      vas_code: "HIGHER_FLOORS",
      calc_method: "PCT",
      rate_per_kg: 1.5,
      min_per_cn: null,
      max_per_cn: null,
      notes: "Per floor above 1st",
    },
  ] as VAS[],

  // Special Handling
  specialHandling: [
    { range_min_kg: 0, range_max_kg: 100, rate_per_kg: 0 },
    { range_min_kg: 100, range_max_kg: 250, rate_per_kg: 2 },
    { range_min_kg: 250, range_max_kg: 500, rate_per_kg: 3 },
    { range_min_kg: 500, range_max_kg: null, rate_per_kg: 4 },
  ] as SpecialHandling[],

  // Pickup
  pickup: [
    {
      service_code: "PRQ_BY_MESPL",
      rate_per_kg: 1,
      min_per_pickup: 200,
      notes: "",
    },
    {
      service_code: "UNION_MATHADI",
      rate_per_kg: null,
      min_per_pickup: null,
      notes: "On Actuals",
    },
    {
      service_code: "DEDICATED_EQUIP",
      rate_per_kg: null,
      min_per_pickup: null,
      notes: "On Actuals",
    },
  ] as PickupCharge[],

  // Zones/TAT
  zones: [
    {
      zone_name: "North-1",
      rate_per_kg: 10,
      tat_days: 4,
      min_cn_rs: 350,
      cities: ["Delhi", "Gurgaon", "Faridabad", "Ghaziabad"],
    },
    {
      zone_name: "North-2",
      rate_per_kg: 10,
      tat_days: 4,
      min_cn_rs: 350,
      cities: ["Haryana", "Lucknow", "Rajasthan"],
    },
    {
      zone_name: "North-3",
      rate_per_kg: 11.5,
      tat_days: 5,
      min_cn_rs: 350,
      cities: ["Himachal Pradesh", "Jammu"],
    },
    {
      zone_name: "Centre",
      rate_per_kg: 12,
      tat_days: 4,
      min_cn_rs: 350,
      cities: ["Bhopal", "Indore", "Nagpur"],
    },
    {
      zone_name: "West",
      rate_per_kg: 13,
      tat_days: 3,
      min_cn_rs: 350,
      cities: ["Mumbai", "Pune", "Gujarat"],
    },
    {
      zone_name: "South-1",
      rate_per_kg: 14,
      tat_days: 5,
      min_cn_rs: 350,
      cities: ["Bangalore", "Chennai", "Hyderabad"],
    },
    {
      zone_name: "South-2",
      rate_per_kg: 15,
      tat_days: 6,
      min_cn_rs: 350,
      cities: ["Kerala", "Telangana", "Andhra Pradesh"],
    },
    {
      zone_name: "East",
      rate_per_kg: 16,
      tat_days: 6,
      min_cn_rs: 350,
      cities: ["Kolkata", "Assam", "North East"],
    },
  ] as ZoneRow[],

  // Company party prefill
  partyCompany: {
    party_role: "COMPANY",
    legal_name: "RAPIDERO LOGISTICS PVT. LTD.",
    brand_name: null,
    cin: "U12345DL2020PTC123456",
    pan: "AABCR1234P",
    tan: null,
    gstin: "07AABCR1234P1Z5",
    address_line1: "123, Business Park",
    address_line2: null,
    city: "New Delhi",
    state: "Delhi",
    postcode: "110001",
    phone: "+91-9876543210",
    email: "contact@rapiderologistics.com",
    contact_person: "Rapidero Contracts",
    district: null,
  } as Party,
};

/* -------------------------------------------------------------------------- */
/*                           Zones drag-and-drop widget                        */
/* -------------------------------------------------------------------------- */

function ZonesTATEditor({
  value,
  onChange,
}: {
  value: ZoneRow[];
  onChange: (rows: ZoneRow[]) => void;
}) {
  const [zones, setZones] = useState<ZoneRow[]>(() =>
    (value || []).map((z) => ({ ...z, id: uid() }))
  );

  useEffect(() => onChange(zones), [zones]); // keep parent synced

  const onDragStart = (
    ev: React.DragEvent,
    city: string,
    fromZoneId: string
  ) => {
    ev.dataTransfer.setData(
      "application/x-city",
      JSON.stringify({ city, fromZoneId })
    );
    ev.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (ev: React.DragEvent) => {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  };
  const onDrop = (ev: React.DragEvent, toZoneId: string) => {
    ev.preventDefault();
    const raw = ev.dataTransfer.getData("application/x-city");
    if (!raw) return;
    const { city, fromZoneId } = JSON.parse(raw) as {
      city: string;
      fromZoneId: string;
    };
    if (!city || !fromZoneId || fromZoneId === toZoneId) return;

    setZones((zs) => {
      const cleaned = zs.map((z) => ({
        ...z,
        cities: z.cities.filter((c) => c !== city),
      }));
      return cleaned.map((z) =>
        z.id === toZoneId ? { ...z, cities: [...z.cities, city] } : z
      );
    });
  };

  const patchZone = (zoneId: string, patch: Partial<ZoneRow>) =>
    setZones((zs) => zs.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)));

  const addZone = () =>
    setZones((zs) => [
      ...zs,
      {
        id: uid(),
        zone_name: "New Zone",
        rate_per_kg: 0,
        tat_days: 0,
        min_cn_rs: 0,
        cities: [],
      },
    ]);

  const addCity = (zoneId: string) => {
    const name = prompt("City to add?");
    const city = (name || "").trim();
    if (!city) return;
    setZones((zs) => {
      const cleaned = zs.map((z) => ({
        ...z,
        cities: z.cities.filter((c) => c !== city),
      }));
      return cleaned.map((z) =>
        z.id === zoneId ? { ...z, cities: [...z.cities, city] } : z
      );
    });
  };

  const removeCity = (zoneId: string, city: string) =>
    setZones((zs) =>
      zs.map((z) =>
        z.id === zoneId
          ? { ...z, cities: z.cities.filter((c) => c !== city) }
          : z
      )
    );

  return (
    <section className="bg-white p-6 rounded-xl shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-lg">Zone Rates &amp; TAT</div>
        <button
          className="text-sm px-2 py-1 rounded bg-gray-100"
          onClick={addZone}
        >
          + Add Zone
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {zones.map((z) => (
          <div
            key={z.id}
            className="border rounded-lg p-3"
            onDragOver={onDragOver}
            onDrop={(e) => onDrop(e, z.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <input
                className="border rounded px-2 py-1 font-medium"
                value={z.zone_name}
                onChange={(e) => patchZone(z.id, { zone_name: e.target.value })}
              />
              <div className="flex gap-2">
                <div className="text-sm">
                  <label className="block text-[11px] text-gray-500">
                    Rate (₹/kg)
                  </label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-24"
                    value={z.rate_per_kg}
                    onChange={(e) =>
                      patchZone(z.id, {
                        rate_per_kg: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
                <div className="text-sm">
                  <label className="block text-[11px] text-gray-500">
                    TAT (Days)
                  </label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-20"
                    value={z.tat_days}
                    onChange={(e) =>
                      patchZone(z.id, { tat_days: Number(e.target.value || 0) })
                    }
                  />
                </div>
                <div className="text-sm">
                  <label className="block text-[11px] text-gray-500">
                    Min CN (₹)
                  </label>
                  <input
                    type="number"
                    className="border rounded px-2 py-1 w-24"
                    value={z.min_cn_rs}
                    onChange={(e) =>
                      patchZone(z.id, {
                        min_cn_rs: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">Coverage Cities</div>
                <button
                  className="text-xs px-2 py-1 rounded bg-gray-100"
                  onClick={() => addCity(z.id)}
                >
                  + Add City
                </button>
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {z.cities.map((c) => (
                  <span
                    key={c}
                    draggable
                    onDragStart={(e) => onDragStart(e, c, z.id)}
                    className="inline-flex items-center gap-1 border rounded-full px-2 py-1 text-xs bg-gray-50 cursor-move"
                    title="Drag to another zone"
                  >
                    {c}
                    <button
                      className="text-red-600"
                      onClick={() => removeCity(z.id, c)}
                      title="Remove from this zone"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {z.cities.length === 0 && (
                  <span className="text-xs text-gray-400">
                    Drop cities here…
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Helpers                                   */
/* -------------------------------------------------------------------------- */

const num = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d);
const maybe = (s: any) => {
  const t = s == null ? "" : String(s).trim();
  return t.length ? t : null;
};
const normalizeRole = (x: any): Party["party_role"] => {
  const v = String(x ?? "")
    .trim()
    .toUpperCase();
  return (
    ["COMPANY", "CLIENT", "OTHER"].includes(v) ? v : "OTHER"
  ) as Party["party_role"];
};

function stripEmptyRows<T extends Record<string, any>>(
  rows: T[],
  keys: (keyof T)[]
) {
  return (rows || []).filter((r) =>
    keys.some((k) => ![null, undefined, ""].includes((r as any)[k]))
  );
}

/* -------------------------------------------------------------------------- */
/*                              ContractCreate Form                             */
/* -------------------------------------------------------------------------- */

export default function ContractCreate() {
  const [clients, setClients] = useState<Client[]>([]);
  const [saving, setSaving] = useState(false);

  const [body, setBody] = useState<any>(() => {
    const zones: ZoneRow[] = PDF_DEFAULTS.zones.map((z) => ({
      ...z,
      id: uid(),
    }));
    return {
      client_id: "",

      // header/meta
      contract_code: PDF_DEFAULTS.contract_code,
      contract_type: PDF_DEFAULTS.contract_type,
      purpose: PDF_DEFAULTS.purpose,
      agreement_place: PDF_DEFAULTS.agreement_place,
      territory_desc: PDF_DEFAULTS.territory_desc,
      agreement_date: PDF_DEFAULTS.agreement_date,
      term_months: PDF_DEFAULTS.term_months,
      start_date: PDF_DEFAULTS.agreement_date,
      end_date: "",

      // settlement & billing
      settlement_frequency: PDF_DEFAULTS.settlement_frequency,
      payment_terms_days: PDF_DEFAULTS.payment_terms_days,
      taxes_gst_pct: PDF_DEFAULTS.taxes_gst_pct,

      volumetric_bases: [...PDF_DEFAULTS.volumetric_bases],
      charging_mechanism: PDF_DEFAULTS.charging_mechanism,
      rounding_rule: PDF_DEFAULTS.rounding_rule,

      min_chargeable_weight_kg: PDF_DEFAULTS.min_chargeable_weight_kg,
      min_chargeable_freight_rs: PDF_DEFAULTS.min_chargeable_freight_rs,
      cn_charge_per_cn: PDF_DEFAULTS.cn_charge_per_cn,
      docket_charge_per_cn: PDF_DEFAULTS.docket_charge_per_cn,
      metro_congestion_charge_per_cn:
        PDF_DEFAULTS.metro_congestion_charge_per_cn,

      // fuel
      fuel_base_pct: PDF_DEFAULTS.fuel_base_pct,
      fuel_diesel_base_price: PDF_DEFAULTS.fuel_diesel_base_price,
      fuel_slope_pct_per_1pct: PDF_DEFAULTS.fuel_slope_pct_per_1pct,

      // flags
      price_floor_enabled: PDF_DEFAULTS.price_floor_enabled,
      price_ceiling_enabled: PDF_DEFAULTS.price_ceiling_enabled,
      opa_excluded: PDF_DEFAULTS.opa_excluded,

      // odd size
      odd_size_pricing: PDF_DEFAULTS.odd_size_pricing,
      odd_size_len_ft: PDF_DEFAULTS.odd_size_len_ft,
      odd_size_wid_ft: PDF_DEFAULTS.odd_size_wid_ft,
      odd_size_ht_ft: PDF_DEFAULTS.odd_size_ht_ft,

      // legal
      jurisdiction_city: PDF_DEFAULTS.jurisdiction_city,
      arbitration_seat: PDF_DEFAULTS.arbitration_seat,
      arbitration_language: PDF_DEFAULTS.arbitration_language,
      termination_notice_days: PDF_DEFAULTS.termination_notice_days,
      non_compete_cooling_months: PDF_DEFAULTS.non_compete_cooling_months,

      // capacity
      capacity_booking_day_of_month: PDF_DEFAULTS.capacity_booking_day_of_month,
      capacity_additional_notice_days:
        PDF_DEFAULTS.capacity_additional_notice_days,

      // parties
      parties: [
        { ...PDF_DEFAULTS.partyCompany },
        {
          party_role: "CLIENT",
          legal_name: "",
          brand_name: null,
          cin: null,
          pan: null,
          tan: null,
          gstin: null,
          address_line1: null,
          address_line2: null,
          city: null,
          state: null,
          postcode: null,
          phone: null,
          email: null,
          contact_person: null,
          district: null,
        } as Party,
      ],

      // tables
      metro_cities: PDF_DEFAULTS.metro_cities.map((city) => ({
        city,
        charge_per_cn: 0,
        notes: "",
      })),
      oda: [...PDF_DEFAULTS.oda],
      insurance: [...PDF_DEFAULTS.insurance],
      vas: [...PDF_DEFAULTS.vas],
      special_handling: [...PDF_DEFAULTS.specialHandling],
      pickup_charges: [...PDF_DEFAULTS.pickup],

      // zones (UI)
      zones,

      // extra sections to ensure PDF tables never blank by mistake
      region_surcharges: [
        {
          region_name: "",
          base_relative_to: "",
          addl_rate_per_kg: null,
          notes: "",
        },
      ] as RegionSurcharge[],
      non_metro_rules: [
        { distance_km_max: null, rate_per_kg: null },
      ] as NonMetroRule[],
      incentives: [
        { tonnage_min: null, tonnage_max: null, discount_pct: null },
      ] as IncentiveSlab[],
      annexures: [
        { annexure_code: "A", title: "", raw_text: "" },
      ] as Annexure[],

      notes: "",
    };
  });

  useEffect(() => {
    api.get<Client[]>("/clients").then((r) => setClients(r.data || []));
  }, []);

  const set = (k: string, v: any) => setBody((b: any) => ({ ...b, [k]: v }));
  const canSave = useMemo(
    () => Boolean(body.client_id && body.contract_code),
    [body]
  );

  /* ---------------------------------- Save --------------------------------- */
  const save = async () => {
    if (!canSave) return alert("Client & Contract code are required");
    setSaving(true);
    try {
      const parties = (body.parties as Party[])
        .map((p) => ({
          party_role: normalizeRole(p.party_role),
          legal_name: (p.legal_name || "").trim(),
          brand_name: maybe(p.brand_name),
          cin: maybe(p.cin),
          pan: maybe(p.pan),
          tan: maybe(p.tan),
          gstin: maybe(p.gstin),
          address_line1: maybe(p.address_line1),
          address_line2: maybe(p.address_line2),
          city: maybe(p.city),
          state: maybe(p.state),
          district: maybe(p.district),
          postcode: maybe(p.postcode),
          phone: maybe(p.phone),
          email: maybe(p.email),
          contact_person: maybe(p.contact_person),
        }))
        .filter((p) => p.legal_name.length > 0);

      const zone_rates = (body.zones as ZoneRow[]).map((z) => ({
        zone_name: z.zone_name.trim(),
        rate_per_kg: num(z.rate_per_kg, 0),
        tat_days: num(z.tat_days, 0),
        min_cn_rs: num(z.min_cn_rs, 0),
        coverage_areas: z.cities.join(", "),
      }));

      const payload = {
        client_id: body.client_id,
        contract_code: body.contract_code,

        purpose: maybe(body.purpose),
        agreement_place: maybe(body.agreement_place),
        territory_desc: maybe(body.territory_desc),
        agreement_date: body.agreement_date || null,
        term_start: body.start_date || null,
        term_end: body.end_date || null,
        term_months: num(body.term_months, 0),

        settlement_frequency: body.settlement_frequency,
        payment_terms_days: num(body.payment_terms_days, 15),
        taxes_gst_pct: num(body.taxes_gst_pct, 18),

        volumetric_bases: (body.volumetric_bases as VolumetricBase[]).map(
          (v) => ({
            cft_base: num(v.cft_base, 0),
            basis_text: maybe(v.basis_text),
          })
        ),

        charging_mechanism: body.charging_mechanism,
        rounding_rule: body.rounding_rule,

        min_chargeable_weight_kg: num(body.min_chargeable_weight_kg, 0),
        min_chargeable_freight_rs: num(body.min_chargeable_freight_rs, 0),
        cn_charge_per_cn: num(body.cn_charge_per_cn, 0),
        docket_charge_per_cn: num(body.docket_charge_per_cn, 0),
        metro_congestion_charge_per_cn: num(
          body.metro_congestion_charge_per_cn,
          0
        ),

        fuel_base_pct: num(body.fuel_base_pct, 0),
        fuel_diesel_base_price: num(body.fuel_diesel_base_price, 0),
        fuel_slope_pct_per_1pct: num(body.fuel_slope_pct_per_1pct, 0),

        contract_type: body.contract_type,
        price_floor_enabled: !!body.price_floor_enabled,
        price_ceiling_enabled: !!body.price_ceiling_enabled,
        opa_excluded: !!body.opa_excluded,

        odd_size_len_ft: num(body.odd_size_len_ft, 6),
        odd_size_wid_ft: num(body.odd_size_wid_ft, 5),
        odd_size_ht_ft: num(body.odd_size_ht_ft, 5),
        odd_size_pricing: body.odd_size_pricing,

        // legal
        jurisdiction_city: maybe(body.jurisdiction_city),
        arbitration_seat: maybe(body.arbitration_seat),
        arbitration_language: maybe(body.arbitration_language),
        termination_notice_days: num(body.termination_notice_days, 0),
        non_compete_cooling_months: num(body.non_compete_cooling_months, 0),

        // capacity
        capacity_booking_day_of_month: num(
          body.capacity_booking_day_of_month,
          0
        ),
        capacity_additional_notice_days: num(
          body.capacity_additional_notice_days,
          0
        ),

        // tables aligned to PDF VM keys
        parties,
        metro_cities: body.metro_cities,
        oda: body.oda,
        insurance: body.insurance,
        vas: body.vas,
        special_handling: body.special_handling,
        pickup_charges: body.pickup_charges,
        zone_rates,

        region_surcharges: stripEmptyRows(body.region_surcharges || [], [
          "region_name",
        ]),
        non_metro_rules: stripEmptyRows(body.non_metro_rules || [], [
          "distance_km_max",
          "rate_per_kg",
        ]),
        incentives: stripEmptyRows(body.incentives || [], [
          "tonnage_min",
          "discount_pct",
        ]),
        annexures: stripEmptyRows(body.annexures || [], [
          "annexure_code",
          "title",
          "raw_text",
        ]),

        notes: maybe(body.notes) || "",
      };

      const { data } = await api.post("/contracts", payload);
      alert(
        `✅ Contract created${data?.pdf_url ? `\nPDF: ${data.pdf_url}` : ""}`
      );
    } catch (e: any) {
      console.error(e);
      alert(
        e?.response?.data?.message ||
          e?.response?.data?.error ||
          "Failed to create contract."
      );
    } finally {
      setSaving(false);
    }
  };

  /* ---------------------------------- UI ---------------------------------- */

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Create Contract</h1>

      {/* BASIC / HEADER */}
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
          <label className="block text-sm mb-1">Contract Type</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={body.contract_type}
            onChange={(e) => set("contract_type", e.target.value)}
          >
            <option value="GENERAL">GENERAL</option>
            <option value="MASTER">MASTER</option>
            <option value="PROJECT">PROJECT</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Purpose</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={body.purpose}
            onChange={(e) => set("purpose", e.target.value)}
            placeholder="SERVICE CONTRACT"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Agreement Date</label>
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={body.agreement_date || ""}
            onChange={(e) => set("agreement_date", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Term (months)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.term_months}
            onChange={(e) => set("term_months", num(e.target.value, 0))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Term Start</label>
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={body.start_date || ""}
            onChange={(e) => set("start_date", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Term End</label>
          <input
            type="date"
            className="w-full border rounded-md px-3 py-2"
            value={body.end_date || ""}
            onChange={(e) => set("end_date", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Agreement Place</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={body.agreement_place}
            onChange={(e) => set("agreement_place", e.target.value)}
            placeholder="Gurugram"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Territory</label>
          <input
            className="w-full border rounded-md px-3 py-2"
            value={body.territory_desc}
            onChange={(e) => set("territory_desc", e.target.value)}
            placeholder="Pan-India"
          />
        </div>
      </section>

      {/* BILLING / TERMS / FUEL */}
      <section className="bg-white p-6 rounded-xl shadow grid md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm mb-1">Payment Terms (Days)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.payment_terms_days}
            onChange={(e) => set("payment_terms_days", num(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Settlement Frequency</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={body.settlement_frequency}
            onChange={(e) => set("settlement_frequency", e.target.value)}
          >
            <option value="DAILY">DAILY</option>
            <option value="WEEKLY">WEEKLY</option>
            <option value="MONTHLY">MONTHLY</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">GST %</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.taxes_gst_pct}
            onChange={(e) => set("taxes_gst_pct", num(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Metro Congestion/CN (₹)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.metro_congestion_charge_per_cn}
            onChange={(e) =>
              set("metro_congestion_charge_per_cn", num(e.target.value))
            }
          />
        </div>

        <div className="md:col-span-4 grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Fuel Base %</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={body.fuel_base_pct}
              onChange={(e) => set("fuel_base_pct", num(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Diesel Base (₹/L)</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={body.fuel_diesel_base_price}
              onChange={(e) =>
                set("fuel_diesel_base_price", num(e.target.value))
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Fuel Slope % per +1%</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={body.fuel_slope_pct_per_1pct}
              onChange={(e) =>
                set("fuel_slope_pct_per_1pct", num(e.target.value))
              }
            />
          </div>
        </div>

        <div className="md:col-span-4 flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!body.price_floor_enabled}
              onChange={(e) => set("price_floor_enabled", e.target.checked)}
            />
            Price Floor
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!body.price_ceiling_enabled}
              onChange={(e) => set("price_ceiling_enabled", e.target.checked)}
            />
            Price Ceiling
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!body.opa_excluded}
              onChange={(e) => set("opa_excluded", e.target.checked)}
            />
            OPA Excluded
          </label>
        </div>

        <div>
          <label className="block text-sm mb-1">
            Min Chargeable Weight (Kg)
          </label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.min_chargeable_weight_kg}
            onChange={(e) =>
              set("min_chargeable_weight_kg", num(e.target.value))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Min Freight / CN (₹)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.min_chargeable_freight_rs}
            onChange={(e) =>
              set("min_chargeable_freight_rs", num(e.target.value))
            }
          />
        </div>
        <div>
          <label className="block text-sm mb-1">CN Charge / CN (₹)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.cn_charge_per_cn}
            onChange={(e) => set("cn_charge_per_cn", num(e.target.value))}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Docket Charge / CN (₹)</label>
          <input
            type="number"
            className="w-full border rounded-md px-3 py-2"
            value={body.docket_charge_per_cn}
            onChange={(e) => set("docket_charge_per_cn", num(e.target.value))}
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Charging Mechanism</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={body.charging_mechanism}
            onChange={(e) => set("charging_mechanism", e.target.value)}
          >
            <option value="HIGHER_OF_ACTUAL_OR_VOLUMETRIC">
              HIGHER_OF_ACTUAL_OR_VOLUMETRIC
            </option>
            <option value="ACTUAL_WEIGHT_ONLY">ACTUAL_WEIGHT_ONLY</option>
            <option value="VOLUMETRIC_WEIGHT_ONLY">
              VOLUMETRIC_WEIGHT_ONLY
            </option>
            <option value="PER_SHIPMENT_FLAT">PER_SHIPMENT_FLAT</option>
            <option value="SLAB_BY_WEIGHT">SLAB_BY_WEIGHT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Rounding Rule</label>
          <select
            className="w-full border rounded-md px-3 py-2"
            value={body.rounding_rule}
            onChange={(e) => set("rounding_rule", e.target.value)}
          >
            <option value="ROUND_UP">ROUND_UP</option>
            <option value="ROUND_NEAREST">ROUND_NEAREST</option>
            <option value="FLOOR">FLOOR</option>
          </select>
        </div>
      </section>

      {/* VOLUMETRIC BASIS */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">Volumetric Basis</div>
        {(body.volumetric_bases as VolumetricBase[]).map(
          (v: any, i: number) => (
            <div
              key={i}
              className="grid md:grid-cols-3 gap-2 border rounded p-3 mb-2"
            >
              <div>
                <label className="block text-xs mb-1">
                  CFT Base (Kg per CFT)
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={v.cft_base}
                  onChange={(e) => {
                    const arr = [...body.volumetric_bases];
                    arr[i] = { ...arr[i], cft_base: num(e.target.value, 0) };
                    set("volumetric_bases", arr);
                  }}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs mb-1">
                  Basis Text (as shown on PDF)
                </label>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={v.basis_text || ""}
                  onChange={(e) => {
                    const arr = [...body.volumetric_bases];
                    arr[i] = { ...arr[i], basis_text: e.target.value };
                    set("volumetric_bases", arr);
                  }}
                />
              </div>
            </div>
          )
        )}
      </section>

      {/* PARTIES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">Party Details</div>
        <div className="grid md:grid-cols-2 gap-3">
          {(body.parties as Party[]).map((p, i) => (
            <div key={i} className="border rounded-lg p-3 grid gap-2">
              <div className="flex gap-2">
                <select
                  className="border rounded-md px-2 py-1"
                  value={p.party_role}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], party_role: e.target.value as any };
                    set("parties", arr);
                  }}
                >
                  <option value="COMPANY">COMPANY</option>
                  <option value="CLIENT">CLIENT</option>
                  <option value="OTHER">OTHER</option>
                </select>
                <input
                  placeholder="Legal Name"
                  className="border rounded-md px-2 py-1 flex-1"
                  value={p.legal_name}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], legal_name: e.target.value };
                    set("parties", arr);
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="CIN"
                  className="border rounded-md px-2 py-1"
                  value={p.cin || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], cin: e.target.value };
                    set("parties", arr);
                  }}
                />
                <input
                  placeholder="PAN"
                  className="border rounded-md px-2 py-1"
                  value={p.pan || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], pan: e.target.value };
                    set("parties", arr);
                  }}
                />
                <input
                  placeholder="TAN"
                  className="border rounded-md px-2 py-1"
                  value={p.tan || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], tan: e.target.value };
                    set("parties", arr);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="GSTIN"
                  className="border rounded-md px-2 py-1"
                  value={p.gstin || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], gstin: e.target.value };
                    set("parties", arr);
                  }}
                />
                <input
                  placeholder="Contact Person"
                  className="border rounded-md px-2 py-1"
                  value={p.contact_person || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], contact_person: e.target.value };
                    set("parties", arr);
                  }}
                />
              </div>

              <input
                placeholder="Address Line 1"
                className="border rounded-md px-2 py-1"
                value={p.address_line1 || ""}
                onChange={(e) => {
                  const arr = [...body.parties];
                  arr[i] = { ...arr[i], address_line1: e.target.value };
                  set("parties", arr);
                }}
              />
              <input
                placeholder="Address Line 2"
                className="border rounded-md px-2 py-1"
                value={p.address_line2 || ""}
                onChange={(e) => {
                  const arr = [...body.parties];
                  arr[i] = { ...arr[i], address_line2: e.target.value };
                  set("parties", arr);
                }}
              />

              <div className="grid grid-cols-3 gap-2">
                <input
                  placeholder="City"
                  className="border rounded-md px-2 py-1"
                  value={p.city || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], city: e.target.value };
                    set("parties", arr);
                  }}
                />
                <input
                  placeholder="State"
                  className="border rounded-md px-2 py-1"
                  value={p.state || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], state: e.target.value };
                    set("parties", arr);
                  }}
                />
                <input
                  placeholder="Postcode"
                  className="border rounded-md px-2 py-1"
                  value={p.postcode || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], postcode: e.target.value };
                    set("parties", arr);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  placeholder="Email"
                  className="border rounded-md px-2 py-1"
                  value={p.email || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], email: e.target.value };
                    set("parties", arr);
                  }}
                />
                <input
                  placeholder="Phone"
                  className="border rounded-md px-2 py-1"
                  value={p.phone || ""}
                  onChange={(e) => {
                    const arr = [...body.parties];
                    arr[i] = { ...arr[i], phone: e.target.value };
                    set("parties", arr);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* METRO CONGESTION TABLE */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">Metro Congestion Charges</div>
        <div className="grid md:grid-cols-2 gap-3">
          {body.metro_cities.map((m: any, i: number) => (
            <div key={i} className="border rounded-lg p-3 grid gap-2">
              <input
                placeholder="City"
                className="border rounded px-2 py-1"
                value={m.city}
                onChange={(e) => {
                  const arr = [...body.metro_cities];
                  arr[i] = { ...arr[i], city: e.target.value };
                  set("metro_cities", arr);
                }}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  placeholder="Charge / CN (₹)"
                  className="border rounded px-2 py-1"
                  value={m.charge_per_cn ?? ""}
                  onChange={(e) => {
                    const arr = [...body.metro_cities];
                    arr[i] = { ...arr[i], charge_per_cn: num(e.target.value) };
                    set("metro_cities", arr);
                  }}
                />
                <input
                  placeholder="Notes"
                  className="border rounded px-2 py-1"
                  value={m.notes || ""}
                  onChange={(e) => {
                    const arr = [...body.metro_cities];
                    arr[i] = { ...arr[i], notes: e.target.value };
                    set("metro_cities", arr);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ODA */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">
          Outside Delivery Area (ODA) Charges
        </div>
        <div className="space-y-2">
          {(body.oda as Oda[]).map((r, i) => (
            <div
              key={i}
              className="border rounded-lg p-3 grid md:grid-cols-6 gap-2"
            >
              <input
                placeholder="Type / Label"
                className="border rounded px-2 py-1"
                value={r.oda_label || ""}
                onChange={(e) => {
                  const arr = [...body.oda];
                  arr[i] = { ...arr[i], oda_label: e.target.value };
                  set("oda", arr);
                }}
              />
              <input
                placeholder="Code"
                className="border rounded px-2 py-1"
                value={r.oda_code}
                onChange={(e) => {
                  const arr = [...body.oda];
                  arr[i] = { ...arr[i], oda_code: e.target.value };
                  set("oda", arr);
                }}
              />
              <input
                type="number"
                placeholder="Rate (₹/kg)"
                className="border rounded px-2 py-1"
                value={r.rate_per_kg ?? ""}
                onChange={(e) => {
                  const arr = [...body.oda];
                  arr[i] = { ...arr[i], rate_per_kg: num(e.target.value) };
                  set("oda", arr);
                }}
              />
              <input
                type="number"
                placeholder="Min/CN (₹)"
                className="border rounded px-2 py-1"
                value={r.min_per_cn ?? ""}
                onChange={(e) => {
                  const arr = [...body.oda];
                  arr[i] = { ...arr[i], min_per_cn: num(e.target.value) };
                  set("oda", arr);
                }}
              />
              <input
                type="number"
                placeholder="Max/CN (₹) (optional)"
                className="border rounded px-2 py-1"
                value={r.max_per_cn ?? ""}
                onChange={(e) => {
                  const arr = [...body.oda];
                  const v = e.target.value === "" ? null : num(e.target.value);
                  arr[i] = { ...arr[i], max_per_cn: v };
                  set("oda", arr);
                }}
              />
              <input
                placeholder="Notes"
                className="border rounded px-2 py-1"
                value={r.notes || ""}
                onChange={(e) => {
                  const arr = [...body.oda];
                  arr[i] = { ...arr[i], notes: e.target.value };
                  set("oda", arr);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* INSURANCE */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">Transit Insurance</div>
        <div className="space-y-2">
          {(body.insurance as Insurance[]).map((r, i) => (
            <div
              key={i}
              className="border rounded-lg p-3 grid md:grid-cols-4 gap-2"
            >
              <input
                placeholder="Type"
                className="border rounded px-2 py-1"
                value={r.insurance_type}
                onChange={(e) => {
                  const arr = [...body.insurance];
                  arr[i] = { ...arr[i], insurance_type: e.target.value };
                  set("insurance", arr);
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="% of Invoice"
                className="border rounded px-2 py-1"
                value={r.pct_of_invoice}
                onChange={(e) => {
                  const arr = [...body.insurance];
                  arr[i] = {
                    ...arr[i],
                    pct_of_invoice: Number(e.target.value || 0),
                  };
                  set("insurance", arr);
                }}
              />
              <input
                type="number"
                placeholder="Min/CN (₹)"
                className="border rounded px-2 py-1"
                value={r.min_per_cn}
                onChange={(e) => {
                  const arr = [...body.insurance];
                  arr[i] = { ...arr[i], min_per_cn: num(e.target.value) };
                  set("insurance", arr);
                }}
              />
              <input
                placeholder="Details / Liability"
                className="border rounded px-2 py-1"
                value={r.liability_desc || ""}
                onChange={(e) => {
                  const arr = [...body.insurance];
                  arr[i] = { ...arr[i], liability_desc: e.target.value };
                  set("insurance", arr);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* VAS */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">Pay-per-Use Value Added Services</div>
        <div className="space-y-2">
          {(body.vas as VAS[]).map((v, i) => (
            <div
              key={i}
              className="border rounded-lg p-3 grid md:grid-cols-6 gap-2"
            >
              <input
                placeholder="Service Code"
                className="border rounded px-2 py-1"
                value={v.vas_code}
                onChange={(e) => {
                  const arr = [...body.vas];
                  arr[i] = { ...arr[i], vas_code: e.target.value };
                  set("vas", arr);
                }}
              />
              <select
                className="border rounded px-2 py-1"
                value={v.calc_method}
                onChange={(e) => {
                  const arr = [...body.vas];
                  arr[i] = { ...arr[i], calc_method: e.target.value as any };
                  set("vas", arr);
                }}
              >
                <option value="FLAT">FLAT</option>
                <option value="PCT">PCT</option>
              </select>
              <input
                type="number"
                placeholder="₹/CN (FLAT)"
                className="border rounded px-2 py-1"
                value={v.rate_per_cn ?? ""}
                onChange={(e) => {
                  const arr = [...body.vas];
                  arr[i] = {
                    ...arr[i],
                    rate_per_cn:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("vas", arr);
                }}
              />
              <input
                type="number"
                step="0.01"
                placeholder="% or ₹/kg (PCT)"
                className="border rounded px-2 py-1"
                value={v.rate_per_kg ?? ""}
                onChange={(e) => {
                  const arr = [...body.vas];
                  arr[i] = {
                    ...arr[i],
                    rate_per_kg:
                      e.target.value === "" ? null : Number(e.target.value),
                  };
                  set("vas", arr);
                }}
              />
              <input
                type="number"
                placeholder="Min/CN (₹)"
                className="border rounded px-2 py-1"
                value={v.min_per_cn ?? ""}
                onChange={(e) => {
                  const arr = [...body.vas];
                  arr[i] = {
                    ...arr[i],
                    min_per_cn:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("vas", arr);
                }}
              />
              <input
                type="number"
                placeholder="Max/CN (₹)"
                className="border rounded px-2 py-1"
                value={v.max_per_cn ?? ""}
                onChange={(e) => {
                  const arr = [...body.vas];
                  arr[i] = {
                    ...arr[i],
                    max_per_cn:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("vas", arr);
                }}
              />
              <div className="md:col-span-6">
                <input
                  placeholder="Notes"
                  className="border rounded px-2 py-1 w-full"
                  value={v.notes || ""}
                  onChange={(e) => {
                    const arr = [...body.vas];
                    arr[i] = { ...arr[i], notes: e.target.value };
                    set("vas", arr);
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SPECIAL HANDLING */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">
          Special Handling (per Kg by Weight)
        </div>
        <div className="space-y-2">
          {(body.special_handling as SpecialHandling[]).map((r, i) => (
            <div
              key={i}
              className="border rounded-lg p-3 grid grid-cols-3 gap-2"
            >
              <input
                type="number"
                placeholder="Min Kg"
                className="border rounded px-2 py-1"
                value={r.range_min_kg}
                onChange={(e) => {
                  const arr = [...body.special_handling];
                  arr[i] = { ...arr[i], range_min_kg: num(e.target.value) };
                  set("special_handling", arr);
                }}
              />
              <input
                type="number"
                placeholder="Max Kg (blank for +)"
                className="border rounded px-2 py-1"
                value={r.range_max_kg ?? ""}
                onChange={(e) => {
                  const arr = [...body.special_handling];
                  arr[i] = {
                    ...arr[i],
                    range_max_kg:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("special_handling", arr);
                }}
              />
              <input
                type="number"
                placeholder="₹/kg"
                className="border rounded px-2 py-1"
                value={r.rate_per_kg}
                onChange={(e) => {
                  const arr = [...body.special_handling];
                  arr[i] = { ...arr[i], rate_per_kg: num(e.target.value) };
                  set("special_handling", arr);
                }}
              />
            </div>
          ))}
        </div>

        <div className="mt-3 grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm mb-1">Odd Size Pricing</label>
            <select
              className="w-full border rounded-md px-3 py-2"
              value={body.odd_size_pricing}
              onChange={(e) => set("odd_size_pricing", e.target.value)}
            >
              <option value="ON_ACTUALS">ON_ACTUALS</option>
              <option value="FIXED_SURCHARGE">FIXED_SURCHARGE</option>
              <option value="NOT_APPLICABLE">NOT_APPLICABLE</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Odd Size Len &gt; (ft)</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={body.odd_size_len_ft}
              onChange={(e) => set("odd_size_len_ft", num(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Odd Size Wid &gt; (ft)</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={body.odd_size_wid_ft}
              onChange={(e) => set("odd_size_wid_ft", num(e.target.value))}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Odd Size Ht &gt; (ft)</label>
            <input
              type="number"
              className="w-full border rounded-md px-3 py-2"
              value={body.odd_size_ht_ft}
              onChange={(e) => set("odd_size_ht_ft", num(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* PICKUP CHARGES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">Pickup Related Charges</div>
        <div className="space-y-2">
          {(body.pickup_charges as PickupCharge[]).map((p, i) => (
            <div
              key={i}
              className="border rounded-lg p-3 grid md:grid-cols-4 gap-2"
            >
              <input
                placeholder="Service Code"
                className="border rounded px-2 py-1"
                value={p.service_code}
                onChange={(e) => {
                  const arr = [...body.pickup_charges];
                  arr[i] = { ...arr[i], service_code: e.target.value };
                  set("pickup_charges", arr);
                }}
              />
              <input
                type="number"
                placeholder="Rate (₹/kg) or blank"
                className="border rounded px-2 py-1"
                value={p.rate_per_kg ?? ""}
                onChange={(e) => {
                  const arr = [...body.pickup_charges];
                  arr[i] = {
                    ...arr[i],
                    rate_per_kg:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("pickup_charges", arr);
                }}
              />
              <input
                type="number"
                placeholder="Min / Pickup (₹) or blank"
                className="border rounded px-2 py-1"
                value={p.min_per_pickup ?? ""}
                onChange={(e) => {
                  const arr = [...body.pickup_charges];
                  arr[i] = {
                    ...arr[i],
                    min_per_pickup:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("pickup_charges", arr);
                }}
              />
              <input
                placeholder="Notes"
                className="border rounded px-2 py-1"
                value={p.notes || ""}
                onChange={(e) => {
                  const arr = [...body.pickup_charges];
                  arr[i] = { ...arr[i], notes: e.target.value };
                  set("pickup_charges", arr);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ZONES & TAT */}
      <ZonesTATEditor
        value={body.zones}
        onChange={(rows) => set("zones", rows)}
      />

      {/* REGION SURCHARGES */}
      <section className="bg-white p-6 rounded-xl shadow grid gap-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Region Surcharges</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={() =>
              set("region_surcharges", [
                ...(body.region_surcharges || []),
                {
                  region_name: "",
                  base_relative_to: "",
                  addl_rate_per_kg: null,
                  notes: "",
                },
              ])
            }
          >
            + Add Region
          </button>
        </div>
        <div className="grid gap-3">
          {(body.region_surcharges as RegionSurcharge[]).map((r, i) => (
            <div
              key={i}
              className="grid md:grid-cols-4 gap-2 border rounded p-2"
            >
              <input
                placeholder="Region"
                className="border rounded px-2 py-1"
                value={r.region_name}
                onChange={(e) => {
                  const arr = [...body.region_surcharges];
                  arr[i] = { ...arr[i], region_name: e.target.value };
                  set("region_surcharges", arr);
                }}
              />
              <input
                placeholder="Base relative to"
                className="border rounded px-2 py-1"
                value={r.base_relative_to || ""}
                onChange={(e) => {
                  const arr = [...body.region_surcharges];
                  arr[i] = { ...arr[i], base_relative_to: e.target.value };
                  set("region_surcharges", arr);
                }}
              />
              <input
                type="number"
                placeholder="Δ ₹/kg"
                className="border rounded px-2 py-1"
                value={r.addl_rate_per_kg ?? ""}
                onChange={(e) => {
                  const arr = [...body.region_surcharges];
                  arr[i] = {
                    ...arr[i],
                    addl_rate_per_kg:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("region_surcharges", arr);
                }}
              />
              <input
                placeholder="Notes"
                className="border rounded px-2 py-1"
                value={r.notes || ""}
                onChange={(e) => {
                  const arr = [...body.region_surcharges];
                  arr[i] = { ...arr[i], notes: e.target.value };
                  set("region_surcharges", arr);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* NON-METRO RULES */}
      <section className="bg-white p-6 rounded-xl shadow grid gap-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Non-Metro Rules</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={() =>
              set("non_metro_rules", [
                ...(body.non_metro_rules || []),
                { distance_km_max: null, rate_per_kg: null },
              ])
            }
          >
            + Add Rule
          </button>
        </div>
        <div className="grid gap-3">
          {(body.non_metro_rules as NonMetroRule[]).map((n, i) => (
            <div
              key={i}
              className="grid md:grid-cols-2 gap-2 border rounded p-2"
            >
              <input
                type="number"
                placeholder="Max Distance (km)"
                className="border rounded px-2 py-1"
                value={n.distance_km_max ?? ""}
                onChange={(e) => {
                  const arr = [...body.non_metro_rules];
                  arr[i] = {
                    ...arr[i],
                    distance_km_max:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("non_metro_rules", arr);
                }}
              />
              <input
                type="number"
                placeholder="₹/kg"
                className="border rounded px-2 py-1"
                value={n.rate_per_kg ?? ""}
                onChange={(e) => {
                  const arr = [...body.non_metro_rules];
                  arr[i] = {
                    ...arr[i],
                    rate_per_kg:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("non_metro_rules", arr);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* INCENTIVE SLABS */}
      <section className="bg-white p-6 rounded-xl shadow grid gap-3">
        <div className="flex items-center justify-between">
          <div className="font-medium">Incentive Slabs</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={() =>
              set("incentives", [
                ...(body.incentives || []),
                { tonnage_min: null, tonnage_max: null, discount_pct: null },
              ])
            }
          >
            + Add Slab
          </button>
        </div>
        <div className="grid gap-3">
          {(body.incentives as IncentiveSlab[]).map((s, i) => (
            <div
              key={i}
              className="grid md:grid-cols-3 gap-2 border rounded p-2"
            >
              <input
                type="number"
                placeholder="Tonnage Min (MT)"
                className="border rounded px-2 py-1"
                value={s.tonnage_min ?? ""}
                onChange={(e) => {
                  const arr = [...body.incentives];
                  arr[i] = {
                    ...arr[i],
                    tonnage_min:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("incentives", arr);
                }}
              />
              <input
                type="number"
                placeholder="Tonnage Max (MT)"
                className="border rounded px-2 py-1"
                value={s.tonnage_max ?? ""}
                onChange={(e) => {
                  const arr = [...body.incentives];
                  arr[i] = {
                    ...arr[i],
                    tonnage_max:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("incentives", arr);
                }}
              />
              <input
                type="number"
                placeholder="Discount %"
                className="border rounded px-2 py-1"
                value={s.discount_pct ?? ""}
                onChange={(e) => {
                  const arr = [...body.incentives];
                  arr[i] = {
                    ...arr[i],
                    discount_pct:
                      e.target.value === "" ? null : num(e.target.value),
                  };
                  set("incentives", arr);
                }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ANNEXURES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="flex items-center justify-between mb-2">
          <div className="font-medium">Annexures</div>
          <button
            className="text-sm px-2 py-1 rounded bg-gray-100"
            onClick={() =>
              set("annexures", [
                ...(body.annexures || []),
                { annexure_code: "A", title: "", raw_text: "" },
              ])
            }
          >
            + Add
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {(body.annexures as Annexure[]).map((a: any, i: number) => (
            <div key={i} className="border rounded-lg p-3 grid gap-2">
              <div className="flex gap-2">
                <input
                  placeholder="Code (e.g., A, B, C)"
                  className="border rounded px-2 py-1 w-24"
                  value={a.annexure_code}
                  onChange={(e) => {
                    const arr = [...(body.annexures || [])];
                    arr[i] = { ...arr[i], annexure_code: e.target.value };
                    set("annexures", arr);
                  }}
                />
                <input
                  placeholder="Title"
                  className="border rounded px-2 py-1 flex-1"
                  value={a.title || ""}
                  onChange={(e) => {
                    const arr = [...(body.annexures || [])];
                    arr[i] = { ...arr[i], title: e.target.value };
                    set("annexures", arr);
                  }}
                />
              </div>
              <textarea
                placeholder="Annexure text…"
                rows={6}
                className="border rounded px-2 py-1"
                value={a.raw_text || ""}
                onChange={(e) => {
                  const arr = [...(body.annexures || [])];
                  arr[i] = { ...arr[i], raw_text: e.target.value };
                  set("annexures", arr);
                }}
              />
              {i > 0 && (
                <button
                  className="text-red-600 text-sm text-left"
                  onClick={() => {
                    const arr = [...(body.annexures || [])];
                    arr.splice(i, 1);
                    set("annexures", arr);
                  }}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* LEGAL & CAPACITY */}
      <section className="bg-white p-6 rounded-xl shadow">
        <div className="font-medium mb-2">
          Jurisdiction & Dispute Resolution
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <input
            placeholder="Jurisdiction City"
            className="border rounded px-2 py-1"
            value={body.jurisdiction_city || ""}
            onChange={(e) => set("jurisdiction_city", e.target.value)}
          />
          <input
            placeholder="Arbitration Seat"
            className="border rounded px-2 py-1"
            value={body.arbitration_seat || ""}
            onChange={(e) => set("arbitration_seat", e.target.value)}
          />
          <input
            placeholder="Arbitration Language"
            className="border rounded px-2 py-1"
            value={body.arbitration_language || ""}
            onChange={(e) => set("arbitration_language", e.target.value)}
          />
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-2">
          <input
            type="number"
            placeholder="Termination Notice (days)"
            className="border rounded px-2 py-1"
            value={body.termination_notice_days || ""}
            onChange={(e) =>
              set("termination_notice_days", num(e.target.value))
            }
          />
          <input
            type="number"
            placeholder="Non-compete Cooling (months)"
            className="border rounded px-2 py-1"
            value={body.non_compete_cooling_months || ""}
            onChange={(e) =>
              set("non_compete_cooling_months", num(e.target.value))
            }
          />
        </div>

        <div className="font-medium mt-6 mb-2">Capacity Bookings</div>
        <div className="grid md:grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Booking Day of Month"
            className="border rounded px-2 py-1"
            value={body.capacity_booking_day_of_month || ""}
            onChange={(e) =>
              set("capacity_booking_day_of_month", num(e.target.value))
            }
          />
          <input
            type="number"
            placeholder="Additional Notice (days)"
            className="border rounded px-2 py-1"
            value={body.capacity_additional_notice_days || ""}
            onChange={(e) =>
              set("capacity_additional_notice_days", num(e.target.value))
            }
          />
        </div>
      </section>

      {/* NOTES */}
      <section className="bg-white p-6 rounded-xl shadow">
        <label className="block text-sm mb-1">Notes</label>
        <textarea
          className="w-full border rounded-md px-3 py-2"
          rows={3}
          value={body.notes || ""}
          onChange={(e) => set("notes", e.target.value)}
        />
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
