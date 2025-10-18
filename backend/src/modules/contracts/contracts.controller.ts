// import type { Request, Response } from "express";
// import { pool } from "../../db/mysql.js";
// import { asyncHandler } from "../../utils/asyncHandler.js";

// export const createContract = asyncHandler(
//   async (req: Request, res: Response) => {
//     const b = req.body || {};
//     if (!b.client_id || !b.contract_code)
//       return res
//         .status(400)
//         .json({ error: "client_id & contract_code required" });

//     const conn = await pool.getConnection();
//     try {
//       await conn.beginTransaction();

//       // parent
//       const parentCols = [
//         "id",
//         "client_id",
//         "contract_code",
//         "purpose",
//         "agreement_date",
//         "agreement_place",
//         "term_months",
//         "term_start",
//         "term_end",
//         "territory_desc",
//         "termination_notice_days",
//         "non_compete_cooling_months",
//         "jurisdiction_city",
//         "arbitration_seat",
//         "arbitration_language",
//         "prepayment_required",
//         "capacity_booking_day_of_month",
//         "capacity_additional_notice_days",
//         "settlement_frequency",
//         "price_floor_enabled",
//         "price_ceiling_enabled",
//         "taxes_gst_pct",
//         "metro_congestion_charge_per_cn",
//         "cn_charge_per_cn",
//         "min_chargeable_weight_kg",
//         "min_chargeable_freight_rs",
//         "fuel_base_pct",
//         "fuel_diesel_base_price",
//         "fuel_slope_pct_per_1pct",
//       ];
//       const parentVals = [
//         "UUID()",
//         b.client_id,
//         b.contract_code,
//         b.purpose || null,
//         b.agreement_date || null,
//         b.agreement_place || null,
//         b.term_months ?? null,
//         b.term_start || null,
//         b.term_end || null,
//         b.territory_desc || null,
//         b.termination_notice_days ?? 30,
//         b.non_compete_cooling_months ?? 12,
//         b.jurisdiction_city || null,
//         b.arbitration_seat || null,
//         b.arbitration_language || null,
//         b.prepayment_required ? 1 : 0,
//         b.capacity_booking_day_of_month ?? null,
//         b.capacity_additional_notice_days ?? null,
//         b.settlement_frequency || "DAILY",
//         b.price_floor_enabled ? 1 : 0,
//         b.price_ceiling_enabled ? 1 : 0,
//         b.taxes_gst_pct ?? 18.0,
//         b.metro_congestion_charge_per_cn ?? 0,
//         b.cn_charge_per_cn ?? 0,
//         b.min_chargeable_weight_kg ?? 20,
//         b.min_chargeable_freight_rs ?? 200,
//         b.fuel_base_pct ?? null,
//         b.fuel_diesel_base_price ?? null,
//         b.fuel_slope_pct_per_1pct ?? null,
//       ];
//       await conn.query(
//         `INSERT INTO contracts (${parentCols.join(",")}) VALUES (${parentCols
//           .map(() => "?")
//           .join(",")})`,
//         parentVals
//       );

//       const [[row]]: any = await conn.query(
//         `SELECT id FROM contracts WHERE client_id=? AND contract_code=? ORDER BY created_at DESC LIMIT 1`,
//         [b.client_id, b.contract_code]
//       );
//       const contractId = row.id;

//       // helpers
//       const bulk = async (sql: string, rows: any[]) => {
//         if (!rows?.length) return;
//         for (const r of rows) await conn.query(sql, r);
//       };

//       // volumetric bases
//       if (Array.isArray(b.volumetric_bases)) {
//         await bulk(
//           `INSERT INTO contract_volumetric_bases (id, contract_id, cft_base) VALUES (UUID(), ?, ?)`,
//           b.volumetric_bases.map((x: number) => [contractId, x])
//         );
//       }

