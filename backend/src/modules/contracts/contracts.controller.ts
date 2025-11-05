// src/modules/contracts/contracts.controller.ts
import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { htmlToPdfBuffer } from "../../utils/pdf.js";
import { uploadPdfBuffer } from "../../utils/azureBlob.js";
import { sendMail } from "../../utils/mailer.js";
import { renderContractHTML } from "./templates/contract.html.js";
import { randomUUID } from "crypto";

/* -------------------------------------------------------------------------- */
/*                               Helper Functions                             */
/* -------------------------------------------------------------------------- */

function ensureClientBound(req: Request) {
  const u: any = (req as any).user;
  if (u?.roles?.includes("CLIENT")) {
    if (!u.client_id) {
      const err: any = new Error(
        "Your account is not linked to a client. Contact support."
      );
      err.status = 409;
      throw err;
    }
  }
  return u;
}

const ALLOWED_PARTY_ROLES = new Set(["COMPANY", "CLIENT", "OTHER"]);
const normalizePartyRole = (x: any) => {
  const v = String(x ?? "")
    .toUpperCase()
    .trim();
  return ALLOWED_PARTY_ROLES.has(v) ? v : "OTHER";
};

const nOr = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const sOr = (v: any, d: string | null = null) => {
  const s = v == null ? "" : String(v);
  const t = s.trim();
  return t.length ? t : d;
};

/** Basic normalizers for IDs */
const normUP = (s?: string | null) => (s ? s.trim().toUpperCase() : null);
const normPAN = (s?: string | null) =>
  s ? s.trim().toUpperCase().replace(/\s+/g, "") : null;
const normGST = (s?: string | null) =>
  s ? s.trim().toUpperCase().replace(/\s+/g, "") : null;
const normTAN = (s?: string | null) =>
  s ? s.trim().toUpperCase().replace(/\s+/g, "") : null;
const normCIN = (s?: string | null) =>
  s ? s.trim().toUpperCase().replace(/\s+/g, "") : null;

