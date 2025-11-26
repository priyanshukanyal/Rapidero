// src/modules/invoices/invoices.controller.ts
import type { Request, Response } from "express";
import { randomUUID } from "crypto";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

/* -------------------------- Small helper functions ------------------------- */

const num = (v: any, d = 0): number => {
  if (v == null) return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

const dtOnly = (s: string) => s?.slice(0, 10) ?? null;

function generateInvoiceNumber(clientId: string): string {
  const dt = new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const suffix = String(Math.floor(Math.random() * 10000)).padStart(4, "0");
  return `INV-${y}${m}${d}-${suffix}`;
}

type ContractRow = {
  id: string;
  taxes_gst_pct: any;
  min_chargeable_weight_kg: any;
  charging_mechanism: any;
  docket_charge_per_cn: any;
};

type ConsignmentRow = {
  id: string;
  cn_number: string;
  booking_datetime: string | null;
  client_id: string;
  contract_id: string | null;
  shipper_city: string;
  consignee_city: string;
  consignee_name: string;
  consignee_postcode: string | null;
  actual_weight_kg: any;
  volumetric_weight_kg: any;
  declared_value_rs: any;
};

/* --------------------- Charge calculation per consignment ------------------ */

async function calculateChargesForConsignment(
  cn: ConsignmentRow,
  contract: ContractRow,
  conn: any
) {
  const actualWeight = num(cn.actual_weight_kg, 0);
  const volumetricWeight = num(cn.volumetric_weight_kg, 0);
  const minWeight = num(contract.min_chargeable_weight_kg, 0);
  const mechanism = String(contract.charging_mechanism || "").toUpperCase();

  let chargedWeight = actualWeight;

  if (mechanism === "VOLUMETRIC_WEIGHT_ONLY") {
    chargedWeight = volumetricWeight || actualWeight;
  } else if (mechanism === "HIGHER_OF_ACTUAL_OR_VOLUMETRIC") {
    chargedWeight = Math.max(actualWeight, volumetricWeight || 0);
  } // else ACTUAL_WEIGHT_ONLY or others → keep actual

  if (chargedWeight < minWeight) chargedWeight = minWeight;

  /* -------- Base rate from contract_rate_matrix (origin/dest city) -------- */

  const [rmRows]: any = await conn.query(
    `SELECT base_rate_rs, cft_base
       FROM contract_rate_matrix
      WHERE contract_id = ?
        AND origin_city = ?
        AND dest_city = ?
      ORDER BY cft_base DESC
      LIMIT 1`,
    [contract.id, cn.shipper_city, cn.consignee_city]
  );

  const rm = rmRows?.[0];
  const baseRateRs = rm ? num(rm.base_rate_rs, 0) : 0;
  const baseFreight = chargedWeight * baseRateRs;

  /* ------------------------ Docket / CN fixed charge ----------------------- */

  const docketCharge = num(contract.docket_charge_per_cn, 0);

  /* ----------------------------- ODA surcharge ----------------------------- */

  let odaCharge = 0;
  if (cn.consignee_postcode) {
    const [pinRows]: any = await conn.query(
      `SELECT oda_bucket_name
         FROM pincode_master
        WHERE pincode = ?
        LIMIT 1`,
      [cn.consignee_postcode]
    );

    const pin = pinRows?.[0];
    const bucket = pin?.oda_bucket_name?.trim();
    if (bucket) {
      const [odaRows]: any = await conn.query(
        `SELECT rate_per_kg, min_per_cn, max_per_cn
           FROM contract_oda_charges
          WHERE contract_id = ?
            AND oda_code = ?
          LIMIT 1`,
        [contract.id, bucket]
      );
      const oda = odaRows?.[0];
      if (oda) {
        const ratePerKg = num(oda.rate_per_kg, 0);
        const minPerCn = num(oda.min_per_cn, 0);
        const maxPerCn = oda.max_per_cn != null ? num(oda.max_per_cn, 0) : null;

        odaCharge = chargedWeight * ratePerKg;
        if (odaCharge < minPerCn) odaCharge = minPerCn;
        if (maxPerCn != null && odaCharge > maxPerCn) odaCharge = maxPerCn;
      }
    }
  }

  /* ------------------- (Optional) FOV, FSC, other charges ------------------ */
  // For now we keep them zero; you can later extend using
  // contract_insurance_rules, fuel_base_pct, etc.

  const fov = 0;
  const fsc = 0;
  const appointment = 0;
  const greenTax = 0;
  const otherCharges = 0;

  const lineSubtotal =
    baseFreight +
    docketCharge +
    odaCharge +
    fov +
    fsc +
    appointment +
    greenTax +
    otherCharges;

  const gstPct = num(contract.taxes_gst_pct, 0);
  const taxAmount = (lineSubtotal * gstPct) / 100;
  const lineTotal = lineSubtotal + taxAmount;

  return {
    chargedWeight,
    baseFreight,
    docketCharge,
    odaCharge,
    fov,
    fsc,
    appointment,
    greenTax,
    otherCharges,
    lineSubtotal,
    taxAmount,
    lineTotal,
  };
}

/* ----------------------------- PREVIEW endpoint ---------------------------- */

export const previewInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      client_id,
      contract_id,
      period_start,
      period_end,
    }: {
      client_id: string;
      contract_id?: string;
      period_start: string;
      period_end: string;
    } = req.body || {};

    if (!client_id || !period_start || !period_end) {
      return res.status(400).json({
        error: "client_id, period_start and period_end are required",
      });
    }

    const conn = await pool.getConnection();
    try {
      // Load contract (either from body or from first CN)
      let contract: ContractRow | null = null;
      if (contract_id) {
        const [cRows]: any = await conn.query(
          `SELECT id, taxes_gst_pct, min_chargeable_weight_kg, charging_mechanism, docket_charge_per_cn
             FROM contracts
            WHERE id = ?
            LIMIT 1`,
          [contract_id]
        );
        contract = cRows?.[0] || null;
      }

      // Get relevant consignments in the date range
      const params: any[] = [client_id, period_start, period_end];
      let cnSql = `
        SELECT
          id, cn_number, booking_datetime, client_id, contract_id,
          shipper_city, consignee_city, consignee_name, consignee_postcode,
          actual_weight_kg, volumetric_weight_kg, declared_value_rs
        FROM consignments
        WHERE client_id = ?
          AND booking_datetime >= ?
          AND booking_datetime < DATE_ADD(?, INTERVAL 1 DAY)
      `;

      if (contract_id) {
        cnSql += " AND contract_id = ?";
        params.push(contract_id);
      }

      const [cnRows]: any = await conn.query(cnSql, params);

      if (!cnRows.length) {
        return res.status(200).json({
          summary: {
            consignments_count: 0,
            total_before_tax: 0,
            tax_amount: 0,
            total_amount: 0,
          },
          lines: [],
        });
      }

      // If contract not provided, infer from first consignment
      if (!contract) {
        const anyContractId = cnRows[0].contract_id;
        if (!anyContractId) {
          return res.status(400).json({
            error:
              "No contract_id provided and consignments have no contract_id.",
          });
        }
        const [cRows]: any = await conn.query(
          `SELECT id, taxes_gst_pct, min_chargeable_weight_kg, charging_mechanism, docket_charge_per_cn
             FROM contracts
            WHERE id = ?
            LIMIT 1`,
          [anyContractId]
        );
        contract = cRows?.[0] || null;
      }

      if (!contract) {
        return res.status(400).json({ error: "Contract not found." });
      }

      let totalBeforeTax = 0;
      let totalTax = 0;
      let totalAmount = 0;

      const lines = [];
      for (const raw of cnRows as ConsignmentRow[]) {
        const charges = await calculateChargesForConsignment(
          raw,
          contract as ContractRow,
          conn
        );

        totalBeforeTax += charges.lineSubtotal;
        totalTax += charges.taxAmount;
        totalAmount += charges.lineTotal;

        lines.push({
          consignment_id: raw.id,
          cn_number: raw.cn_number,
          booking_datetime: raw.booking_datetime,
          from_city: raw.shipper_city,
          to_city: raw.consignee_city,
          consignee_name: raw.consignee_name,
          actual_weight_kg: num(raw.actual_weight_kg, 0),
          volumetric_weight_kg: num(raw.volumetric_weight_kg, 0),
          charged_weight_kg: charges.chargedWeight,
          base_freight_rs: charges.baseFreight,
          docket_charge_rs: charges.docketCharge,
          fov_rs: charges.fov,
          fsc_rs: charges.fsc,
          oda_rs: charges.odaCharge,
          appointment_rs: charges.appointment,
          green_tax_rs: charges.greenTax,
          other_charges_rs: charges.otherCharges,
          line_subtotal_rs: charges.lineSubtotal,
          tax_amount_rs: charges.taxAmount,
          line_total_rs: charges.lineTotal,
        });
      }

      return res.json({
        summary: {
          consignments_count: lines.length,
          total_before_tax: totalBeforeTax,
          tax_amount: totalTax,
          total_amount: totalAmount,
          gst_pct: num((contract as any).taxes_gst_pct, 0),
        },
        lines,
      });
    } finally {
      conn.release();
    }
  }
);

