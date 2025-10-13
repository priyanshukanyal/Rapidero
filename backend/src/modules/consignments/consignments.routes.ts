import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import {
  createCnFromUI,
  getCnWithDetails,
} from "./consignments.ui.controller.js";

const r = Router();
r.post("/ui", authGuard("ADMIN", "OPS", "CLIENT"), createCnFromUI);
r.get("/ui/:cnNumber", authGuard("ADMIN", "OPS", "CLIENT"), getCnWithDetails);
export default r;
