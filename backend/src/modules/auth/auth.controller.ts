import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../../db/mysql.js";
import { signToken } from "../../utils/jwt.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

export const bootstrapAdmin = asyncHandler(
  async (req: Request, res: Response) => {
    const { email, password, name } = req.body || {};
    if (!email || !password)
      return res.status(400).json({ error: "email & password required" });

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      // Ensure roles exist
      const roles = ["ADMIN", "OPS", "CLIENT", "FIELD_EXEC"];
      for (const code of roles) {
        await conn.query(
          "INSERT IGNORE INTO roles (id, code, name) VALUES (UUID(), ?, ?)",
          [code, code]
        );
      }

      // Upsert user
      const hash = await bcrypt.hash(password, 10);
      const [[u]]: any = await conn.query(
        "SELECT id FROM users WHERE email=? LIMIT 1",
        [email]
      );
      let userId = u?.id;
      if (!userId) {
        await conn.query(
          "INSERT INTO users (id, email, password_hash, name, is_active) VALUES (UUID(),?,?,?,1)",
          [email, hash, name || "Admin"] // <— only three params after email
        );
        const [[nu]]: any = await conn.query(
          "SELECT id FROM users WHERE email=? LIMIT 1",
          [email]
        );
        userId = nu.id;
      } else {
        await conn.query(
          "UPDATE users SET password_hash=?, name=? WHERE id=?",
          [hash, name || "Admin", userId]
        );
      }

      // Grant ADMIN
      const [[r]]: any = await conn.query(
        'SELECT id FROM roles WHERE code="ADMIN" LIMIT 1'
      );
      await conn.query(
        "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)",
        [userId, r.id]
      );

      await conn.commit();
      res.json({ ok: true, user_id: userId });
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
);

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password)
    return res.status(400).json({ error: "email & password required" });

  const [[u]]: any = await pool.query(
    "SELECT id, password_hash, name, email FROM users WHERE email=? LIMIT 1",
    [email]
  );
  if (!u) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, u.password_hash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const [rs]: any = await pool.query(
    `SELECT r.code FROM roles r
     JOIN user_roles ur ON ur.role_id=r.id
     WHERE ur.user_id=?`,
    [u.id]
  );
  const roles = rs.map((x: any) => x.code);
  const token = signToken({ sub: u.id, email: u.email, roles });
  await pool.query("UPDATE users SET last_login_at=NOW(6) WHERE id=?", [u.id]);
  res.json({ token, user: { id: u.id, name: u.name, email: u.email, roles } });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});
