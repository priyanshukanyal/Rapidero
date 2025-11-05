// src/modules/contracts/templates/contract.html.ts

export interface ContractViewModel {
  contract: any;
  client: any;

  // master data
  volumetric_bases?: any[];

  // parties & charges
  parties?: any[];
  oda?: any[];
  vas?: any[];
  insurance?: any[];
  incentives?: any[];
  rateMatrix?: any[];

  // accessorials
  metro_cities?: any[];
  special_handling?: any[];
  pickup_charges?: any[];
  zone_rates?: any[];

  // more terms
  non_metro_rules?: any[];
  region?: any[]; // legacy key
  region_surcharges?: any[]; // current key
  annexures?: any[];
}

export function renderContractHTML(vm: ContractViewModel): string {
  const c = vm.contract || {};
  const cli = vm.client || {};

  const fmt = (v: any) => (v == null ? "" : String(v));
  const money = (v: any) =>
    v == null || v === "" || isNaN(Number(v))
      ? ""
      : `₹${Number(v).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

  // If all metro cities share the same charge_per_cn, show in header; else omit from header
  const metroUniformCharge = (() => {
    const arr = vm.metro_cities ?? [];
    if (!arr.length) return null;
    const charges = arr
      .map((x: any) => x?.charge_per_cn)
      .filter((x: any) => x != null);
    if (charges.length !== arr.length) return null;
    const first = Number(charges[0]);
    return charges.every((x: any) => Number(x) === first) ? first : null;
  })();

  // ------------------------------- Sections --------------------------------

  // Parties (KYC + contact)
  const partiesRows = (vm.parties ?? [])
    .map((p: any) => {
      const addr = [
        fmt(p.address_line1),
        p.address_line2 ? fmt(p.address_line2) : "",
        [fmt(p.city), fmt(p.state)].filter(Boolean).join(", "),
        fmt(p.postcode),
        fmt(p.district),
      ]
        .filter(Boolean)
        .join(", ");

      const kyc = [
        p.cin ? `CIN: ${fmt(p.cin)}` : "",
        p.pan ? `PAN: ${fmt(p.pan)}` : "",
        p.gstin ? `GSTIN: ${fmt(p.gstin)}` : "",
        p.tan ? `TAN: ${fmt(p.tan)}` : "",
      ]
        .filter(Boolean)
        .join(" • ");

      const contact = [p.contact_person, p.email, p.phone]
        .filter(Boolean)
        .map(fmt)
        .join(" / ");

      return `
        <tr>
          <td>${fmt(p.party_role)}</td>
          <td><b>${fmt(p.legal_name)}</b>${
        p.brand_name ? `<div class="meta">${fmt(p.brand_name)}</div>` : ""
      }</td>
          <td>${addr || ""}</td>
          <td>${kyc || ""}</td>
          <td>${contact || ""}</td>
        </tr>`;
    })
    .join("");

  // Volumetric basis summary
  const vbasis = (vm.volumetric_bases ?? [])
    .map(
      (b: any) =>
        b.basis_text || (b.cft_base ? `1 CFT = ${fmt(b.cft_base)} Kg` : "")
    )
    .filter(Boolean)
    .join(", ");

  const insuranceRows = (vm.insurance ?? [])
    .map(
      (r: any) => `
        <tr>
          <td>${fmt(r.insurance_type)}</td>
          <td>${
            r.pct_of_invoice != null ? fmt(r.pct_of_invoice) + "%" : ""
          }</td>
          <td>${money(r.min_per_cn)}</td>
          <td>${fmt(r.liability_desc)}</td>
        </tr>`
    )
    .join("");

  const metroRows = (vm.metro_cities ?? [])
    .map(
      (m: any) => `
        <tr>
          <td>${fmt(m.city)}</td>
          <td>${m.charge_per_cn != null ? money(m.charge_per_cn) : ""}</td>
          <td>${fmt(m.notes) || ""}</td>
        </tr>`
    )
    .join("");

  const odaRows = (vm.oda ?? [])
    .map(
      (o: any) => `
        <tr>
          <td>${fmt(o.oda_label || o.oda_code)}</td>
          <td>${fmt(o.oda_code)}</td>
          <td>${money(o.rate_per_kg)}/kg</td>
          <td>${money(o.min_per_cn)}</td>
          <td>${o.max_per_cn != null ? money(o.max_per_cn) : ""}</td>
          <td>${fmt(o.notes) || ""}</td>
        </tr>`
    )
    .join("");

  const vasRows = (vm.vas ?? [])
    .map(
      (v: any) => `
        <tr>
          <td>${fmt(v.vas_code)}</td>
          <td>${fmt(v.calc_method) || ""}</td>
          <td>${v.rate_per_kg != null ? money(v.rate_per_kg) : ""}</td>
          <td>${v.rate_per_cn != null ? money(v.rate_per_cn) : ""}</td>
          <td>${v.min_per_cn != null ? money(v.min_per_cn) : ""}</td>
          <td>${v.max_per_cn != null ? money(v.max_per_cn) : ""}</td>
          <td>${fmt(v.notes) || ""}</td>
        </tr>`
    )
    .join("");

  const shRows = (vm.special_handling ?? [])
    .map(
      (r: any) => `
        <tr>
          <td>${fmt(r.range_min_kg)} ${
        r.range_max_kg != null ? "– " + fmt(r.range_max_kg) : "+"
      } kg</td>
          <td>${money(r.rate_per_kg)}/kg</td>
        </tr>`
    )
    .join("");

  const pickupRows = (vm.pickup_charges ?? [])
    .map(
      (p: any) => `
        <tr>
          <td>${fmt(p.service_code)}</td>
          <td>${
            p.rate_per_kg != null ? money(p.rate_per_kg) + "/kg" : "On Actuals"
          }</td>
          <td>${p.min_per_pickup != null ? money(p.min_per_pickup) : ""}</td>
          <td>${fmt(p.notes) || ""}</td>
        </tr>`
    )
    .join("");

  const zoneRows = (vm.zone_rates ?? [])
    .map(
      (z: any) => `
        <tr>
          <td>${fmt(z.zone_name)}</td>
          <td>${money(z.rate_per_kg)}/kg</td>
          <td>${fmt(z.tat_days)} days</td>
          <td>${money(z.min_cn_rs)}</td>
          <td>${fmt(z.coverage_areas) || ""}</td>
        </tr>`
    )
    .join("");

  const regionList = vm.region ?? vm.region_surcharges ?? [];
  const regionRows = regionList
    .map(
      (r: any) => `
        <tr>
          <td>${fmt(r.region_name)}</td>
          <td>${fmt(r.base_relative_to) || ""}</td>
          <td>${money(r.addl_rate_per_kg)}/kg</td>
          <td>${fmt(r.notes) || "—"}</td>
        </tr>`
    )
    .join("");

  const nonMetroRows = (vm.non_metro_rules ?? [])
    .map(
      (n: any) => `
        <tr>
          <td>${fmt(n.distance_km_max)} km</td>
          <td>${money(n.rate_per_kg)}/kg</td>
        </tr>`
    )
    .join("");

  const incentiveRows = (vm.incentives ?? [])
    .map(
      (s: any) => `
        <tr>
          <td>${fmt(s.tonnage_min)}</td>
          <td>${s.tonnage_max != null ? fmt(s.tonnage_max) : ""}</td>
          <td>${fmt(s.discount_pct)}%</td>
        </tr>`
    )
    .join("");

  const annexRows = (vm.annexures ?? [])
    .map(
      (a: any) => `
        <tr>
          <td>${fmt(a.annexure_code)}</td>
          <td>${fmt(a.title)}</td>
          <td>${fmt(a.raw_text)}</td>
        </tr>`
    )
    .join("");

  const rateRows = (vm.rateMatrix ?? [])
    .map(
      (r: any) => `
        <tr>
          <td>${fmt(r.origin_city)}</td>
          <td>${fmt(r.dest_city)}</td>
          <td>${fmt(r.cft_base)}</td>
          <td>${money(r.base_rate_rs)}</td>
          <td>${fmt(r.currency)}</td>
        </tr>`
    )
    .join("");

  // --------------------------------- HTML ----------------------------------

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Contract ${fmt(c.contract_code)}</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color:#111; font-size:12px; }
    h1 { margin:0 0 6px 0; font-size:18px; }
    h2 { margin:18px 0 6px 0; font-size:14px; border-bottom:1px solid #ccc; padding-bottom:4px; }
    .meta, small { color:#666; }
    table { width:100%; border-collapse: collapse; margin: 8px 0; }
    th, td { border:1px solid #ddd; padding:6px; vertical-align: top; }
    th { background:#f6f6f6; text-align:left; }
    .kv { margin: 4px 0; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap:8px; }
    .pre { white-space: pre-wrap; }
  </style>
</head>
<body>
  <h1>Service Agreement</h1>

  <!-- High-level header -->
  <div class="meta">
    <div class="kv"><b>Contract Code:</b> ${fmt(
      c.contract_code
    )} &nbsp; <b>Type:</b> ${fmt(c.contract_type)}</div>
    <div class="kv"><b>Purpose:</b> ${fmt(c.purpose) || "—"}</div>
    <div class="kv"><b>Client:</b> ${fmt(
      cli.client_name
    )} &nbsp; <b>Agreement Date:</b> ${fmt(c.agreement_date)}</div>
    <div class="kv"><b>Term:</b> ${fmt(c.term_start)} → ${fmt(c.term_end)} (${
    fmt(c.term_months) || ""
  } months)</div>
    <div class="kv"><b>Agreement Place:</b> ${
      fmt(c.agreement_place) || "—"
    } &nbsp; <b>Territory:</b> ${fmt(c.territory_desc) || "—"}</div>
    <div class="kv"><b>Payment Terms:</b> ${fmt(
      c.payment_terms_days
    )} Days &nbsp; <b>Settlement:</b> ${fmt(c.settlement_frequency)}</div>
    <div class="kv"><b>GST:</b> ${fmt(
      c.taxes_gst_pct
    )}% &nbsp; <b>Fuel Surcharge:</b> ${fmt(c.fuel_base_pct)}% (Base ₹${fmt(
    c.fuel_diesel_base_price
  )}/L, +${fmt(c.fuel_slope_pct_per_1pct)}% per +1%)</div>
    <div class="kv"><b>Volumetric Basis:</b> ${
      vbasis || "—"
    } &nbsp; <b>Charging:</b> ${fmt(c.charging_mechanism)} (${fmt(
    c.rounding_rule
  )})</div>
    <div class="kv"><b>Min Weight/CN:</b> ${fmt(
      c.min_chargeable_weight_kg
    )} kg &nbsp; <b>Min Freight/CN:</b> ${money(
    c.min_chargeable_freight_rs
  )}</div>
    <div class="kv"><b>CN Charge:</b> ${money(
      c.cn_charge_per_cn
    )} &nbsp; <b>Docket Charge:</b> ${money(c.docket_charge_per_cn)}${
    metroUniformCharge != null
      ? ` &nbsp; <b>Metro Congestion/CN:</b> ${money(metroUniformCharge)}`
      : ""
  }</div>
    <div class="kv"><b>Price Floor:</b> ${
      c.price_floor_enabled ? "Enabled" : "Disabled"
    } &nbsp; <b>Price Ceiling:</b> ${
    c.price_ceiling_enabled ? "Enabled" : "Disabled"
  }</div>
    <div class="kv"><b>Prepayment Required:</b> ${
      c.prepayment_required ? "Yes" : "No"
    } &nbsp; <b>OPA:</b> ${c.opa_excluded ? "Excluded" : "As per actuals"}</div>
  </div>

  <!-- Legal & dispute -->
  <h2>Jurisdiction & Dispute Resolution</h2>
  <div class="grid">
    <div class="kv"><b>Jurisdiction City:</b> ${
      fmt(c.jurisdiction_city) || "—"
    }</div>
    <div class="kv"><b>Arbitration Seat:</b> ${
      fmt(c.arbitration_seat) || "—"
    }</div>
    <div class="kv"><b>Arbitration Language:</b> ${
      fmt(c.arbitration_language) || "—"
    }</div>
    <div class="kv"><b>Termination Notice (days):</b> ${
      fmt(c.termination_notice_days) || "—"
    }</div>
    <div class="kv"><b>Non-compete Cooling (months):</b> ${
      fmt(c.non_compete_cooling_months) || "—"
    }</div>
  </div>

  <!-- Capacity -->
  <h2>Capacity Bookings</h2>
  <div class="grid">
    <div class="kv"><b>Booking Day of Month:</b> ${
      fmt(c.capacity_booking_day_of_month) || "—"
    }</div>
    <div class="kv"><b>Additional Notice (days):</b> ${
      fmt(c.capacity_additional_notice_days) || "—"
    }</div>
  </div>

  <!-- Client KYC (if present on client row) -->
  <h2>Client KYC</h2>
  <div class="grid">
    <div class="kv"><b>Client Code:</b> ${fmt(cli.client_code) || "—"}</div>
    <div class="kv"><b>Email:</b> ${fmt(cli.email) || "—"}</div>
    <div class="kv"><b>CIN:</b> ${fmt(cli.cin) || "—"}</div>
    <div class="kv"><b>PAN:</b> ${fmt(cli.pan) || "—"}</div>
    <div class="kv"><b>GSTIN:</b> ${fmt(cli.gstin) || "—"}</div>
    <div class="kv"><b>TAN:</b> ${fmt(cli.tan) || "—"}</div>
  </div>

  <!-- Parties -->
  <h2>Party Details</h2>
  <table>
    <thead>
      <tr><th>Role</th><th>Legal/Brand</th><th>Address</th><th>KYC</th><th>Contact</th></tr>
    </thead>
    <tbody>${partiesRows || '<tr><td colspan="5"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Insurance -->
  <h2>Transit Insurance</h2>
  <table>
    <thead><tr><th>Type</th><th>% of Invoice</th><th>Min/CN</th><th>Liability</th></tr></thead>
    <tbody>${
      insuranceRows || '<tr><td colspan="4"><i>None</i></td></tr>'
    }</tbody>
  </table>

  <!-- Metro -->
  <h2>Metro Congestion Charges</h2>
  <table>
    <thead><tr><th>City</th><th>Charge/CN</th><th>Notes</th></tr></thead>
    <tbody>${metroRows || '<tr><td colspan="3"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- ODA -->
  <h2>Outside Delivery Area (ODA) Charges</h2>
  <table>
    <thead><tr><th>Label</th><th>Code</th><th>₹/kg</th><th>Min/CN</th><th>Max/CN</th><th>Notes</th></tr></thead>
    <tbody>${odaRows || '<tr><td colspan="6"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- VAS -->
  <h2>Value-Added Services (Pay-per-Use)</h2>
  <table>
    <thead><tr><th>VAS Code</th><th>Method</th><th>₹/kg</th><th>₹/CN</th><th>Min</th><th>Max</th><th>Notes</th></tr></thead>
    <tbody>${vasRows || '<tr><td colspan="7"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Special Handling -->
  <h2>Special Handling (per Kg)</h2>
  <table>
    <thead><tr><th>Weight Band</th><th>Rate</th></tr></thead>
    <tbody>${shRows || '<tr><td colspan="2"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Odd-size -->
  <div class="kv"><b>Odd Size Shipments:</b> ${
    fmt(c.odd_size_pricing) || "On Actuals"
  }
    (Thresholds: L>${fmt(c.odd_size_len_ft) || 6}ft, W>${
    fmt(c.odd_size_wid_ft) || 5
  }ft, H>${fmt(c.odd_size_ht_ft) || 5}ft)
  </div>

  <!-- Pickup -->
  <h2>Pickup Related Charges</h2>
  <table>
    <thead><tr><th>Service</th><th>Rate</th><th>Min/Pickup</th><th>Notes</th></tr></thead>
    <tbody>${pickupRows || '<tr><td colspan="4"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Zone -->
  <h2>Zone Rates & TAT</h2>
  <table>
    <thead><tr><th>Zone</th><th>₹/kg</th><th>TAT</th><th>Min/CN</th><th>Coverage Areas</th></tr></thead>
    <tbody>${zoneRows || '<tr><td colspan="5"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Region -->
  <h2>Region Surcharges</h2>
  <table>
    <thead><tr><th>Region</th><th>Base Relative To</th><th>Δ ₹/kg</th><th>Notes</th></tr></thead>
    <tbody>${regionRows || '<tr><td colspan="4"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Non-metro -->
  <h2>Non-Metro Rules</h2>
  <table>
    <thead><tr><th>Max Distance</th><th>₹/kg</th></tr></thead>
    <tbody>${
      nonMetroRows || '<tr><td colspan="2"><i>None</i></td></tr>'
    }</tbody>
  </table>

  <!-- Incentives -->
  <h2>Incentive Slabs</h2>
  <table>
    <thead><tr><th>Tonnage Min</th><th>Tonnage Max</th><th>Discount %</th></tr></thead>
    <tbody>${
      incentiveRows || '<tr><td colspan="3"><i>None</i></td></tr>'
    }</tbody>
  </table>

  <!-- Annexures -->
  <h2>Annexures</h2>
  <table>
    <thead><tr><th>Code</th><th>Title</th><th>Text</th></tr></thead>
    <tbody>${annexRows || '<tr><td colspan="3"><i>None</i></td></tr>'}</tbody>
  </table>

  <!-- Optional rate matrix -->
  ${
    rateRows
      ? `<h2>Additional Rate Matrix</h2>
  <table>
    <thead><tr><th>Origin</th><th>Destination</th><th>CFT Base</th><th>Base Rate (₹)</th><th>Currency</th></tr></thead>
    <tbody>${rateRows}</tbody>
  </table>`
      : ""
  }

  <!-- Notes -->
  <h2>Notes</h2>
  <div class="pre">${fmt(c.notes) || "—"}</div>

  <br/><br/>
  <table style="border:0;">
    <tr>
      <td style="border:0; width:50%">
        <div class="meta">Client Signature</div>
        <div>${fmt(cli.client_name) || ""}</div>
        <div>Date: ___________</div>
      </td>
      <td style="border:0; width:50%">
        <div class="meta">Rapidero Logistics Representative</div>
        <div>Date: ___________</div>
      </td>
    </tr>
  </table>

  <div class="meta" style="margin-top:8px;">Generated by Rapidero Logistics Contract Engine</div>
</body>
</html>`;
}
