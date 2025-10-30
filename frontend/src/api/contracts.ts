import api from "../lib/api";

export async function listMyContracts() {
  const { data } = await api.get("/contracts/mine");
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
