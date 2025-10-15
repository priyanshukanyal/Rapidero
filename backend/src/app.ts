import express from "express";
import cors from "cors";
import morgan from "morgan";
import { notFound, errorHandler } from "./middleware/errorHandlers.js";
import { env } from "./config/env.js";
import userRoutes from "./modules/users/users.routes.js";
import authRoutes from "./modules/auth/auth.routes.js";
import clientRoutes from "./modules/clients/clients.routes.js";
import contractRoutes from "./modules/contracts/contracts.routes.js";
import consignmentRoutes from "./modules/consignments/consignments.routes.js";

const app = express();

// Config
const API_PREFIX = env.API_PREFIX || "/api/v1";
const corsOrigins = env.CORS_ORIGIN
  ? env.CORS_ORIGIN.split(",").map((s) => s.trim())
  : ["http://localhost:5173"];

// Middleware
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

// Health (both plain and prefixed)
app.get("/health", (_req, res) =>
  res.json({ ok: true, env: env.NODE_ENV, ts: new Date().toISOString() })
);
app.get(`${API_PREFIX}/health`, (_req, res) => res.json({ ok: true }));

// API routes
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/contracts`, contractRoutes);
app.use(`${API_PREFIX}/consignments`, consignmentRoutes);
app.use(`${API_PREFIX}/client`, clientRoutes);
app.use("/api/v1/users", userRoutes);
// Errors
app.use(notFound);
app.use(errorHandler);

export default app;
