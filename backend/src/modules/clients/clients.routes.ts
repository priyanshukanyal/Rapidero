// src/modules/clients/clients.routes.ts

import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import {
  createClient,
  listClients,
  clientDashboard,
  deleteClient,
} from "./clients.controller.js";

const r = Router();

// Admin/Ops can create & list & delete
r.post("/", authGuard("ADMIN", "OPS"), createClient);
r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listClients);
r.delete("/:id", authGuard("ADMIN", "OPS"), deleteClient);

// Client/Field Exec dashboard (JWT must include client_id)
r.get("/me/dashboard", authGuard("CLIENT", "FIELD_EXEC"), clientDashboard);

export default r;
