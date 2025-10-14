import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import { ensureConsignmentAccess } from "../../middleware/ensureConsignmentAccess.js";
import * as ctrl from "./consignments.controller.js";

const r = Router();

// All routes require auth
r.use(authGuard("ADMIN", "OPS", "CLIENT", "FIELD_EXEC"));

// UI endpoints (create via portal + fetch by CN number)
r.post("/ui", authGuard("ADMIN", "OPS", "CLIENT"), ctrl.createCnFromUI);
r.get(
  "/ui/:cnNumber",
  authGuard("ADMIN", "OPS", "CLIENT"),
  ctrl.getCnWithDetails
);

// Core endpoints (list/detail/tracking)
r.get("/", ctrl.listConsignments);
r.get("/:id", ensureConsignmentAccess, ctrl.getConsignmentById);
r.get("/:id/tracking", ensureConsignmentAccess, ctrl.getTracking);

export default r;
