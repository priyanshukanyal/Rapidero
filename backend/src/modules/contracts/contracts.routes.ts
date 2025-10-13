import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import {
  createContract,
  getContract,
  listContracts,
} from "./contracts.controller.js";

const r = Router();
r.post("/", authGuard("ADMIN", "OPS"), createContract);
r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listContracts);
r.get("/:id", authGuard("ADMIN", "OPS", "CLIENT"), getContract);
export default r;
