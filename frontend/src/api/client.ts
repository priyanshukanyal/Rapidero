// // src/api/client.ts
// import api from "../lib/api";

// export async function getClientDashboard() {
//   const { data } = await api.get("/clients/me/dashboard");
//   return data;
// }
// // export async function getClientDashboard() {
// //   const { data } = await api.get("/client/me/dashboard");
// //   return data as {
// //     delivered: number;
// //     in_transit: number;
// //     rto: number;
// //     total: number;
// //     series: { d: string; c: number }[];
// //   };
// // }
// export async function listMyConsignments() {
//   const { data } = await api.get("/consignments"); // server scopes by token
//   return data as any[];
// }
// export async function getMyConsignment(id: string) {
//   const { data } = await api.get(`/consignments/${id}`);
//   return data as any;
// }
// export async function getMyTracking(id: string) {
//   const { data } = await api.get(`/consignments/${id}/tracking`);
//   return data as any[];
// }
// src/api/client.ts
import api from "../lib/api";
// src/api/clients.ts

export interface ClientLite {
  id: string;
  client_name: string;
  client_code: string;
  email?: string | null;
}

export interface CreateClientPayload {
  client_name: string;
  email?: string;
  phone?: string;
  gstin?: string;
  pan?: string;
  website?: string;
}

/** Admin/OPS: list all clients (backend already paginates/limits) */
export async function listClients(): Promise<ClientLite[]> {
  const { data } = await api.get<ClientLite[]>("/clients");
  return data;
}

/** Admin/OPS: create a client */
export async function createClient(payload: CreateClientPayload) {
  const { data } = await api.post("/clients", payload);
  return data as { ok: boolean; client_code: string };
}

/* ---------- Types ---------- */

export interface DashboardPoint {
  d: string; // YYYY-MM-DD
  c: number; // count for the day
}

export interface ClientDashboard {
  delivered: number;
  in_transit: number;
  rto: number;
  total: number;
  series: DashboardPoint[];
}

export interface ConsignmentLite {
  id: string;
  cn_number: string;
  current_status_code: string;
  created_at: string;
  shipper_city?: string | null;
  consignee_city?: string | null;
  package_count?: number;
  // add any other fields your list endpoint returns
}

export interface ConsignmentDetail extends ConsignmentLite {
  // include extra fields the detail endpoint returns
  invoices?: Array<{
    id: string;
    invoice_number: string;
    amount_rs: number;
    ewaybill_number?: string | null;
    hsn_code?: string | null;
    hsn_amount_rs?: number | null;
  }>;
  packages?: Array<{
    id: string;
    length_cm: number;
    breadth_cm: number;
    height_cm: number;
    pkg_count: number;
    line_volume_cm3: number;
  }>;
  history?: Array<{
    status_code: string;
    location_text?: string | null;
    remarks?: string | null;
    actor_user_id?: string | null;
    event_time: string;
  }>;
}

export interface ConsignmentListQuery {
  status?: string; // e.g. 'DELIVERED' | 'IN_TRANSIT' etc. (if your backend supports)
  from?: string; // 'YYYY-MM-DD'
  to?: string; // 'YYYY-MM-DD'
  search?: string; // by cn_number, company, etc. (backend-dependent)
  page?: number; // 1-based
  limit?: number; // items per page
  sort?: string; // e.g. '-created_at' or 'created_at'
}

/* ---------- API Calls ---------- */

export async function getClientDashboard(
  signal?: AbortSignal
): Promise<ClientDashboard> {
  try {
    const { data } = await api.get<ClientDashboard>("/clients/me/dashboard", {
      signal,
    });
    // API returns exact shape, so just pass through
    return data;
  } catch (err: any) {
    // If user is not linked yet, avoid null crashing the UI
    if (err?.response?.status === 403) {
      return {
        delivered: 0,
        in_transit: 0,
        rto: 0,
        total: 0,
        series: [],
      };
    }
    throw err;
  }
}

/**
 * Lists the consignments visible to the logged-in user.
 * The backend auto-scopes to the tenant for CLIENT users.
 */
export async function listMyConsignments(
  query: ConsignmentListQuery = {},
  signal?: AbortSignal
): Promise<ConsignmentLite[]> {
  const { data } = await api.get<ConsignmentLite[]>("/consignments", {
    params: query,
    signal,
  });
  return data;
}

export async function getMyConsignment(
  id: string,
  signal?: AbortSignal
): Promise<ConsignmentDetail> {
  const { data } = await api.get<ConsignmentDetail>(`/consignments/${id}`, {
    signal,
  });
  return data;
}

export async function getMyTracking(
  id: string,
  signal?: AbortSignal
): Promise<ConsignmentDetail["history"]> {
  const { data } = await api.get<ConsignmentDetail["history"]>(
    `/consignments/${id}/tracking`,
    { signal }
  );
  return data;
}