/** Read ENUM allowed values for a table.column from information_schema */
async function getEnumAllowedValues(
  conn: any,
  tableName: string,
  columnName: string
): Promise<string[]> {
  const [rows]: any = await conn.query(
    `SELECT COLUMN_TYPE
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  const ct: string | undefined = rows?.[0]?.COLUMN_TYPE; // e.g., enum('A','B','C')
  if (!ct || !ct.toLowerCase().startsWith("enum(")) return [];
  const inner = ct.slice(ct.indexOf("(") + 1, ct.lastIndexOf(")"));
  return inner
    .split(/,(?=(?:[^']*'[^']*')*[^']*$)/g)
    .map((x) => x.trim().replace(/^'/, "").replace(/'$/, ""));
}

/** Coerce incoming value to ENUM set (case-insensitive). Fallback to first if no match */
function coerceToEnum(value: any, allowed: string[]): string {
  if (!allowed?.length) return String(value ?? "");
  const incoming = String(value ?? "").trim();
  if (!incoming) return allowed[0];
  if (allowed.includes(incoming)) return incoming;
  const found = allowed.find((a) => a.toLowerCase() === incoming.toLowerCase());
  return found ?? allowed[0];
}

/** get set of existing columns for a table */
async function getTableColumns(
  conn: any,
  tableName: string
): Promise<Set<string>> {
  const [rows]: any = await conn.query(
    `SELECT COLUMN_NAME
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?`,
    [tableName]
  );
  return new Set((rows || []).map((r: any) => r.COLUMN_NAME));
}

async function tableHasColumn(
  conn: any,
  tableName: string,
  columnName: string
) {
  const cols = await getTableColumns(conn, tableName);
  return cols.has(columnName);
}

/** charging mechanism/odd-size normalization to likely enum spellings */
function normalizeCharging(x: any) {
  const raw = String(x ?? "")
    .toUpperCase()
    .trim();
  const map: Record<string, string> = {
    HIGHER_OF_ACTUAL_OR_VOL: "HIGHER_OF_ACTUAL_OR_VOLUMETRIC",
    VOLUMETRIC_ONLY: "VOLUMETRIC_WEIGHT_ONLY",
  };
  return map[raw] || raw || "HIGHER_OF_ACTUAL_OR_VOLUMETRIC";
}
function normalizeOddPricing(x: any) {
  const raw = String(x ?? "")
    .toUpperCase()
    .replace(/\s+/g, "_");
  const map: Record<string, string> = {
    ON_ACTUALS: "ON_ACTUALS",
    ON_ACTUAL: "ON_ACTUALS",
    "ON_ACTUALS.": "ON_ACTUALS",
  };
  return map[raw] || "ON_ACTUALS";
}

/** Build a view-model to render the contract (post-commit) */
async function loadContractVM(contractId: string) {
  const [[contract]]: any = await pool.query(
    `SELECT * FROM contracts WHERE id=?`,
    [contractId]
  );
  if (!contract) throw new Error("Contract not found after insert");

  const [[client]]: any = await pool.query(`SELECT * FROM clients WHERE id=?`, [
    contract.client_id,
  ]);

  const [volumetric_bases]: any = await pool.query(
    `SELECT * FROM contract_volumetric_bases WHERE contract_id=?`,
    [contractId]
  );
  const [parties]: any = await pool.query(
    `SELECT * FROM contract_parties WHERE contract_id=?`,
    [contractId]
  );
  const [oda]: any = await pool.query(
    `SELECT * FROM contract_oda_charges WHERE contract_id=?`,
    [contractId]
  );
  const [non_metro_rules]: any = await pool.query(
    `SELECT * FROM contract_non_metro_rules WHERE contract_id=?`,
    [contractId]
  );
  const [region]: any = await pool.query(
    `SELECT * FROM contract_region_surcharges WHERE contract_id=?`,
    [contractId]
  );
  const [vas]: any = await pool.query(
    `SELECT * FROM contract_vas_charges WHERE contract_id=?`,
    [contractId]
  );
  const [insurance]: any = await pool.query(
    `SELECT * FROM contract_insurance_rules WHERE contract_id=?`,
    [contractId]
  );
  const [incentives]: any = await pool.query(
    `SELECT * FROM contract_incentive_slabs WHERE contract_id=?`,
    [contractId]
  );
  const [rateMatrix]: any = await pool.query(
    `SELECT * FROM contract_rate_matrix WHERE contract_id=?`,
    [contractId]
  );

  // NEW collections
  const [metro_cities]: any = await pool.query(
    `SELECT * FROM contract_metro_congestion_cities WHERE contract_id=?`,
    [contractId]
  );
  const [special_handling]: any = await pool.query(
    `SELECT * FROM contract_special_handling_charges WHERE contract_id=?`,
    [contractId]
  );
  const [pickup_charges]: any = await pool.query(
    `SELECT * FROM contract_pickup_charges WHERE contract_id=?`,
    [contractId]
  );
  const [zone_rates]: any = await pool.query(
    `SELECT * FROM contract_zone_rates WHERE contract_id=?`,
    [contractId]
  );

  return {
    contract,
    client,
    volumetric_bases,
    parties,
    oda,
    non_metro_rules,
    region,
    vas,
    insurance,
    incentives,
    rateMatrix,
    metro_cities,
    special_handling,
    pickup_charges,
    zone_rates,
  };
}

function isValidHttpUrl(u?: string | null): u is string {
  if (!u || typeof u !== "string") return false;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/** choose email recipient: primary contact -> client email -> null */
async function findClientRecipient(clientId: string) {
  try {
    const [[primary]]: any = await pool.query(
      `SELECT email, name FROM client_contacts WHERE client_id=? AND is_primary=1 LIMIT 1`,
      [clientId]
    );
    if (primary?.email) return { to: primary.email, name: primary.name ?? "" };
  } catch {}
  const [[c]]: any = await pool.query(
    `SELECT email, client_name FROM clients WHERE id=?`,
    [clientId]
  );
  if (c?.email) return { to: c.email, name: c.client_name ?? "" };
  return null;
}

/** Coerce flexible numbers like "6,000", " ₹1,200 ", "125.50" -> number | null */
function numOrNull(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  // remove commas, currency symbols, extra spaces
  const cleaned = s.replace(/[,\s₹$]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Shorthand for integer fields (keeps null if not parseable) */
function intOrNull(v: any): number | null {
  const n = numOrNull(v);
  return n == null ? null : Math.trunc(n);
}

/** Prefer the first non-empty string among aliases */
function sFirst(...vals: any[]): string | null {
  for (const v of vals) {
    const t = sOr(v, null);
    if (t) return t;
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*                                  Handlers                                  */
/* -------------------------------------------------------------------------- */

export const listContracts = asyncHandler(
  async (req: Request, res: Response) => {
    const u: any = ensureClientBound(req);

    const args: any[] = [];
    let sql =
      "SELECT id, client_id, contract_code, agreement_date, term_start, term_end, taxes_gst_pct FROM contracts";

    if (u?.roles?.includes("CLIENT")) {
      sql += " WHERE client_id=?";
      args.push(u.client_id);
    } else if (req.query.client_id) {
      sql += " WHERE client_id=?";
      args.push(req.query.client_id);
    }

    sql += " ORDER BY created_at DESC LIMIT 200";
    const [rows]: any = await pool.query(sql, args);
    res.json(rows);
  }
);

export const getContract = asyncHandler(async (req: Request, res: Response) => {
  const u: any = ensureClientBound(req);
  const { id } = req.params;

  const [[c]]: any = await pool.query(`SELECT * FROM contracts WHERE id=?`, [
    id,
  ]);
  if (!c) return res.status(404).json({ error: "Not found" });

  if (u?.roles?.includes("CLIENT") && c.client_id !== u.client_id) {
    return res.status(403).json({ error: "Forbidden" });
  }

  const [vol]: any = await pool.query(
    `SELECT cft_base, basis_text FROM contract_volumetric_bases WHERE contract_id=?`,
    [id]
  );
  const [party]: any = await pool.query(
    `SELECT party_role,legal_name,brand_name,cin,pan,gstin,tan,address_line1,address_line2,city,district,state,postcode,phone,contact_person,email
       FROM contract_parties WHERE contract_id=?`,
    [id]
  );
  const [oda]: any = await pool.query(
    `SELECT oda_code,oda_label,rate_per_kg,min_per_cn,max_per_cn,notes FROM contract_oda_charges WHERE contract_id=?`,
    [id]
  );
  const [nm]: any = await pool.query(
    `SELECT distance_km_max,rate_per_kg FROM contract_non_metro_rules WHERE contract_id=?`,
    [id]
  );
  const [reg]: any = await pool.query(
    `SELECT region_name,base_relative_to,addl_rate_per_kg,notes FROM contract_region_surcharges WHERE contract_id=?`,
    [id]
  );
  const [vas]: any = await pool.query(
    `SELECT vas_code,calc_method,rate_per_kg,rate_per_cn,min_per_cn,max_per_cn,multiplier,extra_per_cn,free_hours,floor_start,city_scope,notes
       FROM contract_vas_charges WHERE contract_id=?`,
    [id]
  );
  const [ins]: any = await pool.query(
    `SELECT insurance_type,pct_of_invoice,min_per_cn,liability_desc FROM contract_insurance_rules WHERE contract_id=?`,
    [id]
  );
  const [inc]: any = await pool.query(
    `SELECT tonnage_min,tonnage_max,discount_pct FROM contract_incentive_slabs WHERE contract_id=?`,
    [id]
  );
  const [ann]: any = await pool.query(
    `SELECT annexure_code,title,raw_text FROM contract_annexures WHERE contract_id=?`,
    [id]
  );
  const [metro]: any = await pool.query(
    `SELECT city, charge_per_cn, notes FROM contract_metro_congestion_cities WHERE contract_id=?`,
    [id]
  );
  const [sh]: any = await pool.query(
    `SELECT range_min_kg, range_max_kg, rate_per_kg FROM contract_special_handling_charges WHERE contract_id=?`,
    [id]
  );
  const [pickup]: any = await pool.query(
    `SELECT service_code, rate_per_kg, min_per_pickup, notes FROM contract_pickup_charges WHERE contract_id=?`,
    [id]
  );
  const [zones]: any = await pool.query(
    `SELECT * FROM contract_zone_rates WHERE contract_id=?`,
    [id]
  );
  const [rateMatrix]: any = await pool.query(
    `SELECT origin_city,origin_pincode,dest_city,dest_pincode,cft_base,base_rate_rs,currency
       FROM contract_rate_matrix WHERE contract_id=?`,
    [id]
  );

  res.json({
    ...c,
    volumetric_bases: vol,
    parties: party,
    oda_rules: oda,
    non_metro_rules: nm,
    region_surcharges: reg,
    vas_charges: vas,
    insurance_rules: ins,
    incentive_slabs: inc,
    annexures: ann,
    metro_congestion_cities: metro,
    special_handling: sh,
    pickup_charges: pickup,
    zone_rates: zones,
    rate_matrix: rateMatrix,
  });
});

export const createContract = asyncHandler(
  async (req: Request, res: Response) => {
    const b = req.body || {};
    if (!b.client_id || !b.contract_code) {
      return res
        .status(400)
        .json({ error: "client_id & contract_code required" });
    }

    const conn = await pool.getConnection();
    const contractId = randomUUID();

    try {
      await conn.beginTransaction();

      // --- ENUM coercions (avoid truncation) ---
      const chargingAllowed = await getEnumAllowedValues(
        conn,
        "contracts",
        "charging_mechanism"
      );
      const roundingAllowed = await getEnumAllowedValues(
        conn,
        "contracts",
        "rounding_rule"
      );
      const oddSizeAllowed = await getEnumAllowedValues(
        conn,
        "contracts",
        "odd_size_pricing"
      );
      const contractTypeAllowed = await getEnumAllowedValues(
        conn,
        "contracts",
        "contract_type"
      );
      const settleAllowed = await getEnumAllowedValues(
        conn,
        "contracts",
        "settlement_frequency"
      );

      const charging_mechanism = chargingAllowed.length
        ? coerceToEnum(normalizeCharging(b.charging_mechanism), chargingAllowed)
        : normalizeCharging(b.charging_mechanism);

      const rounding_rule = roundingAllowed.length
        ? coerceToEnum(b.rounding_rule || "ROUND_UP", roundingAllowed)
        : b.rounding_rule || "ROUND_UP";

      const odd_size_pricing = oddSizeAllowed.length
        ? coerceToEnum(normalizeOddPricing(b.odd_size_pricing), oddSizeAllowed)
        : normalizeOddPricing(b.odd_size_pricing) || "ON_ACTUALS";

      const contract_type = contractTypeAllowed.length
        ? coerceToEnum(b.contract_type || "GENERAL", contractTypeAllowed)
        : b.contract_type || "GENERAL";

      const settlement_frequency = settleAllowed.length
        ? coerceToEnum(b.settlement_frequency || "MONTHLY", settleAllowed)
        : b.settlement_frequency || "MONTHLY";

      // --------------------- Parent INSERT ---------------------
      const parentCols = [
        "id",
        "client_id",
        "contract_code",
        "purpose",
        "agreement_date",
        "agreement_place",
        "term_months",
        "term_start",
        "term_end",
        "territory_desc",
        "termination_notice_days",
        "non_compete_cooling_months",
        "jurisdiction_city",
        "arbitration_seat",
        "arbitration_language",
        "prepayment_required",
        "capacity_booking_day_of_month",
        "capacity_additional_notice_days",
        "settlement_frequency",
        "price_floor_enabled",
        "price_ceiling_enabled",
        "taxes_gst_pct",
        "metro_congestion_charge_per_cn",
        "cn_charge_per_cn",
        "docket_charge_per_cn",
        "min_chargeable_weight_kg",
        "min_chargeable_freight_rs",
        "fuel_base_pct",
        "fuel_diesel_base_price",
        "fuel_slope_pct_per_1pct",
        "contract_type",
        "payment_terms_days",
        "charging_mechanism",
        "rounding_rule",
        "opa_excluded",
        "odd_size_len_ft",
        "odd_size_wid_ft",
        "odd_size_ht_ft",
        "odd_size_pricing",
      ];
      const parentVals = [
        contractId,
        b.client_id,
        b.contract_code,
        sOr(b.purpose, null),
        sOr(b.agreement_date ?? b.start_date, null),
        sOr(b.agreement_place, null),
        b.term_months ?? null,
        sOr(b.term_start ?? b.start_date, null),
        sOr(b.term_end ?? b.end_date, null),
        sOr(b.territory_desc, null),
        nOr(b.termination_notice_days ?? 30, 30),
        nOr(b.non_compete_cooling_months ?? 12, 12),
        sOr(b.jurisdiction_city, null),
        sOr(b.arbitration_seat, null),
        sOr(b.arbitration_language, null),
        b.prepayment_required ? 1 : 0,
        b.capacity_booking_day_of_month ?? null,
        b.capacity_additional_notice_days ?? null,
        settlement_frequency,
        b.price_floor_enabled ? 1 : 0,
        b.price_ceiling_enabled ? 1 : 0,
        nOr(b.taxes_gst_pct ?? 18, 18),
        nOr(b.metro_congestion_charge_per_cn ?? 0, 0),
        nOr(b.cn_charge_per_cn ?? 0, 0),
        nOr(b.docket_charge_per_cn ?? 0, 0),
        nOr(b.min_chargeable_weight_kg ?? 20, 20),
        nOr(b.min_chargeable_freight_rs ?? b.min_charge ?? 0, 0),
        b.fuel_base_pct ?? null,
        b.fuel_diesel_base_price ?? null,
        b.fuel_slope_pct_per_1pct ?? null,
        contract_type,
        b.payment_terms_days ?? 15,
        charging_mechanism,
        rounding_rule,
        b.opa_excluded ? 1 : 0,
        b.odd_size_len_ft ?? null,
        b.odd_size_wid_ft ?? null,
        b.odd_size_ht_ft ?? null,
        odd_size_pricing,
      ];

      await conn.query(
        `INSERT INTO contracts (${parentCols.join(",")})
         VALUES (${parentCols.map(() => "?").join(",")})`,
        parentVals
      );

      // Utility bulk executor on SAME TRANSACTION/CONNECTION
      const bulk = async (sql: string, rows: any[]) => {
        if (!rows?.length) return;
        for (const r of rows) await conn.query(sql, r);
      };

      // ------------------ Children INSERTS ---------------------

      // volumetric bases
      if (Array.isArray(b.volumetric_bases)) {
        const rows = b.volumetric_bases
          .map((x: any) =>
            typeof x === "object"
              ? [contractId, nOr(x.cft_base, 0), sOr(x.basis_text, null)]
              : [contractId, nOr(x, 0), null]
          )
          .filter((r: any[]) => Number.isFinite(r[1]) && r[1] >= 0);
        await bulk(
          `INSERT INTO contract_volumetric_bases (id, contract_id, cft_base, basis_text)
           VALUES (UUID(), ?, ?, ?)`,
          rows
        );
      }

      // parties (email-safe, role normalized) + optional gstin/tan
      if (Array.isArray(b.parties)) {
        const hasGST = await tableHasColumn(conn, "contract_parties", "gstin");
        const hasTAN = await tableHasColumn(conn, "contract_parties", "tan");

        const fixedCols = [
          "id",
          "contract_id",
          "party_role",
          "legal_name",
          "brand_name",
          "cin",
          "pan",
          "address_line1",
          "address_line2",
          "city",
          "district",
          "state",
          "postcode",
          "phone",
          "contact_person",
          "email",
        ];
        const optCols: string[] = [];
        if (hasGST) optCols.push("gstin");
        if (hasTAN) optCols.push("tan");
        const allCols = [...fixedCols, ...optCols];

        const rowsValues = b.parties
          .map((p: any) => ({
            party_role: normalizePartyRole(p.party_role),
            legal_name: sOr(p.legal_name, "")!,
            brand_name: sOr(p.brand_name, null),
            cin: normCIN(p.cin),
            pan: normPAN(p.pan),
            gstin: normGST(p.gstin),
            tan: normTAN(p.tan),
            address_line1: sOr(p.address_line1 ?? p.address, null),
            address_line2: sOr(p.address_line2, null),
            city: sOr(p.city, null),
            district: sOr(p.district, null),
            state: sOr(p.state, null),
            postcode: sOr(p.postcode, null),
            phone: sOr(p.phone, null),
            contact_person: sOr(p.contact_person ?? p.contact_name, null),
            email: sOr(p.email, null),
          }))
          .filter((p: any) => p.legal_name.length > 0)
          .map((p: any) => {
            const fixedVals = [
              /* contract_id */ contractId,
              /* party_role */ p.party_role,
              /* legal_name */ p.legal_name,
              /* brand_name */ p.brand_name,
              /* cin */ p.cin,
              /* pan */ p.pan,
              /* address_line1 */ p.address_line1,
              /* address_line2 */ p.address_line2,
              /* city */ p.city,
              /* district */ p.district,
              /* state */ p.state,
              /* postcode */ p.postcode,
              /* phone */ p.phone,
              /* contact_person */ p.contact_person,
              /* email */ p.email,
            ];
            const optVals: any[] = [];
            if (hasGST) optVals.push(p.gstin ?? null);
            if (hasTAN) optVals.push(p.tan ?? null);
            return [...fixedVals, ...optVals];
          });

        if (rowsValues.length) {
          const placeholdersOneRow = `(UUID(), ${allCols
            .slice(1)
            .map(() => "?")
            .join(", ")})`;
          await conn.query(
            `INSERT INTO contract_parties (${allCols.join(",")})
             VALUES ${rowsValues.map(() => placeholdersOneRow).join(",")}`,
            rowsValues.flat()
          );
        }
      }

      // ODA (basic — legacy)
      if (Array.isArray(b.oda_rules)) {
        const rows = b.oda_rules
          .map((o: any) => ({
            oda_code: sOr(o.oda_code ?? o.pincode_prefix, "")!,
            oda_label: sOr(o.oda_label, null),
            rate_per_kg: nOr(o.rate_per_kg ?? o.surcharge_pct, 0),
            min_per_cn: nOr(o.min_per_cn ?? o.surcharge_flat, 0),
            max_per_cn: o.max_per_cn != null ? nOr(o.max_per_cn, 0) : null,
            notes: sOr(o.notes, null),
          }))
          .filter((o: any) => o.oda_code.length > 0)
          .map((o: any) => [
            contractId,
            o.oda_code,
            o.oda_label,
            o.rate_per_kg,
            o.min_per_cn,
            o.max_per_cn,
            o.notes,
          ]);

        await bulk(
          `INSERT INTO contract_oda_charges
           (id, contract_id, oda_code, oda_label, rate_per_kg, min_per_cn, max_per_cn, notes)
           VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
          rows
        );
      }

      // Non-metro
      if (Array.isArray(b.non_metro_rules)) {
        const rows = b.non_metro_rules.map((n: any) => [
          contractId,
          nOr(n.distance_km_max, 0),
          nOr(n.rate_per_kg ?? n.surcharge_flat, 0),
        ]);
        await bulk(
          `INSERT INTO contract_non_metro_rules
           (id, contract_id, distance_km_max, rate_per_kg)
           VALUES (UUID(), ?, ?, ?)`,
          rows
        );
      }

      // Region surcharges
      if (Array.isArray(b.region_surcharges)) {
        const rows = b.region_surcharges
          .map((r: any) => ({
            region_name: sOr(
              r.region_name ?? r.region_code ?? r.description,
              ""
            )!,
            base_relative_to: sOr(r.base_relative_to, null),
            addl_rate_per_kg: nOr(r.addl_rate_per_kg ?? r.surcharge_flat, 0),
            notes: sOr(r.notes ?? r.description, null),
          }))
          .filter((r: any) => r.region_name.length > 0)
          .map((r: any) => [
            contractId,
            r.region_name,
            r.base_relative_to,
            r.addl_rate_per_kg,
            r.notes,
          ]);

        await bulk(
          `INSERT INTO contract_region_surcharges
           (id, contract_id, region_name, base_relative_to, addl_rate_per_kg, notes)
           VALUES (UUID(), ?, ?, ?, ?, ?)`,
          rows
        );
      }

      // Insurance (ENUM auto-detect)
      let insuranceEnumAllowed: string[] = [];
      try {
        insuranceEnumAllowed = await getEnumAllowedValues(
          conn,
          "contract_insurance_rules",
          "insurance_type"
        );
      } catch {}

      if (Array.isArray(b.insurance_rules)) {
        const rows = b.insurance_rules.map((i: any) => {
          const raw = i.insurance_type ?? i.provider ?? "";
          const coerced = insuranceEnumAllowed.length
            ? coerceToEnum(raw, insuranceEnumAllowed)
            : String(raw || "STANDARD");
          return [
            contractId,
            coerced,
            nOr(i.pct_of_invoice ?? i.rate_pct, 0),
            nOr(i.min_per_cn ?? i.min_declared_value, 0),
            sOr(i.liability_desc ?? i.notes, null),
          ];
        });

        await bulk(
          `INSERT INTO contract_insurance_rules
           (id, contract_id, insurance_type, pct_of_invoice, min_per_cn, liability_desc)
           VALUES (UUID(), ?, ?, ?, ?, ?)`,
          rows
        );
      }

      // Incentives
      if (Array.isArray(b.incentive_slabs)) {
        const rows = b.incentive_slabs.map((s: any) => [
          contractId,
          nOr(s.tonnage_min ?? s.threshold_shipments, 0),
          s.tonnage_max ??
            (s.threshold_revenue != null ? nOr(s.threshold_revenue, 0) : null),
          nOr(s.discount_pct ?? s.incentive_pct, 0),
        ]);

        await bulk(
          `INSERT INTO contract_incentive_slabs
           (id, contract_id, tonnage_min, tonnage_max, discount_pct)
           VALUES (UUID(), ?, ?, ?, ?)`,
          rows
        );
      }

      // Annexures
      if (Array.isArray(b.annexures)) {
        const rows = b.annexures.map((a: any) => [
          contractId,
          sOr(a.annexure_code, "A"),
          sOr(a.title, null),
          sOr(a.raw_text, null),
        ]);

        await bulk(
          `INSERT INTO contract_annexures
           (id, contract_id, annexure_code, title, raw_text)
           VALUES (UUID(), ?, ?, ?, ?)`,
          rows
        );
      }

      // NEW: Metro congestion cities
      if (Array.isArray(b.metro_congestion_cities)) {
        const rows = b.metro_congestion_cities
          .filter((m: any) => String(m.city || "").trim().length)
          .map((m: any) => [
            contractId,
            String(m.city).trim(),
            nOr(m.charge_per_cn, 0),
            sOr(m.notes, null),
          ]);
        await bulk(
          `INSERT INTO contract_metro_congestion_cities (id, contract_id, city, charge_per_cn, notes)
           VALUES (UUID(), ?, ?, ?, ?)`,
          rows
        );
      }

      // NEW: Special handling ranges
      if (Array.isArray(b.special_handling)) {
        const rows = b.special_handling.map((r: any) => [
          contractId,
          nOr(r.range_min_kg, 0),
          r.range_max_kg != null ? nOr(r.range_max_kg, 0) : null,
          nOr(r.rate_per_kg, 0),
        ]);
        await bulk(
          `INSERT INTO contract_special_handling_charges (id, contract_id, range_min_kg, range_max_kg, rate_per_kg)
           VALUES (UUID(), ?, ?, ?, ?)`,
          rows
        );
      }

      // NEW: Pickup charges
      if (Array.isArray(b.pickup_charges)) {
        const rows = b.pickup_charges
          .filter((p: any) => sOr(p.service_code, null))
          .map((p: any) => [
            contractId,
            sOr(p.service_code)!,
            p.rate_per_kg != null ? nOr(p.rate_per_kg, 0) : null,
            p.min_per_pickup != null ? nOr(p.min_per_pickup, 0) : null,
            sOr(p.notes, null),
          ]);
        await bulk(
          `INSERT INTO contract_pickup_charges (id, contract_id, service_code, rate_per_kg, min_per_pickup, notes)
           VALUES (UUID(), ?, ?, ?, ?, ?)`,
          rows
        );
      }

      // ✅ NEW (robust): VAS charges with alias & number cleaning
      const vasInput = Array.isArray(b.vas_charges)
        ? b.vas_charges
        : Array.isArray((b as any).vasCharges)
        ? (b as any).vasCharges
        : null;

      if (Array.isArray(vasInput)) {
        const cols = await getTableColumns(conn, "contract_vas_charges");
        const baseCols = ["id", "contract_id", "vas_code", "calc_method"];
        const optCols: string[] = [];
        const may = (c: string) => cols.has(c) && optCols.push(c);
        may("rate_per_kg");
        may("rate_per_cn");
        may("min_per_cn");
        may("max_per_cn");
        may("multiplier");
        may("extra_per_cn");
        may("free_hours");
        may("floor_start");
        may("city_scope");
        may("notes");
        const allCols = [...baseCols, ...optCols];

        // Normalize each item with generous aliases
        const normalized = vasInput.map((v: any) => ({
          vas_code: sFirst(v.vas_code, v.vasCode, v.code, v.name),
          calc_method: sFirst(v.calc_method, v.method, v.calcMethod, "PER_CN")!,
          rate_per_kg: numOrNull(
            v.rate_per_kg ?? v.ratePerKg ?? v.rate_kg ?? v.perKg
          ),
          rate_per_cn: numOrNull(
            v.rate_per_cn ?? v.ratePerCn ?? v.rate_cn ?? v.perCn ?? v.rate
          ),
          min_per_cn: numOrNull(v.min_per_cn ?? v.min ?? v.minCn),
          max_per_cn: numOrNull(v.max_per_cn ?? v.max ?? v.maxCn),
          multiplier: v.multiplier != null ? Number(v.multiplier) : null,
          extra_per_cn: numOrNull(v.extra_per_cn ?? v.extra ?? v.extraCn),
          free_hours: intOrNull(v.free_hours),
          floor_start: intOrNull(v.floor_start),
          city_scope: sFirst(v.city_scope, v.cityScope, v.city, v.scope),
          notes: sFirst(v.notes, v.note, v.desc, v.description),
        }));

        const bad = normalized.filter((x) => !x.vas_code);
        if (bad.length) {
          console.warn(
            "[contracts] VAS skipped rows (missing vas_code):",
            bad.length
          );
        }

        const rows = normalized
          .filter((x) => !!x.vas_code)
          .map((v) => {
            const values: any[] = [
              /* contract_id */ contractId,
              /* vas_code */ v.vas_code!,
              /* calc_method */ v.calc_method!,
            ];
            if (optCols.includes("rate_per_kg")) values.push(v.rate_per_kg);
            if (optCols.includes("rate_per_cn")) values.push(v.rate_per_cn);
            if (optCols.includes("min_per_cn")) values.push(v.min_per_cn);
            if (optCols.includes("max_per_cn")) values.push(v.max_per_cn);
            if (optCols.includes("multiplier")) values.push(v.multiplier);
            if (optCols.includes("extra_per_cn")) values.push(v.extra_per_cn);
            if (optCols.includes("free_hours")) values.push(v.free_hours);
            if (optCols.includes("floor_start")) values.push(v.floor_start);
            if (optCols.includes("city_scope")) values.push(v.city_scope);
            if (optCols.includes("notes")) values.push(v.notes);
            return values;
          });

        if (!rows.length) {
          console.warn("[contracts] No VAS rows produced after normalization.");
        } else {
          const placeholdersOneRow = `(UUID(), ?, ?, ?${optCols
            .map(() => ", ?")
            .join("")})`;
          await conn.query(
            `INSERT INTO contract_vas_charges (${allCols.join(",")})
       VALUES ${rows.map(() => placeholdersOneRow).join(",")}`,
            rows.flat()
          );
        }
      }

      // ✅ NEW (robust): Rate Matrix (supports many aliases + number cleaning)
      const rateMatrixInput = Array.isArray(b.rate_matrix)
        ? b.rate_matrix
        : Array.isArray((b as any).rateMatrix)
        ? (b as any).rateMatrix
        : null;

      if (Array.isArray(rateMatrixInput)) {
        const rmCols = await getTableColumns(conn, "contract_rate_matrix");
        const baseCols = [
          "id",
          "contract_id",
          "origin_city",
          "dest_city",
          "cft_base",
          "base_rate_rs",
          "currency",
        ];
        const optCols: string[] = [];
        const may = (c: string) => rmCols.has(c) && optCols.push(c);
        may("origin_pincode");
        may("dest_pincode");
        const allCols = [...baseCols, ...optCols];

        const normalized = rateMatrixInput.map((r: any) => ({
          origin_city: sFirst(
            r.origin_city,
            r.originCity,
            r.origin,
            r.from_city,
            r.fromCity,
            r.from
          ),
          origin_pincode: sFirst(
            r.origin_pincode,
            r.from_pincode,
            r.fromPin,
            r.from_pincode_prefix
          ),
          dest_city: sFirst(
            r.dest_city,
            r.destination,
            r.destCity,
            r.to_city,
            r.toCity,
            r.to
          ),
          dest_pincode: sFirst(
            r.dest_pincode,
            r.to_pincode,
            r.toPin,
            r.to_pincode_prefix
          ),
          cft_base: numOrNull(
            r.cft_base ?? r.cftBase ?? r.volumetric_base ?? r.volBase ?? r.cft
          ),
          base_rate_rs: numOrNull(
            r.base_rate_rs ??
              r.baseRateRs ??
              r.base_rate ??
              r.baseRate ??
              r.rate
          ),
          currency: sFirst(r.currency, r.curr, r.ccy, "INR")!,
        }));

        const missing = normalized.filter(
          (x) =>
            !x.origin_city ||
            !x.dest_city ||
            x.cft_base == null ||
            x.base_rate_rs == null
        );
        if (missing.length) {
          console.warn(
            "[contracts] RateMatrix skipped rows (missing required fields origin/dest/cft_base/base_rate):",
            missing.length
          );
        }

        const rows = normalized
          .filter(
            (x) =>
              x.origin_city &&
              x.dest_city &&
              x.cft_base != null &&
              x.base_rate_rs != null
          )
          .map((x) => {
            const fixedVals: any[] = [
              /* contract_id */ contractId,
              x.origin_city!,
              x.dest_city!,
              x.cft_base!,
              x.base_rate_rs!,
              x.currency!,
            ];
            const optVals: any[] = [];
            if (optCols.includes("origin_pincode"))
              optVals.push(x.origin_pincode ?? null);
            if (optCols.includes("dest_pincode"))
              optVals.push(x.dest_pincode ?? null);
            return [...fixedVals, ...optVals];
          });

        if (!rows.length) {
          console.warn(
            "[contracts] No RateMatrix rows produced after normalization."
          );
        } else {
          const placeholdersOneRow = `(UUID(), ?, ?, ?, ?, ?, ?${optCols
            .map(() => ", ?")
            .join("")})`;
          await conn.query(
            `INSERT INTO contract_rate_matrix (${allCols.join(",")})
       VALUES ${rows.map(() => placeholdersOneRow).join(",")}`,
            rows.flat()
          );
        }
      }

      // NEW: Zone rates (auto-detect zone column name & optional columns)
      if (Array.isArray(b.zone_rates)) {
        const zcols = await getTableColumns(conn, "contract_zone_rates");
        const zoneCol = zcols.has("zone_name")
          ? "zone_name"
          : zcols.has("zone")
          ? "zone"
          : zcols.has("zone_code")
          ? "zone_code"
          : null;

        if (!zoneCol) {
          console.warn(
            "[contracts] Skipping contract_zone_rates: no zone column (zone_name/zone/zone_code) found."
          );
        } else {
          const baseCols = ["id", "contract_id", zoneCol];
          const optCols: string[] = [];
          if (zcols.has("rate_per_kg")) optCols.push("rate_per_kg");
          if (zcols.has("tat_days")) optCols.push("tat_days");
          if (zcols.has("min_cn_rs")) optCols.push("min_cn_rs");
          if (zcols.has("coverage_areas")) optCols.push("coverage_areas");

          const allCols = [...baseCols, ...optCols];

          const rows = b.zone_rates
            .filter((z: any) => sOr(z.zone_name ?? z.zone ?? z.zone_code, null))
            .map((z: any) => {
              const values: any[] = [
                /* contract_id */ contractId,
                /* zone */ sOr(z.zone_name ?? z.zone ?? z.zone_code)!,
              ];
              if (optCols.includes("rate_per_kg"))
                values.push(nOr(z.rate_per_kg, 0));
              if (optCols.includes("tat_days")) values.push(nOr(z.tat_days, 0));
              if (optCols.includes("min_cn_rs"))
                values.push(nOr(z.min_cn_rs, 0));
              if (optCols.includes("coverage_areas"))
                values.push(sOr(z.coverage_areas, null));
              return values;
            });

          if (rows.length) {
            const placeholdersOneRow = `(UUID(), ?, ${allCols
              .slice(2)
              .map(() => "?")
              .join(", ")})`;
            await conn.query(
              `INSERT INTO contract_zone_rates (${allCols.join(",")})
               VALUES ${rows.map(() => placeholdersOneRow).join(",")}`,
              rows.flat()
            );
          }
        }
      }

      await conn.commit();
      conn.release();

      /* ------------------------- Side-effects (best effort) ------------------------ */
      let pdfUrl: string | null = null;
      try {
        const vm = await loadContractVM(contractId);
        const html = renderContractHTML(vm as any);

        const pdfBuffer = await htmlToPdfBuffer(html);
        const blobKey = `contracts/${contractId}.pdf`;

        const uploaded = await uploadPdfBuffer(blobKey, pdfBuffer);
        if (uploaded?.url) {
          pdfUrl = uploaded.url;
        }

        // Store doc row regardless (keep metadata)
        await pool.query(
          `INSERT INTO documents (id, client_id, doc_type, url, meta_json)
           VALUES (UUID(), ?, 'CONTRACT_PDF', ?, JSON_OBJECT('contract_id', ?, 'contract_code', ?, 'source', ?))`,
          [
            vm.contract.client_id,
            pdfUrl,
            contractId,
            vm.contract.contract_code,
            uploaded?.provider || "unknown",
          ]
        );

        // Email
        const recipient = await findClientRecipient(vm.contract.client_id);
        if (recipient?.to) {
          const htmlLink = pdfUrl
            ? `<p>View online: <a href="${pdfUrl}">${pdfUrl}</a></p>`
            : `<p><i>Note:</i> Link is not available yet; the PDF is attached.</p>`;

          await sendMail({
            to: recipient.to,
            subject: `Contract ${vm.contract.contract_code} – Rapidero Logistics`,
            html: `
              <div style="font-family:Arial,Helvetica,sans-serif">
                <p>Dear ${recipient.name || "Client"},</p>
                <p>Your service agreement <b>${
                  vm.contract.contract_code
                }</b> is ready.</p>
                ${htmlLink}
                <p>Regards,<br/>Rapidero Logistics</p>
              </div>
            `,
            text: `Contract ${vm.contract.contract_code}${
              pdfUrl ? ` link: ${pdfUrl}` : ""
            }`,
            // @ts-ignore
            attachments: [
              {
                filename: `${vm.contract.contract_code}.pdf`,
                content: pdfBuffer,
                contentType: "application/pdf",
              },
            ],
          } as any).catch((e: any) =>
            console.warn("[contracts] sendMail failed:", e?.message || e)
          );
        } else {
          console.warn(
            "[contracts] No recipient email found for client:",
            vm.contract.client_id
          );
        }
      } catch (e) {
        console.warn("Contract side-effects failed:", (e as any)?.message);
      }

      res.status(201).json({ ok: true, id: contractId, pdf_url: pdfUrl });
    } catch (err) {
      try {
        await conn.rollback();
      } catch {}
      conn.release();
      throw err;
    }
  }
);

