// src/modules/clients/clients.controller.ts

import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { sendMail } from "../../utils/mailer.js";

/**
 * Create a new client
 */
export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { client_name, email, phone, gstin, pan, website } = req.body || {};
    if (!client_name) {
      return res.status(400).json({ error: "client_name is required" });
    }

    /* --------------------------------------------------------------
     * 1) Duplicate check by email, phone, gstin, pan, website
     * ------------------------------------------------------------ */
    const fields: Record<string, string | undefined> = {
      email,
      phone,
      gstin,
      pan,
      website,
    };

    const conditions: string[] = [];
    const params: any[] = [];

    // Build WHERE clause dynamically for non-empty values
    for (const [col, val] of Object.entries(fields)) {
      if (val && String(val).trim() !== "") {
        conditions.push(`${col} = ?`);
        params.push(val.trim());
      }
    }

    if (conditions.length > 0) {
      const where = conditions.join(" OR ");

      const [dupes]: any = await pool.query(
        `
        SELECT id, client_code, client_name, email, phone, gstin, pan, website
        FROM clients
        WHERE ${where}
        LIMIT 1
        `,
        params
      );

      if (dupes.length > 0) {
        const existing = dupes[0];

        // Work out which fields matched
        const matched_fields: string[] = [];
        if (email && existing.email === email) matched_fields.push("email");
        if (phone && existing.phone === phone) matched_fields.push("phone");
        if (gstin && existing.gstin === gstin) matched_fields.push("gstin");
        if (pan && existing.pan === pan) matched_fields.push("pan");
        if (website && existing.website === website)
          matched_fields.push("website");

        return res.status(409).json({
          error: "Client already exists with same details",
          message: `A client already exists with matching ${matched_fields.join(
            ", "
          )}.`,
          existing_client: existing,
          matched_fields,
        });
      }
    }

    /* --------------------------------------------------------------
     * 2) Generate next client_code (CL001, CL002, ...)
     * ------------------------------------------------------------ */
    const [rows]: any = await pool.query(
      `
      SELECT client_code
      FROM clients
      WHERE client_code LIKE 'CL%'
      ORDER BY CAST(SUBSTRING(client_code, 3) AS UNSIGNED) DESC
      LIMIT 1
      `
    );

    let newCode = "CL001";
    if (rows.length > 0 && rows[0].client_code) {
      const lastCode: string = rows[0].client_code;
      const lastNumber = parseInt(lastCode.replace("CL", ""), 10) || 0;
      newCode = "CL" + String(lastNumber + 1).padStart(3, "0");
    }

    /* --------------------------------------------------------------
     * 3) Pre-generate UUID and insert client
     * ------------------------------------------------------------ */
    const [[uuidRow]]: any = await pool.query(`SELECT UUID() AS id`);
    const newId: string = uuidRow.id;

    await pool.query(
      `
      INSERT INTO clients (
        id,
        client_code,
        client_name,
        email,
        phone,
        gstin,
        pan,
        website
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        newId,
        newCode,
        client_name,
        email || null,
        phone || null,
        gstin || null,
        pan || null,
        website || null,
      ]
    );

    const client = {
      id: newId,
      client_code: newCode,
      client_name,
      email: email || null,
      phone: phone || null,
      gstin: gstin || null,
      pan: pan || null,
      website: website || null,
    };

    return res.status(201).json(client);
  }
);
/**
 * List clients
 * - ADMIN / OPS → see all
 * - CLIENT / FIELD_EXEC → see only their client
 */
export const listClients = asyncHandler(async (req: Request, res: Response) => {
  const user = (req as any).user;

  const isClientPortal =
    user?.roles?.includes("CLIENT") || user?.roles?.includes("FIELD_EXEC");

  if (isClientPortal && user?.client_id) {
    const [rows]: any = await pool.query(
      `
        SELECT id, client_code, client_name, email, phone, created_at
        FROM clients
        WHERE id = ?
        LIMIT 1
        `,
      [user.client_id]
    );
    return res.json(rows);
  }

  const [rows]: any = await pool.query(
    `
      SELECT id, client_code, client_name, email, phone, created_at
      FROM clients
      ORDER BY created_at DESC
      LIMIT 200
      `
  );

  return res.json(rows);
});

/**
 * Delete client
 * - Only ADMIN / OPS via routes
 * - Blocks delete if client has contracts / consignments
 */
// Helper: send contract cancellation email when client is deleted
async function sendClientContractCancellationEmail(
  client: { client_name: string; client_code: string; email?: string | null },
  contractsCount: number
) {
  if (!client.email) {
    console.warn(
      `[mailer] Client ${client.client_code} has no email, skipping cancellation email.`
    );
    return;
  }

  const subject = "Your Rapidero contract has been cancelled";

  const text = `Dear ${client.client_name},

Your ${contractsCount} contract(s) with Rapidero have been cancelled as part of a client account deletion request.

If you believe this action was performed in error, please contact your Rapidero relationship manager immediately.

Regards,
Rapidero Team`;

  const html = `
    <p>Dear <strong>${client.client_name}</strong>,</p>
    <p>Your <strong>${contractsCount}</strong> contract(s) with <strong>Rapidero</strong> have been cancelled as part of a client account deletion request.</p>
    <p>If you believe this action was performed in error, please contact your Rapidero relationship manager immediately.</p>
    <br/>
    <p>Regards,<br/>Rapidero Team</p>
  `;

  try {
    await sendMail({
      to: client.email,
      subject,
      html,
      text,
    });
    console.log(
      `[mailer] Cancellation email sent to ${client.email} for ${contractsCount} contract(s).`
    );
  } catch (err) {
    console.error(
      `[mailer] Failed to send cancellation email to ${client.email}:`,
      err
    );
    // We DO NOT fail the delete because of email failure
  }
}

/**
 * Delete client
 * - If consignments exist → hard block (`HAS_CONSIGNMENTS`)
 * - If contracts exist:
 *      1st call (no force) → 409 (`HAS_CONTRACTS`) + latest term_end
 *      2nd call (force=1)  → delete contracts, send email, then delete client
 */
export const deleteClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Client id is required" });
    }

    const force =
      req.query.force === "1" ||
      req.query.force === "true" ||
      req.query.force === "yes";

    // 1) Check if client exists
    const [[client]]: any = await pool.query(
      `SELECT id, client_code, client_name, email
       FROM clients
       WHERE id = ?
       LIMIT 1`,
      [id]
    );

    if (!client) {
      return res.status(404).json({ error: "Client not found" });
    }

    // 2) Check consignments – hard block (you generally don't want to delete such clients)
    const [[cnCount]]: any = await pool.query(
      `SELECT COUNT(*) AS c
       FROM consignments
       WHERE client_id = ?`,
      [id]
    );

    const consignmentsCount = Number(cnCount.c || 0);

    if (consignmentsCount > 0) {
      return res.status(400).json({
        error: "Client cannot be deleted because there are linked consignments",
        reason: "HAS_CONSIGNMENTS",
        consignments_count: consignmentsCount,
      });
    }

    // 3) Check contracts (using your schema: term_end is the contract "deadline")
    const [[contractStats]]: any = await pool.query(
      `
      SELECT
        COUNT(*)      AS c,
        MAX(term_end) AS latest_contract_end_date
      FROM contracts
      WHERE client_id = ?
      `,
      [id]
    );

    const contractsCount = Number(contractStats.c || 0);
    const latestEndDate = contractStats.latest_contract_end_date || null;

    // 3a) If contracts exist and this is NOT a force delete → tell frontend to confirm
    if (contractsCount > 0 && !force) {
      return res.status(409).json({
        error:
          "Client has existing contracts. Confirm if you still want to delete.",
        reason: "HAS_CONTRACTS",
        contracts_count: contractsCount,
        latest_contract_end_date: latestEndDate,
        client: {
          id: client.id,
          client_code: client.client_code,
          client_name: client.client_name,
          email: client.email,
        },
      });
    }

    // 3b) If contracts exist AND force delete is requested → delete contracts + email
    if (contractsCount > 0 && force) {
      // No status/cancelled_at in schema → we physically delete contracts
      await pool.query(
        `DELETE FROM contracts
         WHERE client_id = ?`,
        [id]
      );

      await sendClientContractCancellationEmail(client, contractsCount);
    }

    // 4) Delete the client itself
    const [result]: any = await pool.query(
      `DELETE FROM clients
       WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return res.status(500).json({ error: "Failed to delete client" });
    }

    return res.json({
      ok: true,
      message: `Client ${client.client_code || ""} deleted`.trim(),
      contracts_deleted: contractsCount > 0,
      contracts_count: contractsCount,
    });
  }
);
/**
 * Client dashboard
 */
export const clientDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const clientId: string | null = (req as any).user?.client_id ?? null;
    if (!clientId) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const [[sum]]: any = await pool.query(
      `
      SELECT
        COALESCE(SUM(current_status_code='DELIVERED'), 0)                        AS delivered,
        COALESCE(SUM(current_status_code IN ('IN_TRANSIT','OFD','PICKED')), 0)  AS in_transit,
        COALESCE(SUM(current_status_code='RTO'), 0)                              AS rto,
        COALESCE(COUNT(*), 0)                                                   AS total
      FROM consignments
      WHERE client_id = ?
      `,
      [clientId]
    );

    const [series]: any = await pool.query(
      `
      SELECT DATE(created_at) AS d, COUNT(*) AS c
      FROM consignments
      WHERE client_id = ?
        AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d
      `,
      [clientId]
    );

    const resp = {
      total: Number(sum?.total || 0),
      delivered: Number(sum?.delivered || 0),
      in_transit: Number(sum?.in_transit || 0),
      rto: Number(sum?.rto || 0),
      series: (series as any[]).map((r) => ({ d: r.d, c: Number(r.c) })),
    };

    res.json(resp);
  }
);
