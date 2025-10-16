// src/components/ProtectedRoute.tsx
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../store/auth";
import type { ReactNode } from "react";

type Props = {
  anyOf?: string[]; // allowed roles (optional)
  children?: ReactNode; // allow wrapping a child element (e.g., <Layout />)
};

export default function ProtectedRoute({ anyOf, children }: Props) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (anyOf && !user.roles?.some((r) => anyOf.includes(r))) {
    // not authorized for this segment
    return <Navigate to="/" replace />;
  }

  // If a child element is provided, render it; otherwise render nested routes via <Outlet />
  return children ? <>{children}</> : <Outlet />;
}