//       // parties
//       if (Array.isArray(b.parties)) {
//         await bulk(
//           `INSERT INTO contract_parties (id, contract_id, party_role, legal_name, brand_name, cin, pan, address_line1, address_line2, city, district, state, postcode, phone, contact_person)
//          VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           b.parties.map((p: any) => [
//             contractId,
//             p.party_role,
//             p.legal_name,
//             p.brand_name || null,
//             p.cin || null,
//             p.pan || null,
//             p.address_line1 || null,
//             p.address_line2 || null,
//             p.city || null,
//             p.district || null,
//             p.state || null,
//             p.postcode || null,
//             p.phone || null,
//             p.contact_person || null,
//           ])
//         );
//       }

//       // ODA
//       if (Array.isArray(b.oda_rules)) {
//         await bulk(
//           `INSERT INTO contract_oda_charges (id, contract_id, oda_code, rate_per_kg, min_per_cn, notes) VALUES (UUID(), ?, ?, ?, ?, ?)`,
//           b.oda_rules.map((o: any) => [
//             contractId,
//             o.oda_code,
//             o.rate_per_kg,
//             o.min_per_cn,
//             o.notes || null,
//           ])
//         );
//       }

//       // Non-metro
//       if (Array.isArray(b.non_metro_rules)) {
//         await bulk(
//           `INSERT INTO contract_non_metro_rules (id, contract_id, distance_km_max, rate_per_kg) VALUES (UUID(), ?, ?, ?)`,
//           b.non_metro_rules.map((n: any) => [
//             contractId,
//             n.distance_km_max,
//             n.rate_per_kg,
//           ])
//         );
//       }

//       // Region surcharges
//       if (Array.isArray(b.region_surcharges)) {
//         await bulk(
//           `INSERT INTO contract_region_surcharges (id, contract_id, region_name, base_relative_to, addl_rate_per_kg, notes)
//          VALUES (UUID(), ?, ?, ?, ?, ?)`,
//           b.region_surcharges.map((r: any) => [
//             contractId,
//             r.region_name,
//             r.base_relative_to || null,
//             r.addl_rate_per_kg,
//             r.notes || null,
//           ])
//         );
//       }

//       // VAS
//       if (Array.isArray(b.vas_charges)) {
//         await bulk(
//           `INSERT INTO contract_vas_charges
//          (id, contract_id, vas_code, calc_method, rate_per_kg, rate_per_cn, min_per_cn, max_per_cn, multiplier, extra_per_cn, free_hours, floor_start, city_scope, notes)
//          VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//           b.vas_charges.map((v: any) => [
//             contractId,
//             v.vas_code,
//             v.calc_method,
//             v.rate_per_kg ?? null,
//             v.rate_per_cn ?? null,
//             v.min_per_cn ?? null,
//             v.max_per_cn ?? null,
//             v.multiplier ?? null,
//             v.extra_per_cn ?? null,
//             v.free_hours ?? null,
//             v.floor_start ?? null,
//             v.city_scope ?? null,
//             v.notes || null,
//           ])
//         );
//       }

//       // Insurance
//       if (Array.isArray(b.insurance_rules)) {
//         await bulk(
//           `INSERT INTO contract_insurance_rules (id, contract_id, insurance_type, pct_of_invoice, min_per_cn, liability_desc)
//          VALUES (UUID(), ?, ?, ?, ?, ?)`,
//           b.insurance_rules.map((i: any) => [
//             contractId,
//             i.insurance_type,
//             i.pct_of_invoice,
//             i.min_per_cn,
//             i.liability_desc || null,
//           ])
//         );
//       }

//       // Incentives
//       if (Array.isArray(b.incentive_slabs)) {
//         await bulk(
//           `INSERT INTO contract_incentive_slabs (id, contract_id, tonnage_min, tonnage_max, discount_pct)
//          VALUES (UUID(), ?, ?, ?, ?)`,
//           b.incentive_slabs.map((s: any) => [
//             contractId,
//             s.tonnage_min,
//             s.tonnage_max ?? null,
//             s.discount_pct,
//           ])
//         );
//       }

//       // Annexures
//       if (Array.isArray(b.annexures)) {
//         await bulk(
//           `INSERT INTO contract_annexures (id, contract_id, annexure_code, title, raw_text)
//          VALUES (UUID(), ?, ?, ?, ?)`,
//           b.annexures.map((a: any) => [
//             contractId,
//             a.annexure_code,
//             a.title || null,
//             a.raw_text || null,
//           ])
//         );
//       }