/* ---------------------------- CREATE endpoint ----------------------------- */

export const createInvoice = asyncHandler(
  async (req: Request, res: Response) => {
    const {
      client_id,
      contract_id,
      period_start,
      period_end,
      invoice_date,
      invoice_number,
      status,
    }: {
      client_id: string;
      contract_id?: string;
      period_start: string;
      period_end: string;
      invoice_date?: string;
      invoice_number?: string;
      status?: "DRAFT" | "FINAL";
    } = req.body || {};

    if (!client_id || !period_start || !period_end) {
      return res.status(400).json({
        error: "client_id, period_start and period_end are required",
      });
    }

    const conn = await pool.getConnection();
    const invoiceId = randomUUID();

    try {
      await conn.beginTransaction();

      // Load contract similar to preview
      let contract: ContractRow | null = null;
      if (contract_id) {
        const [cRows]: any = await conn.query(
          `SELECT id, taxes_gst_pct, min_chargeable_weight_kg, charging_mechanism, docket_charge_per_cn
             FROM contracts
            WHERE id = ?
            LIMIT 1`,
          [contract_id]
        );
        contract = cRows?.[0] || null;
      }

      const params: any[] = [client_id, period_start, period_end];
      let cnSql = `
        SELECT
          id, cn_number, booking_datetime, client_id, contract_id,
          shipper_city, consignee_city, consignee_name, consignee_postcode,
          actual_weight_kg, volumetric_weight_kg, declared_value_rs
        FROM consignments
        WHERE client_id = ?
          AND booking_datetime >= ?
          AND booking_datetime < DATE_ADD(?, INTERVAL 1 DAY)
      `;

      if (contract_id) {
        cnSql += " AND contract_id = ?";
        params.push(contract_id);
      }

      const [cnRows]: any = await conn.query(cnSql, params);

      if (!cnRows.length) {
        await conn.rollback();
        return res
          .status(400)
          .json({ error: "No consignments found for given filters." });
      }

      if (!contract) {
        const anyContractId = cnRows[0].contract_id;
        if (!anyContractId) {
          await conn.rollback();
          return res.status(400).json({
            error:
              "No contract_id provided and consignments have no contract_id.",
          });
        }
        const [cRows]: any = await conn.query(
          `SELECT id, taxes_gst_pct, min_chargeable_weight_kg, charging_mechanism, docket_charge_per_cn
             FROM contracts
            WHERE id = ?
            LIMIT 1`,
          [anyContractId]
        );
        contract = cRows?.[0] || null;
      }

      if (!contract) {
        await conn.rollback();
        return res.status(400).json({ error: "Contract not found." });
      }

      let totalBeforeTax = 0;
      let totalTax = 0;
      let totalAmount = 0;

      const linesToInsert: any[] = [];
      for (const raw of cnRows as ConsignmentRow[]) {
        const charges = await calculateChargesForConsignment(
          raw,
          contract as ContractRow,
          conn
        );

        totalBeforeTax += charges.lineSubtotal;
        totalTax += charges.taxAmount;
        totalAmount += charges.lineTotal;

        const lineId = randomUUID();
        linesToInsert.push([
          lineId,
          invoiceId,
          raw.id,
          raw.cn_number,
          raw.booking_datetime,
          raw.shipper_city,
          raw.consignee_city,
          raw.consignee_name,
          num(raw.actual_weight_kg, 0),
          num(raw.volumetric_weight_kg, 0),
          charges.chargedWeight,
          charges.baseFreight,
          charges.docketCharge,
          charges.fov,
          charges.fsc,
          charges.odaCharge,
          charges.appointment,
          charges.greenTax,
          charges.otherCharges,
          charges.lineSubtotal,
          charges.taxAmount,
          charges.lineTotal,
        ]);
      }

      const finalInvoiceNumber =
        invoice_number || generateInvoiceNumber(client_id);
      const finalInvoiceDate = invoice_date || dtOnly(new Date().toISOString());
      const gstPct = num((contract as any).taxes_gst_pct, 0);

      await conn.query(
        `INSERT INTO invoices (
          id, client_id, contract_id, invoice_number, invoice_date,
          period_start, period_end, currency,
          total_before_tax, tax_amount, total_amount,
          gst_pct, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'INR', ?, ?, ?, ?, ?)`,
        [
          invoiceId,
          client_id,
          (contract as any).id,
          finalInvoiceNumber,
          finalInvoiceDate,
          period_start,
          period_end,
          totalBeforeTax,
          totalTax,
          totalAmount,
          gstPct,
          status || "FINAL",
        ]
      );

      if (linesToInsert.length) {
        await conn.query(
          `INSERT INTO invoice_lines (
            id, invoice_id, consignment_id, cn_number,
            booking_datetime, from_city, to_city, consignee_name,
            actual_weight_kg, volumetric_weight_kg, charged_weight_kg,
            base_freight_rs, docket_charge_rs, fov_rs, fsc_rs, oda_rs,
            appointment_rs, green_tax_rs, other_charges_rs,
            line_subtotal_rs, tax_amount_rs, line_total_rs
          ) VALUES ${linesToInsert
            .map(
              () =>
                "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
            )
            .join(",")}`,
          linesToInsert.flat()
        );
      }

      await conn.commit();

      return res.status(201).json({
        ok: true,
        invoice_id: invoiceId,
        invoice_number: finalInvoiceNumber,
        summary: {
          consignments_count: linesToInsert.length,
          total_before_tax: totalBeforeTax,
          tax_amount: totalTax,
          total_amount: totalAmount,
          gst_pct: gstPct,
        },
      });
    } catch (err) {
      try {
        await conn.rollback();
      } catch {}
      throw err;
    } finally {
      conn.release();
    }
  }
);

/* ------------------------------ LIST endpoint ------------------------------ */

export const listInvoices = asyncHandler(
  async (req: Request, res: Response) => {
    const { client_id } = req.query;

    const params: any[] = [];
    let sql = `
      SELECT id, client_id, contract_id, invoice_number,
             invoice_date, period_start, period_end,
             total_before_tax, tax_amount, total_amount, status
        FROM invoices
    `;
    if (client_id) {
      sql += " WHERE client_id = ?";
      params.push(client_id);
    }
    sql += " ORDER BY invoice_date DESC, created_at DESC LIMIT 200";

    const [rows]: any = await pool.query(sql, params);
    res.json(rows);
  }
);

/* ----------------------------- DETAIL endpoint ----------------------------- */

export const getInvoice = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const [[inv]]: any = await pool.query(
    `SELECT *
         FROM invoices
        WHERE id = ?`,
    [id]
  );
  if (!inv) {
    return res.status(404).json({ error: "Invoice not found" });
  }

  const [lines]: any = await pool.query(
    `SELECT *
         FROM invoice_lines
        WHERE invoice_id = ?
        ORDER BY booking_datetime ASC`,
    [id]
  );

  res.json({ invoice: inv, lines });
});
