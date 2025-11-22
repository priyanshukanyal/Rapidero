// src/api/contracts.ts
import api from "../lib/api";

export type MyContractRow = {
  id: string;
  contract_code: string;
  agreement_date?: string | null;
  term_start?: string | null;
  term_end?: string | null;
  pdf_url?: string | null;
  pdf_created_at?: string | null;
};

/**
 * Client portal: contracts associated with the logged-in client.
 * Backend should filter by req.user.client_id.
 */
export async function listMyContracts() {
  const { data } = await api.get("/contracts/mine");
  // NO .data.rows, NO extra wrapping – backend returns array directly
  return data as Array<{
    id: string;
    contract_code: string;
    agreement_date?: string | null;
    term_start?: string | null;
    term_end?: string | null;
    pdf_url?: string | null;
    pdf_created_at?: string | null;
  }>;
}
