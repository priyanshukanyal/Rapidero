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

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,
  hydrate: () => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (token && userStr) set({ token, user: JSON.parse(userStr) as UserInfo });
  },
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
    } catch (e: any) {
      set({
        loading: false,
        error: e?.response?.data?.error || "Login failed",
      });
      throw e;
    }
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ token: null, user: null });
  },
}));
