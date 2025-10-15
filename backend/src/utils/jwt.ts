// src/utils/jwt.ts
import * as jwt from "jsonwebtoken"; // <-- namespace import (runtime)
import type { SignOptions, JwtPayload } from "jsonwebtoken"; // <-- type-only import
import { env } from "../config/env.js";

export type AppJwtPayload = JwtPayload & {
  sub: string;
  email: string;
  roles: string[];
  client_id: string | null;
};

export function signToken(payload: AppJwtPayload, options?: SignOptions) {
  const opts: SignOptions = { expiresIn: "12h", ...(options ?? {}) };
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

export function verifyToken<T = AppJwtPayload>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET) as T;
}
