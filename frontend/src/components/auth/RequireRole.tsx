import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth";

type Props = {
  roles?: string[];
};

export function RequireRole({ roles }: Props) {
  const { user, token } = useAuth();
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles?.length) {
    const ok = user.roles?.some((r) => roles.includes(r));
    if (!ok) return <Navigate to="/" replace />;
  }

  return <Outlet />; // <-- IMPORTANT
}
