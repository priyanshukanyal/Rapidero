import { ReactNode } from "react";
import { useAuth } from "../store/auth";
import type { Role } from "../types";

export default function RoleGate({
  allow,
  children,
}: {
  allow: Role[];
  children: ReactNode;
}) {
  const { user } = useAuth();
  const ok = !!user?.roles?.some((r) => allow.includes(r));
  if (!ok) return null;
  return <>{children}</>;
}
