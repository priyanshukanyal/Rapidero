// src/modules/invoices/invoices.routes.ts
import { Router } from "express";
import {
  previewInvoice,
  createInvoice,
  listInvoices,
  getInvoice,
} from "./invoices.controller.js";

const router = Router();

router.get("/", listInvoices);
router.get("/:id", getInvoice);
router.post("/preview", previewInvoice);
router.post("/", createInvoice);

export default router;