//       await conn.commit();
//       res.status(201).json({ ok: true, id: contractId });
//     } catch (e) {
//       await (await pool.getConnection()).rollback().catch(() => {});
//       throw e;
//     } finally {
//       // The transaction connection is released inside try-catch; safe-guard:
//       // (if we used separate conn above, release there; simplified here)
//     }
//   }
// );

// export const getContract = asyncHandler(async (req: Request, res: Response) => {
//   const { id } = req.params;
//   const [[c]]: any = await pool.query(`SELECT * FROM contracts WHERE id=?`, [
//     id,
//   ]);
//   if (!c) return res.status(404).json({ error: "Not found" });

//   const [vol]: any = await pool.query(
//     `SELECT cft_base FROM contract_volumetric_bases WHERE contract_id=?`,
//     [id]
//   );
//   const [party]: any = await pool.query(
//     `SELECT party_role,legal_name,brand_name,cin,pan,address_line1,address_line2,city,district,state,postcode,phone,contact_person FROM contract_parties WHERE contract_id=?`,
//     [id]
//   );
//   const [oda]: any = await pool.query(
//     `SELECT oda_code,rate_per_kg,min_per_cn,notes FROM contract_oda_charges WHERE contract_id=?`,
//     [id]
//   );
//   const [nm]: any = await pool.query(
//     `SELECT distance_km_max,rate_per_kg FROM contract_non_metro_rules WHERE contract_id=?`,
//     [id]
//   );
//   const [reg]: any = await pool.query(
//     `SELECT region_name,base_relative_to,addl_rate_per_kg,notes FROM contract_region_surcharges WHERE contract_id=?`,
//     [id]
//   );
//   const [vas]: any = await pool.query(
//     `SELECT vas_code,calc_method,rate_per_kg,rate_per_cn,min_per_cn,max_per_cn,multiplier,extra_per_cn,free_hours,floor_start,city_scope,notes FROM contract_vas_charges WHERE contract_id=?`,
//     [id]
//   );
//   const [ins]: any = await pool.query(
//     `SELECT insurance_type,pct_of_invoice,min_per_cn,liability_desc FROM contract_insurance_rules WHERE contract_id=?`,
//     [id]
//   );
//   const [inc]: any = await pool.query(
//     `SELECT tonnage_min,tonnage_max,discount_pct FROM contract_incentive_slabs WHERE contract_id=?`,
//     [id]
//   );
//   const [ann]: any = await pool.query(
//     `SELECT annexure_code,title,raw_text FROM contract_annexures WHERE contract_id=?`,
//     [id]
//   );

//   res.json({
//     ...c,
//     volumetric_bases: vol.map((x: any) => x.cft_base),
//     parties: party,
//     oda_rules: oda,
//     non_metro_rules: nm,
//     region_surcharges: reg,
//     vas_charges: vas,
//     insurance_rules: ins,
//     incentive_slabs: inc,
//     annexures: ann,
//   });
// });

// export const listContracts = asyncHandler(
//   async (req: Request, res: Response) => {
//     const { client_id } = req.query as any;
//     const args: any[] = [];
//     let sql = `SELECT id, client_id, contract_code, agreement_date, term_start, term_end, taxes_gst_pct FROM contracts`;
//     if (client_id) {
//       sql += ` WHERE client_id=?`;
//       args.push(client_id);
//     }
//     sql += ` ORDER BY created_at DESC LIMIT 200`;
//     const [rows]: any = await pool.query(sql, args);
//     res.json(rows);
//   }
// );
// src/modules/contracts/contracts.controller.ts
import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { htmlToPdfBuffer } from "../../utils/pdf.js";
import { uploadPdfBuffer } from "../../utils/azureBlob.js";
import { sendMail } from "../../utils/mailer.js";
import { renderContractHTML } from "./templates/contract.html.js";

