import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";

import { notFound, errorHandler } from "./middleware/errorHandlers.js";
import { env } from "./config/env.js";

import userRoutes from "./modules/users/users.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import clientRoutes from "./modules/clients/clients.routes.js";
import contractRoutes from "./modules/contracts/contracts.routes.js";
import consignmentRoutes from "./modules/consignments/consignments.routes.js";
import rivigoRoutes from "./routes/rivigo.js";

const app = express();

/* ---------- Config ---------- */
const API_PREFIX = env.API_PREFIX || "/api/v1";

/* CORS: comma-separated env works for Azure App Settings too.
   IMPORTANT: CORS_ORIGIN must be bare origins (no paths), e.g.
   https://<app>.azurewebsites.net,http://localhost:5173
*/
const corsOrigins = (env.CORS_ORIGIN || "http://localhost:5173")
  .split(",")
  .map((s: string) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400, // cache preflight for a day
  })
);

/* Body + logs */
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

/* ---------- Health ---------- */
app.get("/health", (_req, res) =>
  res.json({ ok: true, env: env.NODE_ENV, ts: new Date().toISOString() })
);
app.get(`${API_PREFIX}/health`, (_req, res) => res.json({ ok: true }));

/* ---------- Static storage (server-generated files) ----------
   Use path relative to compiled JS at /dist so it works on Azure.
   (wwwroot/dist/... -> resolve to ../storage)
*/
app.use(
  "/storage",
  express.static(
    path.resolve(path.dirname(new URL(import.meta.url).pathname), "../storage"),
    {
      fallthrough: true,
      maxAge: "30d",
    }
  )
);

/* ---------- API routes (all under API_PREFIX for consistency) ---------- */
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/consignments`, consignmentRoutes);
app.use(`${API_PREFIX}/rivigo`, rivigoRoutes);

/* ---------- Central error (must be before notFound/errorHandler) ---------- */
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

/* 404 + final error handler */
app.use(notFound);
app.use(errorHandler);

export default app;
