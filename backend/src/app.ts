import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { env } from "./config/env.js";

import userRoutes from "./modules/users/users.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import clientRoutes from "./modules/clients/clients.routes.js";
import contractRoutes from "./modules/contracts/contracts.routes.js";
import consignmentRoutes from "./modules/consignments/consignments.routes.js";
import rivigoRoutes from "./routes/rivigo.js";

// ⬇️ NEW: invoices routes
import invoiceRoutes from "./modules/invoices/invoices.routes.js";

const app = express();

app.use(cors());
const API_PREFIX = env.API_PREFIX || "/api/v1";

app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use(express.static(path.resolve(__dirname, "./public")));

app.get("/health", (_req, res) =>
  res.json({ ok: true, env: env.NODE_ENV, ts: new Date().toISOString() })
);
app.get(`${API_PREFIX}/health`, (_req, res) => res.json({ ok: true }));

/* ---------- API routes ---------- */
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/consignments`, consignmentRoutes);
app.use(`${API_PREFIX}/rivigo`, rivigoRoutes);

// ⬇️ NEW: mount invoices
app.use(`${API_PREFIX}/invoices`, invoiceRoutes); // 👈 NEW

/* ---------- Error handler ---------- */
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("💥 Uncaught error:", err);
  const status = err?.status || 500;
  const msg = err?.sqlMessage || err?.message || "Internal Server Error";
  return res.status(status).json({
    error: msg,
    code: err?.code,
    detail: err?.sql || undefined,
  });
});

export default app;
