import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth"; // your Zustand auth store

type Props = {
  roles?: string[]; // if omitted -> just requires login
  children: ReactNode;
};

export function RequireRole({ roles, children }: Props) {
  const { user, token } = useAuth();
  const location = useLocation();

  // Not logged in? -> go to login (and remember where we came from)
  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  // If specific roles required, check them
  if (roles?.length) {
    const has = user.roles?.some((r) => roles.includes(r)) ?? false;
    if (!has) {
      // No access: send to a safe page (home/dashboard)
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
}

// Optional: a simpler guard that only checks login
export function RequireAuth({ children }: { children: ReactNode }) {
  return <RequireRole>{children}</RequireRole>;
}
