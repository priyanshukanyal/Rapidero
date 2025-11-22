// src/api/client.ts
import api from "../lib/api";

/* -------------------------------------------------------------------------- */
/*                       Admin / OPS: Client management                       */
/* -------------------------------------------------------------------------- */

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

/**
 * Admin/OPS: list all clients.
 * Backend can paginate/limit as needed.
 */
export async function listClients(): Promise<ClientLite[]> {
  const { data } = await api.get<ClientLite[]>("/clients");
  return data;
}

/**
 * Admin/OPS: create a new client.
 */
export async function createClient(
  payload: CreateClientPayload
): Promise<{ ok: boolean; client_code: string }> {
  const { data } = await api.post("/clients", payload);
  return data as { ok: boolean; client_code: string };
}

/* -------------------------------------------------------------------------- */
/*                          Client portal: Dashboard                          */
/* -------------------------------------------------------------------------- */

export interface DashboardPoint {
  d: string; // YYYY-MM-DD
  c: number; // count for that day
}

export interface ClientDashboard {
  delivered: number;
  in_transit: number;
  rto: number;
  total: number;
  series: DashboardPoint[];
}

/**
 * Client portal: dashboard for the logged-in client user.
 * Backend should scope by req.user.client_id.
 */
export async function getClientDashboard(
  signal?: AbortSignal
): Promise<ClientDashboard> {
  try {
    const { data } = await api.get<ClientDashboard>("/clients/me/dashboard", {
      signal,
    });
    return data;
  } catch (err: any) {
    // If user isn't linked to a client yet, avoid crashing UI
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

/* -------------------------------------------------------------------------- */
/*                      Client portal: Consignments (CNs)                     */
/* -------------------------------------------------------------------------- */

export interface ConsignmentLite {
  id: string;
  cn_number: string;
  current_status_code: string;
  created_at: string;
  shipper_city?: string | null;
  consignee_city?: string | null;
  package_count?: number;
  // add more list fields if your endpoint returns them
}

export interface ConsignmentDetail extends ConsignmentLite {
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
  status?: string; // e.g. 'DELIVERED', 'IN_TRANSIT'
  from?: string; // 'YYYY-MM-DD'
  to?: string; // 'YYYY-MM-DD'
  search?: string; // CN number, city, etc. (backend decides)
  page?: number; // 1-based page
  limit?: number; // items per page
  sort?: string; // e.g. '-created_at'
}

/**
 * Client portal: list consignments visible to the logged-in user.
 *
 * For CLIENT role, backend should:
 *   - scope to req.user.client_id (and its contracts)
 *   - ignore any foreign client_id in query to prevent data leaks
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

/**
 * Client portal: get detail of a single consignment that belongs to this client.
 */
export async function getMyConsignment(
  id: string,
  signal?: AbortSignal
): Promise<ConsignmentDetail> {
  const { data } = await api.get<ConsignmentDetail>(`/consignments/${id}`, {
    signal,
  });
  return data;
}

/**
 * Client portal: get tracking events for a consignment that belongs to this client.
 */
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
