import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { client_name, email, phone, gstin, pan, website } = req.body || {};

    if (!client_name) {
      return res.status(400).json({ error: "client_name is required" });
    }

    // 🔹 Step 1: Get the last client code
    const [rows]: any = await pool.query(
      `SELECT client_code FROM clients ORDER BY created_at DESC LIMIT 1`
    );

    let newCode = "CL001"; // default for first client
    if (rows.length > 0 && rows[0].client_code) {
      const lastCode = rows[0].client_code;
      const lastNumber = parseInt(lastCode.replace("CL", "")) || 0;
      const nextNumber = lastNumber + 1;
      newCode = "CL" + nextNumber.toString().padStart(3, "0");
    }

    // 🔹 Step 2: Insert new client with generated code
    await pool.query(
      `INSERT INTO clients (id, client_code, client_name, email, phone, gstin, pan, website)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
      [
        newCode,
        client_name,
        email || null,
        phone || null,
        gstin || null,
        pan || null,
        website || null,
      ]
    );

    res.status(201).json({ ok: true, client_code: newCode });
  }
);

export const listClients = asyncHandler(
  async (_req: Request, res: Response) => {
    const [rows]: any = await pool.query(
      `SELECT * FROM clients ORDER BY created_at DESC LIMIT 200`
    );
    res.json(rows);
  }
);

export async function clientDashboard(req: Request, res: Response) {
  const clientId = (req as any).user?.client_id;
  if (!clientId) return res.status(403).json({ error: "Forbidden" });

  // status rollup
  const [rows] = await pool.query(
    `SELECT
       SUM(current_status_code='DELIVERED')                         AS delivered,
       SUM(current_status_code IN ('IN_TRANSIT','OFD','PICKED'))    AS in_transit,
       SUM(current_status_code='RTO')                               AS rto,
       COUNT(*)                                                     AS total
     FROM consignments
     WHERE client_id = ?`,
    [clientId]
  );

  // last 30 days new CNs for a tiny trendline (optional)
  const [series] = await pool.query(
    `SELECT DATE(created_at) d, COUNT(*) c
     FROM consignments
     WHERE client_id=? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
     GROUP BY DATE(created_at)
     ORDER BY d`,
    [clientId]
  );

  res.json({ ...(rows as any[])[0], series });
}
