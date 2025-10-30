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

/** Coerce an incoming value to the ENUM set (case-insensitive). Fallback to first */
function coerceToEnum(value: any, allowed: string[]): string {
  if (!allowed?.length) return String(value ?? "");
  const incoming = String(value ?? "").trim();
  if (!incoming) return allowed[0];
  if (allowed.includes(incoming)) return incoming;
  const found = allowed.find((a) => a.toLowerCase() === incoming.toLowerCase());
  return found ?? allowed[0];
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
    `SELECT cft_base FROM contract_volumetric_bases WHERE contract_id=?`,
    [id]
  );
  const [party]: any = await pool.query(
    `SELECT party_role,legal_name,brand_name,cin,pan,address_line1,address_line2,city,district,state,postcode,phone,contact_person,email
       FROM contract_parties WHERE contract_id=?`,
    [id]
  );
  const [oda]: any = await pool.query(
    `SELECT oda_code,rate_per_kg,min_per_cn,notes FROM contract_oda_charges WHERE contract_id=?`,
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

  res.json({
    ...c,
    volumetric_bases: vol.map((x: any) => x.cft_base),
    parties: party,
    oda_rules: oda,
    non_metro_rules: nm,
    region_surcharges: reg,
    vas_charges: vas,
    insurance_rules: ins,
    incentive_slabs: inc,
    annexures: ann,
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
        "min_chargeable_weight_kg",
        "min_chargeable_freight_rs",
        "fuel_base_pct",
        "fuel_diesel_base_price",
        "fuel_slope_pct_per_1pct",
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
        sOr(b.settlement_frequency || "DAILY")!,
        b.price_floor_enabled ? 1 : 0,
        b.price_ceiling_enabled ? 1 : 0,
        nOr(b.taxes_gst_pct ?? 18, 18),
        nOr(b.metro_congestion_charge_per_cn ?? 0, 0),
        nOr(b.cn_charge_per_cn ?? 0, 0),
        nOr(b.min_chargeable_weight_kg ?? 20, 20),
        nOr(b.min_chargeable_freight_rs ?? b.min_charge ?? 200, 0),
        b.fuel_base_pct ?? null,
        b.fuel_diesel_base_price ?? null,
        b.fuel_slope_pct_per_1pct ?? null,
      ];

      await conn.query(
        `INSERT INTO contracts (${parentCols.join(",")})
       VALUES (${parentCols.map(() => "?").join(",")})`,
        parentVals
      );

      // Utility bulk executor
      const bulk = async (sql: string, rows: any[]) => {
        if (!rows?.length) return;
        for (const r of rows) await conn.query(sql, r);
      };

      // ------------------ Children INSERTS ---------------------

      // volumetric bases
      if (Array.isArray(b.volumetric_bases)) {
        const rows = b.volumetric_bases
          .map((x: any) => nOr(x, 0))
          .filter((x: number) => Number.isFinite(x) && x >= 0)
          .map((x: number) => [contractId, x]);
        await bulk(
          `INSERT INTO contract_volumetric_bases (id, contract_id, cft_base)
         VALUES (UUID(), ?, ?)`,
          rows
        );
      }

      // parties (email-safe, role normalized)
      if (Array.isArray(b.parties)) {
        const rows = b.parties
          .map((p: any) => ({
            party_role: normalizePartyRole(p.party_role),
            legal_name: sOr(p.legal_name, "")!,
            brand_name: sOr(p.brand_name, null),
            cin: sOr(p.cin, null),
            pan: sOr(p.pan, null),
            address_line1: sOr(p.address ?? p.address_line1, null),
            address_line2: sOr(p.address_line2, null),
            city: sOr(p.city, null),
            district: sOr(p.district, null),
            state: sOr(p.state, null),
            postcode: sOr(p.postcode, null),
            phone: sOr(p.phone, null),
            contact_person: sOr(p.contact_name ?? p.contact_person, null),
            email: sOr(p.email, null),
          }))
          .filter((p: any) => p.legal_name.length > 0)
          .map((p: any) => [
            contractId,
            p.party_role,
            p.legal_name,
            p.brand_name,
            p.cin,
            p.pan,
            p.address_line1,
            p.address_line2,
            p.city,
            p.district,
            p.state,
            p.postcode,
            p.phone,
            p.contact_person,
            p.email,
          ]);

        await bulk(
          `INSERT INTO contract_parties
         (id, contract_id, party_role, legal_name, brand_name, cin, pan,
          address_line1, address_line2, city, district, state, postcode,
          phone, contact_person, email)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          rows
        );
      }

      // ODA
      if (Array.isArray(b.oda_rules)) {
        const rows = b.oda_rules
          .map((o: any) => ({
            oda_code: sOr(o.oda_code ?? o.pincode_prefix, "")!,
            rate_per_kg: nOr(o.rate_per_kg ?? o.surcharge_pct, 0),
            min_per_cn: nOr(o.min_per_cn ?? o.surcharge_flat, 0),
            notes: sOr(o.notes, null),
          }))
          .filter((o: any) => o.oda_code.length > 0)
          .map((o: any) => [
            contractId,
            o.oda_code,
            o.rate_per_kg,
            o.min_per_cn,
            o.notes,
          ]);

        await bulk(
          `INSERT INTO contract_oda_charges
         (id, contract_id, oda_code, rate_per_kg, min_per_cn, notes)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
          rows
        );
      }

      // Non-metro — guarantee NOT NULL
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

      // ---------- INSURANCE (auto-detect ENUM and coerce) ----------
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

      await conn.commit();
      conn.release();

      /* ------------------------- Side-effects (best effort) ------------------------ */
      let pdfUrl: string | null = null;
      try {
        const vm = await loadContractVM(contractId);
        const html = renderContractHTML({
          contract: vm.contract,
          client: vm.client,
          parties: vm.parties,
          vas: vm.vas,
          oda: vm.oda,
          region: vm.region,
          insurance: vm.insurance,
          incentives: vm.incentives,
          rateMatrix: vm.rateMatrix,
          volumetric_bases: vm.volumetric_bases, // <— pass if your template needs it
        } as any);

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
            // @ts-ignore Nodemailer typings vary; this is fine.
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

      res.json({ id: contractId, pdf_url: pdfUrl });
    } catch (err) {
      await conn.rollback();
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
// Add in contracts.controller.ts
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
    const html = renderContractHTML({
      contract: vm.contract,
      client: vm.client,
      parties: vm.parties,
      vas: vm.vas,
      oda: vm.oda,
      region: vm.region,
      insurance: vm.insurance,
      incentives: vm.incentives,
      rateMatrix: vm.rateMatrix,
      volumetric_bases: vm.volumetric_bases,
    } as any);
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
