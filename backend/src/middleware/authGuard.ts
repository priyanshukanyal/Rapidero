import type { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt.js";

export function authGuard(...allowed: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing token" });
    try {
      const payload = verifyToken<any>(token);
      (req as any).user = payload;
      if (
        allowed.length &&
        !payload.roles?.some((r: string) => allowed.includes(r))
      ) {
        return res.status(403).json({ error: "Forbidden" });
      }
      next();
    } catch {
      return res.status(401).json({ error: "Invalid token" });
    }
  };
}
