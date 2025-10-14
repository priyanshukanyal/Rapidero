import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/mysql.js";

export async function ensureConsignmentAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const roles: string[] = (req as any).user?.roles || [];
  if (roles.includes("ADMIN") || roles.includes("OPS")) return next();

  const clientId: string | null = (req as any).user?.client_id ?? null;
  if (!clientId) return res.status(403).json({ error: "Forbidden" });

  const [rows] = await pool.query(
    "SELECT client_id FROM consignments WHERE id=?",
    [req.params.id]
  );
  const row = (rows as any[])[0];
  if (!row) return res.status(404).json({ error: "Not found" });
  if (row.client_id !== clientId)
    return res.status(404).json({ error: "Not found" }); // prevent IDOR

  next();
}
