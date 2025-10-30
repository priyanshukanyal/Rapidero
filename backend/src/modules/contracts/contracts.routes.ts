// import { Router } from "express";
// import { authGuard } from "../../middleware/authGuard.js";
// import {
//   createContract,
//   getContract,
//   listContracts,
// } from "./contracts.controller.js";

// const r = Router();
// r.post("/", authGuard("ADMIN", "OPS"), createContract);
// r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listContracts);
// r.get("/:id", authGuard("ADMIN", "OPS", "CLIENT"), getContract);
// export default r;
import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import {
  createContract,
  getContract,
  listContracts,
  listMyContracts,
} from "./contracts.controller.js";

const r = Router();

r.post("/", authGuard("ADMIN", "OPS"), createContract);

// ADMIN/OPS list; CLIENT sees only theirs (enforced in controller)
r.get("/", authGuard("ADMIN", "OPS", "CLIENT"), listContracts);

// Optional dedicated "mine" endpoint (client portal)
r.get("/mine", authGuard("CLIENT"), listMyContracts);

r.get("/:id", authGuard("ADMIN", "OPS", "CLIENT"), getContract);
// src/routes/contracts.ts
export default r;
