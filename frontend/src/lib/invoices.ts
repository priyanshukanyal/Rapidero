// client/src/lib/invoices.ts
import api from "./api";

export type InvoiceSummary = {
  id: string;
  invoice_number: string;
  client_id?: string;
  client_name?: string;
  contract_id?: string;
  billing_start: string;
  billing_end: string;
  grand_total: number;
  created_at: string;
  pdf_url?: string | null;
};

export type InvoiceVM = {
  invoice: any;
  client: any;
  contract: any;
  lines: any[];
};

// Admin / internal list
export async function fetchInvoices(params?: {
  client_id?: string;
  contract_id?: string;
}) {
  const res = await api.get<InvoiceSummary[]>("/invoices", { params });
  return res.data;
}

// Logged-in client's own invoices (calls GET /api/v1/invoices/my)
export async function fetchMyInvoices() {
  const res = await api.get<InvoiceSummary[]>("/invoices/my");
  return res.data;
}

// Single invoice with lines
export async function fetchInvoiceById(id: string) {
  const res = await api.get<InvoiceVM>(`/invoices/${id}`);
  return res.data;
}

// Generate invoice for a period
export async function generateInvoice(payload: {
  client_id: string;
  contract_id: string;
  billing_start: string; // "YYYY-MM-DD"
  billing_end: string; // "YYYY-MM-DD"
  send_email?: boolean;
}) {
  const res = await api.post("/invoices/generate", payload);
  return res.data;
}

// Resend invoice email
export async function resendInvoiceEmail(id: string) {
  const res = await api.post(`/invoices/${id}/resend-email`);
  return res.data;
}