/** build a view-model to render the contract */
async function loadContractVM(conn: any, contractId: string) {
  const [[contract]] = await conn.query(`SELECT * FROM contracts WHERE id=?`, [
    contractId,
  ]);
  if (!contract) throw new Error("Contract not found after insert");

  const [[client]] = await conn.query(`SELECT * FROM clients WHERE id=?`, [
    contract.client_id,
  ]);

  const [volumes] = await conn.query(
    `SELECT * FROM contract_volumetric_bases WHERE contract_id=?`,
    [contractId]
  );
  const [parties] = await conn.query(
    `SELECT * FROM contract_parties WHERE contract_id=?`,
    [contractId]
  );
  const [oda] = await conn.query(
    `SELECT * FROM contract_oda_charges WHERE contract_id=?`,
    [contractId]
  );
  const [nonmetro] = await conn.query(
    `SELECT * FROM contract_non_metro_rules WHERE contract_id=?`,
    [contractId]
  );
  const [region] = await conn.query(
    `SELECT * FROM contract_region_surcharges WHERE contract_id=?`,
    [contractId]
  );
  const [vas] = await conn.query(
    `SELECT * FROM contract_vas_charges WHERE contract_id=?`,
    [contractId]
  );
  const [insurance] = await conn.query(
    `SELECT * FROM contract_insurance_rules WHERE contract_id=?`,
    [contractId]
  );
  const [incentives] = await conn.query(
    `SELECT * FROM contract_incentive_slabs WHERE contract_id=?`,
    [contractId]
  );
  const [rateMatrix] = await conn.query(
    `SELECT * FROM contract_rate_matrix WHERE contract_id=?`,
    [contractId]
  );

  return {
    contract,
    client,
    volumetric_bases: volumes,
    parties,
    oda,
    non_metro_rules: nonmetro,
    region,
    vas,
    insurance,
    incentives,
    rateMatrix,
  };
}

/** choose email recipient: primary contact -> client email -> null */
async function findClientRecipient(conn: any, clientId: string) {
  const [[primary]] = await conn.query(
    `SELECT email, name FROM client_contacts WHERE client_id=? AND is_primary=1 LIMIT 1`,
    [clientId]
  );
  if (primary?.email) return { to: primary.email, name: primary.name ?? "" };

  const [[c]] = await conn.query(
    `SELECT email, client_name FROM clients WHERE id=?`,
    [clientId]
  );
  if (c?.email) return { to: c.email, name: c.client_name ?? "" };

  return null;
}

