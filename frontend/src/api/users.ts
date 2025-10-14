import api from "../lib/api";

export type UserRow = {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  is_active: 0 | 1;
  created_at?: string;
  roles: string[]; // e.g. ["ADMIN","OPS"]
  client_ids?: string[]; // optional
  client_codes?: string[]; // optional
};

export async function listUsers(params?: { q?: string; role?: string }) {
  const { data } = await api.get<UserRow[]>("/users", { params });
  return data;
}

export async function deleteUser(id: string) {
  await api.delete(`/users/${id}`);
}

export async function inviteUser(payload: {
  email: string;
  name: string;
  password?: string;
  roles: string[];
  client_id?: string;
}) {
  const { data } = await api.post("/users/invite", payload);
  return data;
}

export async function assignRoles(
  userId: string,
  payload: { roles: string[]; mode?: "replace" | "add"; client_id?: string }
) {
  const { data } = await api.post(`/users/${userId}/roles`, payload);
  return data;
}

export type ClientLite = {
  id: string;
  client_code: string;
  client_name: string;
};
export async function listClients() {
  const { data } = await api.get<ClientLite[]>("/clients");
  return data;
}
