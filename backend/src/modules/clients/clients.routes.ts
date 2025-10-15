import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import {
  createClient,
  listClients,
  clientDashboard,
} from "./clients.controller.js";

const r = Router();

// Admin/Ops can create & list
r.post("/", authGuard("ADMIN", "OPS"), createClient);
r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listClients);

// Client/Field Exec dashboard (JWT must include client_id)
r.get("/me/dashboard", authGuard("CLIENT", "FIELD_EXEC"), clientDashboard);

export default r;
