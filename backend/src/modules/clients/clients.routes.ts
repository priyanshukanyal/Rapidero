import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import { createClient, listClients } from "./clients.controller.js";
import * as ctrl from "./clients.controller.js";

const r = Router();
r.post("/", authGuard("ADMIN", "OPS"), createClient);
r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listClients);
r.get("/me/dashboard", authGuard("CLIENT"), ctrl.clientDashboard);
export default r;
