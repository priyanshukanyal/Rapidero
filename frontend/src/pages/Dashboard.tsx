import { useAuth, roleHome } from "../store/auth";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (user) nav(roleHome(user.roles), { replace: true });
  }, [user, nav]);

  return <div>Redirecting...</div>;
}
