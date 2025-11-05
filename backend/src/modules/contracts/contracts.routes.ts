// src/modules/contracts/index.routes.ts
import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import {
  createContract,
  getContract,
  listContracts,
  listMyContracts,
  resendContractPdf,
} from "./contracts.controller.js";

const r = Router();

// Create new contract (ADMIN/OPS only)
r.post("/", authGuard("ADMIN", "OPS"), createContract);

// Mixed list: ADMIN/OPS see all (optional client_id filter), CLIENT sees only their client_id
r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listContracts);

// Client-convenience endpoint: "my contracts"
r.get("/mine", authGuard("CLIENT"), listMyContracts);

// Fetch a specific contract
r.get("/:id", authGuard("ADMIN", "OPS", "CLIENT"), getContract);

// Resend/regenerate PDF + email
r.post("/:id/send", authGuard("ADMIN", "OPS", "CLIENT"), resendContractPdf);

export default r;
