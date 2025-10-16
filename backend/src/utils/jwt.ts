// import * as jwt from "jsonwebtoken"; // runtime import
// import type { SignOptions, JwtPayload } from "jsonwebtoken"; // type-only
// import { env } from "../config/env.js";

// export type AppJwtPayload = JwtPayload & {
//   sub: string;
//   email: string;
//   roles: string[];
//   client_id: string | null;
// };

// export function signToken(payload: AppJwtPayload, options?: SignOptions) {
//   const opts: SignOptions = { expiresIn: "12h", ...(options ?? {}) };
//   // Extra guard: make sure secret is present
//   if (!env.JWT_SECRET || typeof env.JWT_SECRET !== "string") {
//     throw new Error("JWT secret not configured");
//   }
//   return jwt.sign(payload, env.JWT_SECRET, opts);
// }

// export function verifyToken<T = AppJwtPayload>(token: string): T {
//   return jwt.verify(token, env.JWT_SECRET) as T;
// }
// src/utils/jwt.ts
import jwt from "jsonwebtoken"; // runtime default import (CJS interop)
import type { SignOptions, JwtPayload } from "jsonwebtoken"; // type-only
import { env } from "../config/env.js";

export type AppJwtPayload = JwtPayload & {
  sub: string;
  email: string;
  roles: string[];
  client_id: string | null;
};

export function signToken(payload: AppJwtPayload, options?: SignOptions) {
  const opts: SignOptions = { expiresIn: "12h", ...(options ?? {}) };
  if (!env.JWT_SECRET || typeof env.JWT_SECRET !== "string") {
    throw new Error("JWT secret not configured");
  }
  return jwt.sign(payload, env.JWT_SECRET, opts);
}

export function verifyToken<T = AppJwtPayload>(token: string): T {
  return jwt.verify(token, env.JWT_SECRET) as T;
}