export const createContract = asyncHandler(
  async (req: Request, res: Response) => {
    const b = req.body || {};
    if (!b.client_id || !b.contract_code)
      return res
        .status(400)
        .json({ error: "client_id & contract_code required" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // -----------------------
      // 1) Insert parent row
      // -----------------------
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
        "UUID()",
        b.client_id,
        b.contract_code,
        b.purpose ?? null,
        b.agreement_date ?? null,
        b.agreement_place ?? null,
        b.term_months ?? null,
        b.term_start ?? null,
        b.term_end ?? null,
        b.territory_desc ?? null,
        b.termination_notice_days ?? 30,
        b.non_compete_cooling_months ?? 12,
        b.jurisdiction_city ?? null,
        b.arbitration_seat ?? null,
        b.arbitration_language ?? null,
        b.prepayment_required ? 1 : 0,
        b.capacity_booking_day_of_month ?? null,
        b.capacity_additional_notice_days ?? null,
        b.settlement_frequency ?? "DAILY",
        b.price_floor_enabled ? 1 : 0,
        b.price_ceiling_enabled ? 1 : 0,
        b.taxes_gst_pct ?? 18.0,
        b.metro_congestion_charge_per_cn ?? 0,
        b.cn_charge_per_cn ?? 0,
        b.min_chargeable_weight_kg ?? 20,
        b.min_chargeable_freight_rs ?? 200,
        b.fuel_base_pct ?? null,
        b.fuel_diesel_base_price ?? null,
        b.fuel_slope_pct_per_1pct ?? null,
      ];
      await conn.query(
        `INSERT INTO contracts (${parentCols.join(",")}) VALUES (${parentCols
          .map(() => "?")
          .join(",")})`,
        parentVals
      );

      const [[row]]: any = await conn.query(
        `SELECT id FROM contracts WHERE client_id=? AND contract_code=? ORDER BY created_at DESC LIMIT 1`,
        [b.client_id, b.contract_code]
      );
      const contractId = row.id as string;

      // small helper for child inserts
      const bulk = async (sql: string, rows: any[]) => {
        if (!rows?.length) return;
        for (const r of rows) await conn.query(sql, r);
      };

      // -----------------------
      // 2) Insert child rows
      // -----------------------
      if (Array.isArray(b.volumetric_bases)) {
        await bulk(
          `INSERT INTO contract_volumetric_bases (id, contract_id, cft_base) VALUES (UUID(), ?, ?)`,
          b.volumetric_bases.map((x: number) => [contractId, x])
        );
      }
      if (Array.isArray(b.parties)) {
        await bulk(
          `INSERT INTO contract_parties (id, contract_id, party_role, legal_name, brand_name, cin, pan, address_line1, address_line2, city, district, state, postcode, phone, contact_person)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          b.parties.map((p: any) => [
            contractId,
            p.party_role,
            p.legal_name,
            p.brand_name ?? null,
            p.cin ?? null,
            p.pan ?? null,
            p.address_line1 ?? null,
            p.address_line2 ?? null,
            p.city ?? null,
            p.district ?? null,
            p.state ?? null,
            p.postcode ?? null,
            p.phone ?? null,
            p.contact_person ?? null,
          ])
        );
      }
      if (Array.isArray(b.oda_rules)) {
        await bulk(
          `INSERT INTO contract_oda_charges (id, contract_id, oda_code, rate_per_kg, min_per_cn, notes)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
          b.oda_rules.map((o: any) => [
            contractId,
            o.oda_code,
            o.rate_per_kg,
            o.min_per_cn,
            o.notes ?? null,
          ])
        );
      }
      if (Array.isArray(b.non_metro_rules)) {
        await bulk(
          `INSERT INTO contract_non_metro_rules (id, contract_id, distance_km_max, rate_per_kg)
         VALUES (UUID(), ?, ?, ?)`,
          b.non_metro_rules.map((n: any) => [
            contractId,
            n.distance_km_max,
            n.rate_per_kg,
          ])
        );
      }
      if (Array.isArray(b.region_surcharges)) {
        await bulk(
          `INSERT INTO contract_region_surcharges (id, contract_id, region_name, base_relative_to, addl_rate_per_kg, notes)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
          b.region_surcharges.map((r: any) => [
            contractId,
            r.region_name,
            r.base_relative_to ?? null,
            r.addl_rate_per_kg,
            r.notes ?? null,
          ])
        );
      }
      if (Array.isArray(b.vas_charges)) {
        await bulk(
          `INSERT INTO contract_vas_charges
         (id, contract_id, vas_code, calc_method, rate_per_kg, rate_per_cn, min_per_cn, max_per_cn, multiplier, extra_per_cn, free_hours, floor_start, city_scope, notes)
         VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          b.vas_charges.map((v: any) => [
            contractId,
            v.vas_code,
            v.calc_method,
            v.rate_per_kg ?? null,
            v.rate_per_cn ?? null,
            v.min_per_cn ?? null,
            v.max_per_cn ?? null,
            v.multiplier ?? null,
            v.extra_per_cn ?? null,
            v.free_hours ?? null,
            v.floor_start ?? null,
            v.city_scope ?? null,
            v.notes ?? null,
          ])
        );
      }
      if (Array.isArray(b.insurance_rules)) {
        await bulk(
          `INSERT INTO contract_insurance_rules (id, contract_id, insurance_type, pct_of_invoice, min_per_cn, liability_desc)
         VALUES (UUID(), ?, ?, ?, ?, ?)`,
          b.insurance_rules.map((i: any) => [
            contractId,
            i.insurance_type,
            i.pct_of_invoice,
            i.min_per_cn,
            i.liability_desc ?? null,
          ])
        );
      }
      if (Array.isArray(b.incentive_slabs)) {
        await bulk(
          `INSERT INTO contract_incentive_slabs (id, contract_id, tonnage_min, tonnage_max, discount_pct)
         VALUES (UUID(), ?, ?, ?, ?)`,
          b.incentive_slabs.map((s: any) => [
            contractId,
            s.tonnage_min,
            s.tonnage_max ?? null,
            s.discount_pct,
          ])
        );
      }
      if (Array.isArray(b.annexures)) {
        await bulk(
          `INSERT INTO contract_annexures (id, contract_id, annexure_code, title, raw_text)
         VALUES (UUID(), ?, ?, ?, ?)`,
          b.annexures.map((a: any) => [
            contractId,
            a.annexure_code,
            a.title ?? null,
            a.raw_text ?? null,
          ])
        );
      }

      // -----------------------
      // 3) Render → PDF → Azure
      // -----------------------
      const vm = await loadContractVM(conn, contractId);
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
      } as any);

      const pdfBuffer = await htmlToPdfBuffer(html);
      const blobKey = `contracts/${contractId}.pdf`;
      const { url: pdfUrl } = await uploadPdfBuffer(blobKey, pdfBuffer);

      // Save a documents row (schema without contract_id; contract_id inside meta_json)
      await conn.query(
        `INSERT INTO documents (id, client_id, doc_type, url, meta_json)
       VALUES (UUID(), ?, 'CONTRACT_PDF', ?, JSON_OBJECT('contract_id', ?, 'contract_code', ?, 'source','azure-blob'))`,
        [b.client_id, pdfUrl, contractId, b.contract_code]
      );

      // -----------------------
      // 4) Email to client
      // -----------------------
      const recipient = await findClientRecipient(conn, b.client_id);
      if (recipient?.to) {
        await sendMail({
          to: recipient.to,
          subject: `Contract ${b.contract_code} – Rapidero Logistics`,
          html: `
          <div style="font-family:Arial,Helvetica,sans-serif">
            <p>Dear ${recipient.name || "Client"},</p>
            <p>Your service agreement <b>${b.contract_code}</b> is ready.</p>
            <p>View online: <a href="${pdfUrl}">${pdfUrl}</a></p>
            <p>Regards,<br/>Rapidero Logistics</p>
          </div>
        `,
          text: `Contract ${b.contract_code} link: ${pdfUrl}`,
          // attach as well, helpful if container is private
          // @ts-ignore if your mailer typing doesn't include "attachments"
          attachments: [
            {
              filename: `${b.contract_code}.pdf`,
              content: pdfBuffer,
              contentType: "application/pdf",
            },
          ],
        } as any).catch((e: any) => {
          console.warn("Email send failed (contract PDF):", e?.message);
        });
      } else {
        console.warn(
          "No client email/primary contact found; skipping auto-email."
        );
      }

      await conn.commit();
      res.status(201).json({ ok: true, id: contractId, pdf_url: pdfUrl });
    } catch (e) {
      try {
        await (await pool.getConnection()).rollback();
      } catch {}
      throw e;
    } finally {
      conn.release();
    }
  }
);

