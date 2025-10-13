import { Router } from "express";
import { bootstrapAdmin, login, me } from "./auth.controller.js";
import { authGuard } from "../../middleware/authGuard.js";

const r = Router();
r.post("/bootstrap-admin", bootstrapAdmin);
r.post("/login", login);
r.get("/me", authGuard("ADMIN", "OPS", "CLIENT", "FIELD_EXEC"), me);
export default r;
