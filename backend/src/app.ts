import express from "express";
import cors from "cors";
import morgan from "morgan";
import { notFound, errorHandler } from "./middleware/errorHandlers.js";

import authRoutes from "./modules/auth/auth.routes.js";
import clientRoutes from "./modules/clients/clients.routes.js";
import contractRoutes from "./modules/contracts/contracts.routes.js";
import consignmentRoutes from "./modules/consignments/consignments.routes.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan("dev"));

app.get("/api/v1/health", (_req, res) => res.json({ ok: true }));

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clients", clientRoutes);
app.use("/api/v1/contracts", contractRoutes);
app.use("/api/v1/consignments", consignmentRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
