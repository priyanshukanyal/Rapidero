// src/lib/auth.ts
import { LoginResponse } from "../types";

export function getSession(): LoginResponse | null {
  const raw = localStorage.getItem("auth");
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export function isClient(): boolean {
  const s = getSession();
  return !!s?.user?.roles?.includes("CLIENT");
}
export function canCreateOrEdit(): boolean {
  const s = getSession();
  return !!s?.user?.roles?.some((r) => r === "ADMIN" || r === "OPS");
}
export function myClientId(): string | null {
  const s = getSession();
  return (s?.user as any)?.client_id ?? null;
}
