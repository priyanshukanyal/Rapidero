import type { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { pool } from "../../db/mysql.js";
import { sendMail } from "../../utils/mailer.js"; // <— from step 3 below
import { env } from "../../config/env.js"; // has APP_ORIGIN + SMTP_*
import { asyncHandler } from "../../utils/asyncHandler.js";

export const listUsersByClient = asyncHandler(
  async (req: Request, res: Response) => {
    const { clientId } = req.params;
    const [rows] = await pool.query(
      `SELECT u.id AS user_id, u.email, u.name,
            GROUP_CONCAT(r.code ORDER BY r.code) AS roles
     FROM client_users cu
     JOIN users u ON u.id = cu.user_id
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE cu.client_id = ?
     GROUP BY u.id
     ORDER BY u.email`,
      [clientId]
    );
    res.json(rows);
  }
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { userId } = req.params;
    const { new_password } = req.body as { new_password?: string };

    if (!new_password || new_password.length < 8) {
      return res
        .status(400)
        .json({ error: "new_password (min 8 chars) required" });
    }
    const hash = await bcrypt.hash(new_password, 10);
    const [result]: any = await pool.query(
      "UPDATE users SET password_hash=?, updated_at=NOW(6) WHERE id=?",
      [hash, userId]
    );
    if (result.affectedRows === 0)
      return res.status(404).json({ error: "User not found" });
    res.json({ ok: true });
  }
);

async function getUserIdByEmail(conn: any, email: string) {
  const [rows] = await conn.query("SELECT id FROM users WHERE email=?", [
    email,
  ]);
  return (rows as any[])[0]?.id ?? null;
}
async function getRoleIdsByCodes(conn: any, codes: string[]) {
  if (!codes?.length) return {};
  const qs = codes.map(() => "?").join(",");
  const [rows] = await conn.query(
    `SELECT id, code FROM roles WHERE code IN (${qs})`,
    codes
  );
  const map: Record<string, string> = {};
  for (const r of rows as any[]) map[r.code] = r.id;
  return map;
}

/** POST /users/:userId/roles  { roles: string[], mode?: "replace"|"add", client_id?: string } */
export async function assignRoles(req: Request, res: Response) {
  const { userId } = req.params;
  const {
    roles = [],
    mode = "replace",
    client_id,
  } = req.body as {
    roles: string[];
    mode?: "replace" | "add";
    client_id?: string;
  };
  if (!roles.length)
    return res.status(400).json({ error: "roles[] is required" });

  const conn = await pool.getConnection();
  try {
    const roleIdsMap = await getRoleIdsByCodes(conn, roles);
    const missing = roles.filter((r) => !roleIdsMap[r]);
    if (missing.length)
      return res
        .status(400)
        .json({ error: `Unknown roles: ${missing.join(", ")}` });

    await conn.beginTransaction();

    if (mode === "replace") {
      await conn.query("DELETE FROM user_roles WHERE user_id=?", [userId]);
    }
    for (const code of roles) {
      await conn.query(
        "INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?,?)",
        [userId, roleIdsMap[code]]
      );
    }

    if (
      client_id &&
      (roles.includes("CLIENT") || roles.includes("FIELD_EXEC"))
    ) {
      await conn.query(
        "INSERT IGNORE INTO client_users (client_id, user_id) VALUES (?,?)",
        [client_id, userId]
      );
    }

    await conn.commit();
    res.json({ ok: true, user_id: userId, roles });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: "Failed to assign roles" });
  } finally {
    conn.release();
  }
}

/** POST /users/invite
 * body: { email, name, password?, roles:[], client_id? }
 * - creates/updates user
 * - sets/assigns roles
 * - links client tenant if CLIENT/FE
 * - emails portal link + temp password
 */
export async function inviteUser(req: Request, res: Response) {
  const {
    email,
    name,
    password,
    roles = [],
    client_id,
  } = req.body as {
    email: string;
    name: string;
    password?: string;
    roles: string[];
    client_id?: string;
  };
  if (!email || !name || !roles.length)
    return res.status(400).json({ error: "email, name, roles[] required" });

  const conn = await pool.getConnection();
  try {
    const roleIdsMap = await getRoleIdsByCodes(conn, roles);
    const missing = roles.filter((r) => !roleIdsMap[r]);
    if (missing.length)
      return res
        .status(400)
        .json({ error: `Unknown roles: ${missing.join(", ")}` });

    await conn.beginTransaction();

    let userId = await getUserIdByEmail(conn, email);
    const temp = password || Math.random().toString(36).slice(2, 10) + "Aa1!";
    const hash = bcrypt.hashSync(temp, 10);

    if (!userId) {
      await conn.query(
        "INSERT INTO users (id, email, password_hash, name, is_active) VALUES (UUID(),?,?,?,1)",
        [email, hash, name]
      );
      userId = await getUserIdByEmail(conn, email);
    } else {
      await conn.query("UPDATE users SET name=?, password_hash=? WHERE id=?", [
        name,
        hash,
        userId,
      ]);
    }

    for (const code of roles) {
      await conn.query(
        "INSERT INTO user_roles (user_id, role_id) VALUES (?,?)",
        [userId, roleIdsMap[code]]
      );
    }

    if (
      client_id &&
      (roles.includes("CLIENT") || roles.includes("FIELD_EXEC"))
    ) {
      await conn.query(
        "INSERT INTO client_users (client_id, user_id) VALUES (?,?)",
        [client_id, userId]
      );
    }

    await conn.commit();

    const loginUrl = `${env.APP_ORIGIN}/login`;
    await sendMail({
      to: email,
      subject: "Your Rapidero Logistics portal access",
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif">
          <h2>Welcome to Rapidero Logistics</h2>
          <p>Hi ${name}, your portal access is ready.</p>
          <ul>
            <li><b>Portal:</b> <a href="${loginUrl}">${loginUrl}</a></li>
            <li><b>Email:</b> ${email}</li>
            <li><b>Temporary Password:</b> ${temp}</li>
            <li><b>Profile:</b> ${roles.join(", ")}</li>
          </ul>
          <p>Please log in and change your password immediately.</p>
        </div>`,
      text: `Portal: ${loginUrl}\nEmail: ${email}\nTemp Password: ${temp}\nRoles: ${roles.join(
        ", "
      )}`,
    });

    res.status(201).json({ ok: true, user_id: userId, invited: true });
  } catch (e) {
    await conn.rollback();
    console.error(e);
    res.status(500).json({ error: "Failed to invite user" });
  } finally {
    conn.release();
  }
}
// src/modules/users/users.controller.ts (add)
export async function listUsers(_req: Request, res: Response) {
  const [rows] = await pool.query(`
    SELECT u.id, u.email, u.name, u.phone, u.is_active, u.created_at,
           COALESCE(GROUP_CONCAT(r.code ORDER BY r.code), '') AS role_codes
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 500
  `);
  const data = (rows as any[]).map((r) => ({
    ...r,
    roles: r.role_codes ? String(r.role_codes).split(",") : [],
  }));
  res.json(data);
}

export async function deleteUser(req: Request, res: Response) {
  const { userId } = req.params;
  await pool.query("DELETE FROM users WHERE id=?", [userId]);
  res.json({ ok: true });
}