export const getContract = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const [[c]]: any = await pool.query(`SELECT * FROM contracts WHERE id=?`, [
    id,
  ]);
  if (!c) return res.status(404).json({ error: "Not found" });

  const [vol]: any = await pool.query(
    `SELECT cft_base FROM contract_volumetric_bases WHERE contract_id=?`,
    [id]
  );
  const [party]: any = await pool.query(
    `SELECT party_role,legal_name,brand_name,cin,pan,address_line1,address_line2,city,district,state,postcode,phone,contact_person FROM contract_parties WHERE contract_id=?`,
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
    `SELECT vas_code,calc_method,rate_per_kg,rate_per_cn,min_per_cn,max_per_cn,multiplier,extra_per_cn,free_hours,floor_start,city_scope,notes FROM contract_vas_charges WHERE contract_id=?`,
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

export const listContracts = asyncHandler(
  async (req: Request, res: Response) => {
    const { client_id } = req.query as any;
    const args: any[] = [];
    let sql = `SELECT id, client_id, contract_code, agreement_date, term_start, term_end, taxes_gst_pct FROM contracts`;
    if (client_id) {
      sql += ` WHERE client_id=?`;
      args.push(client_id);
    }
    sql += ` ORDER BY created_at DESC LIMIT 200`;
    const [rows]: any = await pool.query(sql, args);
    res.json(rows);
  }
);
