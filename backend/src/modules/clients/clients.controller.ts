import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { client_name, email, phone, gstin, pan, website } = req.body || {};
    if (!client_name)
      return res.status(400).json({ error: "client_name is required" });

    // Get last code
    const [rows]: any = await pool.query(
      `SELECT client_code FROM clients ORDER BY created_at DESC LIMIT 1`
    );

    let newCode = "CL001";
    if (rows.length > 0 && rows[0].client_code) {
      const lastCode = rows[0].client_code;
      const lastNumber = parseInt(lastCode.replace("CL", "")) || 0;
      newCode = "CL" + String(lastNumber + 1).padStart(3, "0");
    }

    // Insert client
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

export const clientDashboard = asyncHandler(
  async (req: Request, res: Response) => {
    const clientId: string | null = (req as any).user?.client_id ?? null;
    if (!clientId) return res.status(403).json({ error: "Forbidden" });

    // Rollup — ensure numeric fallback with COALESCE
    const [[sum]]: any = await pool.query(
      `SELECT
       COALESCE(SUM(current_status_code='DELIVERED'), 0)                        AS delivered,
       COALESCE(SUM(current_status_code IN ('IN_TRANSIT','OFD','PICKED')), 0)  AS in_transit,
       COALESCE(SUM(current_status_code='RTO'), 0)                              AS rto,
       COALESCE(COUNT(*), 0)                                                   AS total
     FROM consignments
     WHERE client_id = ?`,
      [clientId]
    );

    // Last 30 days (small trend)
    const [series]: any = await pool.query(
      `SELECT DATE(created_at) AS d, COUNT(*) AS c
       FROM consignments
      WHERE client_id=? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY d`,
      [clientId]
    );

    // Convert to numbers explicitly (MySQL returns strings for aggregates)
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
