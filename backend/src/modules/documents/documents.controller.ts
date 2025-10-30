// src/modules/documents/documents.controller.ts
import type { Request, Response } from "express";
import { pool } from "../../db/mysql.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const listDocuments = asyncHandler(
  async (req: Request, res: Response) => {
    const u: any = (req as any).user;
    const docType = String(req.query.doc_type || "");
    const args: any[] = [];
    let sql = `SELECT id, client_id, doc_type, url, meta_json, created_at
             FROM documents`;

    if (u?.roles?.includes("CLIENT")) {
      if (!u.client_id)
        return res.status(409).json({ error: "Client linking missing." });
      sql += ` WHERE client_id=?`;
      args.push(u.client_id);
      if (docType) {
        sql += ` AND doc_type=?`;
        args.push(docType);
      }
    } else {
      const filters: string[] = [];
      if (req.query.client_id) {
        filters.push(`client_id=?`);
        args.push(req.query.client_id);
      }
      if (docType) {
        filters.push(`doc_type=?`);
        args.push(docType);
      }
      if (filters.length) sql += ` WHERE ` + filters.join(" AND ");
    }

    sql += ` ORDER BY created_at DESC LIMIT 200`;
    const [rows]: any = await pool.query(sql, args);
    res.json(rows);
  }
);
