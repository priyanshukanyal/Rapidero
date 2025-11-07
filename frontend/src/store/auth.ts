import { create } from "zustand";
import api from "../lib/api";
import type { LoginResponse, UserInfo } from "../types";

export type PortalHome = "/admin" | "/client" | "/field" | "/";

export const roleHome = (roles: string[]): PortalHome => {
  if (roles.includes("ADMIN") || roles.includes("OPS")) return "/admin";
  if (roles.includes("CLIENT")) return "/client";
  if (roles.includes("FIELD_EXEC")) return "/field";
  return "/";
};

type AuthState = {
  user: UserInfo | null;
  token: string | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<PortalHome>;
  logout: () => void;
  hydrate: () => void;
};

const bootUser = (() => {
  try {
    const s = localStorage.getItem("user");
    return s ? (JSON.parse(s) as UserInfo) : null;
  } catch {
    return null;
  }
})();
const bootToken = localStorage.getItem("token");

export const useAuth = create<AuthState>((set) => ({
  user: bootUser,
  token: bootToken,
  loading: false,
  error: null,
  hydrate: () => {},

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      set({ token: data.token, user: data.user, loading: false });
      return roleHome(data.user.roles);
    } catch (e: unknown) {
      const msg =
        (e as any)?.response?.data?.error ||
        (e as Error)?.message ||
        "Login failed";
      set({ loading: false, error: msg });
      throw e;
    }
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));
