// src/modules/users/users.routes.ts
import { Router } from "express";
import { authGuard } from "../../middleware/authGuard.js";
import * as ctrl from "./users.controller.js";

const r = Router();
r.use(authGuard("ADMIN", "OPS"));
r.get("/", ctrl.listUsers);
r.delete("/:userId", ctrl.deleteUser);
r.post("/invite", ctrl.inviteUser);
r.post("/:userId/roles", ctrl.assignRoles);
export default r;
