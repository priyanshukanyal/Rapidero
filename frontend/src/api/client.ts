// src/api/client.ts
import api from "../lib/api";

export async function getClientDashboard() {
  const { data } = await api.get("/clients/me/dashboard");
  return data;
}
// export async function getClientDashboard() {
//   const { data } = await api.get("/client/me/dashboard");
//   return data as {
//     delivered: number;
//     in_transit: number;
//     rto: number;
//     total: number;
//     series: { d: string; c: number }[];
//   };
// }
export async function listMyConsignments() {
  const { data } = await api.get("/consignments"); // server scopes by token
  return data as any[];
}
export async function getMyConsignment(id: string) {
  const { data } = await api.get(`/consignments/${id}`);
  return data as any;
}
export async function getMyTracking(id: string) {
  const { data } = await api.get(`/consignments/${id}/tracking`);
  return data as any[];
}
