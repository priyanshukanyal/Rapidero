import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const createClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { client_code, client_name, email, phone, gstin, pan, website } =
      req.body || {};
    if (!client_code || !client_name)
      return res
        .status(400)
        .json({ error: "client_code & client_name required" });
    await pool.query(
      `INSERT INTO clients (id, client_code, client_name, email, phone, gstin, pan, website)
     VALUES (UUID(),?,?,?,?,?,?,?)`,
      [
        client_code,
        client_name,
        email || null,
        phone || null,
        gstin || null,
        pan || null,
        website || null,
      ]
    );
    res.status(201).json({ ok: true });
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