/* ------------------------------- NEW: My list ------------------------------ */
export const listMyContracts = asyncHandler(
  async (req: Request, res: Response) => {
    const clientId = (req as any).user?.client_id;
    if (!clientId) return res.status(403).json({ error: "Forbidden" });

    const [rows]: any = await pool.query(
      `SELECT c.id,
              c.contract_code,
              c.agreement_date,
              c.term_start,
              c.term_end,
              JSON_UNQUOTE(JSON_EXTRACT(d.meta_json, '$.contract_id')) AS doc_contract_id,
              d.url AS pdf_url,
              d.created_at AS pdf_created_at
         FROM contracts c
    LEFT JOIN documents d
           ON d.client_id = c.client_id
          AND d.doc_type = 'CONTRACT_PDF'
          AND JSON_UNQUOTE(JSON_EXTRACT(d.meta_json, '$.contract_id')) = c.id
        WHERE c.client_id = ?
     ORDER BY c.created_at DESC
        LIMIT 200`,
      [clientId]
    );

    res.json(rows);
  }
);

/* --------------------------- NEW: Resend/Regenerate ------------------------ */
export const resendContractPdf = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;

    // AuthZ: ensure clients can only resend their own
    const u: any = ensureClientBound(req);
    const [[c]]: any = await pool.query(`SELECT * FROM contracts WHERE id=?`, [
      id,
    ]);
    if (!c) return res.status(404).json({ error: "Not found" });
    if (u?.roles?.includes("CLIENT") && c.client_id !== u.client_id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const vm = await loadContractVM(id);
    const html = renderContractHTML(vm as any);
    const pdfBuffer = await htmlToPdfBuffer(html);

    // Re-upload (overwrites same key)
    const blobKey = `contracts/${id}.pdf`;
    const uploaded = await uploadPdfBuffer(blobKey, pdfBuffer);
    const pdfUrl = uploaded.url;

    // Upsert a doc row
    await pool.query(
      `INSERT INTO documents (id, client_id, doc_type, url, meta_json)
     VALUES (UUID(), ?, 'CONTRACT_PDF', ?, JSON_OBJECT('contract_id', ?, 'contract_code', ?, 'source', ?))
     ON DUPLICATE KEY UPDATE url=VALUES(url), meta_json=VALUES(meta_json)`,
      [
        vm.contract.client_id,
        pdfUrl,
        id,
        vm.contract.contract_code,
        uploaded.provider,
      ]
    );

    // Email again
    const recipient = await findClientRecipient(vm.contract.client_id);
    if (recipient?.to) {
      await sendMail({
        to: recipient.to,
        subject: `Contract ${vm.contract.contract_code} – Updated Link`,
        html: `
        <div style="font-family:Arial,Helvetica,sans-serif">
          <p>Dear ${recipient.name || "Client"},</p>
          <p>Here is your updated contract link for <b>${
            vm.contract.contract_code
          }</b>:</p>
          <p><a href="${pdfUrl}">${pdfUrl}</a></p>
          <p>We've attached the PDF as well.</p>
          <p>Regards,<br/>Rapidero Logistics</p>
        </div>
      `,
        text: `Updated link for contract ${vm.contract.contract_code}: ${pdfUrl}`,
        // @ts-ignore
        attachments: [
          {
            filename: `${vm.contract.contract_code}.pdf`,
            content: pdfBuffer,
            contentType: "application/pdf",
          },
        ],
      } as any);
    }

    res.json({ ok: true, id, pdf_url: pdfUrl });
  }
);
